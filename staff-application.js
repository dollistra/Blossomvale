import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.getElementById("staff-application-form");
const status = document.getElementById("staff-form-status");
if (form && status) {
  const app = initializeApp(firebaseConfig);
  const submitApplication = httpsCallable(getFunctions(app, "us-central1"), "submitStaffApplication");
  const roleSelect = document.getElementById("app-role");
  const roleSections = [...form.querySelectorAll("[data-role-questions]")];
  const submitButton = form.querySelector(".staff-submit");

  const updateRoleQuestions = () => {
    const selectedRole = roleSelect.value;
    roleSections.forEach((section) => {
      const active = section.dataset.roleQuestions === selectedRole;
      section.hidden = !active;
      section.querySelectorAll("input, textarea, select").forEach((field) => {
        field.disabled = !active;
        field.required = active && field.dataset.required === "true";
      });
    });
  };

  const value = (data, name) => String(data.get(name) || "").trim();

  async function compressProof(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1500 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    for (const quality of [0.9, 0.84, 0.78, 0.7, 0.62]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= 480 * 1024) {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Could not read the screenshot."));
          reader.readAsDataURL(blob);
        });
      }
    }
    throw new Error("The screenshot is too detailed to store safely. Please crop it to the channel name and audience overview, then try again.");
  }

  const requestedRole = new URLSearchParams(window.location.search).get("role");
  if (["helper", "creator"].includes(requestedRole)) roleSelect.value = requestedRole;
  roleSelect.addEventListener("change", updateRoleQuestions);
  updateRoleQuestions();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    if (value(data, "website")) {
      form.reset();
      updateRoleQuestions();
      status.textContent = "Your application has been submitted. Thank you! The Blossom Vale team will review it and contact you on Discord.";
      return;
    }
    const role = value(data, "role");
    const application = {
      name: value(data, "name"),
      discordId: value(data, "discordId"),
      role,
      minecraft: value(data, "minecraft"),
      availability: value(data, "availability"),
      experience: value(data, "experience"),
      reason: value(data, "reason"),
      consented: data.get("consent") === "on"
    };

    if (role === "helper") {
      for (const field of ["helper", "helperIssue", "helperBoundaries", "helperLimits", "helperMistake"]) {
        application[field] = value(data, field);
      }
    } else if (role === "creator") {
      const proof = data.get("channelProof");
      const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!proof || !allowedTypes.includes(proof.type)) {
        status.textContent = "Please choose a PNG, JPG, or WebP screenshot from YouTube Studio.";
        document.getElementById("app-channel-proof").focus();
        return;
      }
      if (proof.size > 10 * 1024 * 1024) {
        status.textContent = "That screenshot is larger than 10 MB. Please choose a smaller image.";
        document.getElementById("app-channel-proof").focus();
        return;
      }
      application.platforms = value(data, "platforms");
      application.contentLink = value(data, "contentLink");
      application.proofFileName = proof.name.slice(0, 160);
      submitButton.disabled = true;
      status.textContent = "Preparing your screenshot…";
      try {
        application.proofDataUrl = await compressProof(proof);
      } catch (error) {
        status.textContent = error.message || "Could not prepare that screenshot. Please try another image.";
        submitButton.disabled = false;
        return;
      }
    }

    submitButton.disabled = true;
    status.textContent = "Submitting your application securely…";
    try {
      await submitApplication(application);
      form.reset();
      updateRoleQuestions();
      status.textContent = "Your application has been submitted. Thank you! The Blossom Vale team will review it and contact you on Discord.";
    } catch (error) {
      console.error("Application submission failed", error);
      const code = error?.code || "";
      if (code.endsWith("resource-exhausted")) {
        status.textContent = "There have been too many applications from this connection. Please wait before trying again.";
      } else if (code.endsWith("already-exists")) {
        status.textContent = "You already have an application for this role being reviewed.";
      } else if (code.endsWith("invalid-argument")) {
        status.textContent = error.message || "Please check your application and try again.";
      } else if (code.endsWith("failed-precondition")) {
        status.textContent = error.message || "You can’t apply for this role yet.";
      } else {
        status.textContent = "We couldn’t submit your application just now. Please try again later or email hello@blossomvale.world.";
      }
    } finally {
      submitButton.disabled = false;
    }
  });
}
