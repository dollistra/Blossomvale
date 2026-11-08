import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const REVIEWER_EMAIL = "blossomvale0@gmail.com";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const passwordForm = document.getElementById("reviewer-password-form");
const usernameInput = document.getElementById("reviewer-username");
const passwordInput = document.getElementById("reviewer-password");
const resendVerificationButton = document.getElementById("reviewer-resend-verification");
const signOutButton = document.getElementById("reviewer-sign-out");
const authStatus = document.getElementById("reviewer-auth-status");
const reviewSection = document.getElementById("application-review");
const reviewerAccount = document.getElementById("reviewer-account");
const appList = document.getElementById("application-list");
const appStatus = document.getElementById("applications-status");
const roleFilter = document.getElementById("filter-role");
const statusFilter = document.getElementById("filter-status");
let applications = [];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function safeHttpUrl(raw) {
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function addDetail(list, label, content, link = false) {
  const dt = el("dt", "", label);
  const dd = el("dd");
  if (link) {
    const href = safeHttpUrl(content);
    if (href) {
      const anchor = el("a", "", content);
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      dd.append(anchor);
    } else dd.textContent = content || "—";
  } else dd.textContent = content || "—";
  list.append(dt, dd);
}

function readableDate(timestamp) {
  const date = timestamp?.toDate?.();
  return date ? date.toLocaleString() : "Just submitted";
}

function makeApplicationCard(application) {
  const card = el("article", "review-card");
  const header = el("div", "review-card-header");
  const identity = el("div");
  identity.append(el("h3", "", application.name || "Applicant"));
  identity.append(el("p", "review-card-meta", `${application.role === "creator" ? "Content Creator" : "Helper"} · Submitted ${readableDate(application.createdAt)} · Discord ID ${application.discordId || "—"}`));
  header.append(identity);
  const dl = el("dl");
  addDetail(dl, "Minecraft username", application.minecraft);
  addDetail(dl, "Time zone / availability", application.availability);
  addDetail(dl, "Relevant experience", application.experience || "Not provided");
  addDetail(dl, "Why they want to join", application.reason);

  const roleFields = application.role === "helper"
    ? [["Conflict of interest / damaged build", "helper"], ["Helping during busy chat", "helperIssue"], ["Arguments and private details", "helperBoundaries"], ["Requests outside permissions", "helperLimits"], ["Owning and correcting a mistake", "helperMistake"]]
    : [["Content, platforms, and audience", "platforms"], ["Channel link", "contentLink"]];
  for (const [label, field] of roleFields) addDetail(dl, label, application[field], field === "contentLink");
  card.append(header, dl);

  if (application.role === "creator" && application.proofDataUrl) {
    const proofLabel = el("p", "review-card-meta", `Creator proof screenshot · ${application.proofFileName || "screenshot"}`);
    const image = document.createElement("img");
    image.className = "review-proof";
    image.src = application.proofDataUrl;
    image.alt = "Creator-provided channel ownership screenshot";
    image.loading = "lazy";
    const download = el("a", "", "Download screenshot");
    download.href = application.proofDataUrl;
    download.download = application.proofFileName || "creator-proof.webp";
    card.append(proofLabel, image, download);
  }

  const actions = el("div", "review-actions");
  const stateLabel = el("label", "", "Review status");
  const select = document.createElement("select");
  for (const state of ["New", "Reviewing", "Accepted", "Declined"]) {
    const option = el("option", "", state);
    option.value = state;
    option.selected = (application.status || "New") === state;
    select.append(option);
  }
  stateLabel.append(select);
  const notesLabel = el("label", "", "Private reviewer notes");
  const notes = document.createElement("textarea");
  notes.maxLength = 2000;
  notes.value = application.reviewerNotes || "";
  notes.placeholder = "Optional notes for the review team";
  notesLabel.append(notes);
  const save = el("button", "apps-button apps-button-small", "Save review");
  save.type = "button";
  save.addEventListener("click", async () => {
    save.disabled = true;
    try {
      await updateDoc(doc(db, "staffApplications", application.id), {
        status: select.value,
        reviewerNotes: notes.value.trim(),
        updatedAt: serverTimestamp()
      });
      application.status = select.value;
      application.reviewerNotes = notes.value.trim();
      appStatus.textContent = "Review saved.";
      renderApplications();
    } catch (error) {
      console.error("Could not save review", error);
      appStatus.textContent = "Could not save the review. Please refresh and try again.";
    } finally {
      save.disabled = false;
    }
  });
  const remove = el("button", "review-delete", "Delete");
  remove.type = "button";
  remove.setAttribute("aria-label", `Delete application from ${application.name || "applicant"}`);
  remove.addEventListener("click", async () => {
    if (!window.confirm(`Permanently delete ${application.name || "this"} application?`)) return;
    remove.disabled = true;
    try {
      await deleteDoc(doc(db, "staffApplications", application.id));
      applications = applications.filter((item) => item.id !== application.id);
      appStatus.textContent = "Application deleted.";
      renderApplications();
    } catch (error) {
      console.error("Could not delete application", error);
      appStatus.textContent = "Could not delete the application. Please refresh and try again.";
      remove.disabled = false;
    }
  });
  actions.append(stateLabel, notesLabel, save, remove);
  card.append(actions);
  return card;
}

function renderApplications() {
  appList.replaceChildren();
  const filtered = applications.filter((application) =>
    (roleFilter.value === "all" || application.role === roleFilter.value)
    && (statusFilter.value === "all" || (application.status || "New") === statusFilter.value));
  if (!filtered.length) {
    appList.append(el("p", "review-empty", applications.length ? "No applications match these filters." : "There are no applications yet."));
    return;
  }
  filtered.forEach((application) => appList.append(makeApplicationCard(application)));
}

async function loadApplications() {
  appStatus.textContent = "Loading applications…";
  try {
    const snapshot = await getDocs(query(collection(db, "staffApplications"), orderBy("createdAt", "desc")));
    applications = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    appStatus.textContent = `${applications.length} application${applications.length === 1 ? "" : "s"}.`;
    renderApplications();
  } catch (error) {
    console.error("Could not load applications", error);
    appStatus.textContent = "Could not load applications. Check the Firebase rules and Firestore setup.";
  }
}

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (usernameInput.value.trim().toLowerCase() !== "blossomvale") {
    authStatus.textContent = "That username isn’t recognized.";
    return;
  }
  const password = passwordInput.value;
  if (!password) return;
  authStatus.textContent = "Signing in…";
  const submitButton = passwordForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, REVIEWER_EMAIL, password);
    passwordInput.value = "";
  } catch (error) {
    console.error("Password sign-in failed", error);
    authStatus.textContent = error.code === "auth/operation-not-allowed"
      ? "Email/password sign-in must be enabled in Firebase Authentication."
      : error.code === "auth/unauthorized-domain"
        ? "Open this page from the website or localhost, not as a file."
        : "Sign-in failed. Check the username and password, then try again.";
  } finally {
    submitButton.disabled = false;
  }
});
resendVerificationButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== REVIEWER_EMAIL) return;
  resendVerificationButton.disabled = true;
  try {
    await sendEmailVerification(user);
    authStatus.textContent = `Verification email sent to ${REVIEWER_EMAIL}. Verify it, then sign in again.`;
  } catch (error) {
    console.error("Could not send verification email", error);
    authStatus.textContent = "Could not send the verification email. Please try again later.";
  } finally {
    resendVerificationButton.disabled = false;
  }
});
signOutButton.addEventListener("click", () => signOut(auth));
document.getElementById("reload-applications").addEventListener("click", loadApplications);
roleFilter.addEventListener("change", renderApplications);
statusFilter.addEventListener("change", renderApplications);

onAuthStateChanged(auth, async (user) => {
  const authorized = user?.emailVerified && user.email?.toLowerCase() === REVIEWER_EMAIL;
  if (!user) {
    reviewSection.hidden = true;
    resendVerificationButton.hidden = true;
    signOutButton.hidden = true;
    authStatus.textContent = `Only ${REVIEWER_EMAIL} can access application records.`;
    return;
  }
  if (user.email?.toLowerCase() !== REVIEWER_EMAIL) {
    reviewSection.hidden = true;
    authStatus.textContent = `This account isn’t authorized. Signing out ${user.email || "the current account"}.`;
    await signOut(auth);
    return;
  }
  if (!authorized) {
    reviewSection.hidden = true;
    resendVerificationButton.hidden = false;
    signOutButton.hidden = false;
    authStatus.textContent = `Please verify ${REVIEWER_EMAIL} using the link sent to your inbox, then sign in again.`;
    return;
  }
  resendVerificationButton.hidden = true;
  signOutButton.hidden = false;
  authStatus.textContent = "Authorized reviewer signed in.";
  reviewerAccount.textContent = user.email;
  reviewSection.hidden = false;
  await loadApplications();
});
