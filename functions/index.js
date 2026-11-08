const { createHash } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: "us-central1", maxInstances: 2 });

const limits = {
  name: 80,
  discordId: 20,
  minecraft: 40,
  availability: 160,
  experience: 240,
  reason: 900,
  helper: 1400,
  helperIssue: 1400,
  helperBoundaries: 1400,
  helperLimits: 1400,
  helperMistake: 1400,
  platforms: 1200,
  contentLink: 500,
  proofFileName: 160
};
const helperFields = ["helper", "helperIssue", "helperBoundaries", "helperLimits", "helperMistake"];
const creatorFields = ["platforms", "contentLink", "proofDataUrl", "proofFileName"];
const baseFields = ["name", "discordId", "role", "minecraft", "availability", "experience", "reason", "consented"];
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function cleanString(data, key, required = true) {
  const value = data[key];
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new HttpsError("invalid-argument", `Please provide a valid ${key}.`);
  }
  const cleaned = value.trim();
  if ((required && !cleaned) || cleaned.length > limits[key]) {
    throw new HttpsError("invalid-argument", `Please check the ${key} field.`);
  }
  return cleaned;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function enforceIpLimit(ip) {
  if (!ip) throw new HttpsError("unavailable", "Please try again in a moment.");
  const key = digest(ip);
  const ref = db.collection("applicationRateLimits").doc(key);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const recent = (snapshot.get("recent") || []).filter((timestamp) => Number.isFinite(timestamp) && timestamp > now - HOUR_MS);
    if (recent.length >= 5) {
      throw new HttpsError("resource-exhausted", "Too many applications have come from this connection. Please wait an hour and try again.");
    }
    recent.push(now);
    transaction.set(ref, { recent, expiresAt: new Date(now + 2 * DAY_MS) });
  });
}

exports.submitStaffApplication = onCall({
  enforceAppCheck: false,
  maxInstances: 2,
  memory: "256MiB",
  timeoutSeconds: 30
}, async (request) => {
  const data = request.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Please check your application and try again.");
  }

  const role = data.role;
  const expected = new Set([...baseFields, ...(role === "helper" ? helperFields : role === "creator" ? creatorFields : [])]);
  if (!["helper", "creator"].includes(role) || Object.keys(data).some((key) => !expected.has(key))) {
    throw new HttpsError("invalid-argument", "Please check your application and try again.");
  }

  const application = {};
  for (const key of baseFields) {
    if (key === "role" || key === "consented") continue;
    application[key] = cleanString(data, key, key !== "experience");
  }
  if (!/^[0-9]{17,20}$/.test(application.discordId)) {
    throw new HttpsError("invalid-argument", "Enter your 17–20 digit Discord User ID.");
  }
  if (data.consented !== true) throw new HttpsError("invalid-argument", "Please confirm the application consent box.");
  application.role = role;

  if (role === "helper") {
    for (const key of helperFields) application[key] = cleanString(data, key);
  } else {
    application.platforms = cleanString(data, "platforms");
    application.contentLink = cleanString(data, "contentLink");
    if (!/^https?:\/\//i.test(application.contentLink)) {
      throw new HttpsError("invalid-argument", "Enter a valid public channel link.");
    }
    application.proofFileName = cleanString(data, "proofFileName");
    const proof = data.proofDataUrl;
    if (typeof proof !== "string" || proof.length > 700000 || !/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(proof)) {
      throw new HttpsError("invalid-argument", "Attach a valid YouTube Studio screenshot under 10 MB.");
    }
    application.proofDataUrl = proof;
  }

  // Count each valid submission attempt before database duplicate checks so the
  // callable cannot be hammered with repeated applications for the same ID.
  await enforceIpLimit(request.rawRequest.ip);

  const apps = db.collection("staffApplications");
  const activeApps = await apps
    .where("discordId", "==", application.discordId)
    .where("role", "==", role)
    .where("status", "in", ["New", "Reviewing"])
    .limit(1)
    .get();
  if (!activeApps.empty) {
    throw new HttpsError("already-exists", "You already have an application for this role being reviewed.");
  }
  const latestApps = await apps
    .where("discordId", "==", application.discordId)
    .where("role", "==", role)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  const latestCreatedAt = latestApps.docs[0]?.get("createdAt");
  if (latestCreatedAt && typeof latestCreatedAt.toMillis === "function" && latestCreatedAt.toMillis() > Date.now() - 7 * DAY_MS) {
    throw new HttpsError("failed-precondition", "Please wait 7 days after your last application for this role before applying again.");
  }

  application.createdAt = FieldValue.serverTimestamp();
  application.status = "New";
  await db.collection("staffApplications").add(application);

  return { ok: true };
});
