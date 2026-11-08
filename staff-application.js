import { staffApplicationConfig } from "./staff-application-config.js";

const form = document.getElementById("staff-application-form");
const status = document.getElementById("staff-form-status");
if (form && status) {
  const submitUrl = staffApplicationConfig.submitUrl;
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
        return blob;
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
      consented: data.get("consent") === "on",
      website: value(data, "website"),
      startedAt: Number(form.dataset.startedAt || Date.now())
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
      submitButton.disabled = true;
      status.textContent = "Preparing your screenshot…";
      try {
        application.proof = await compressProof(proof);
      } catch (error) {
        status.textContent = error.message || "Could not prepare that screenshot. Please try another image.";
        submitButton.disabled = false;
        return;
      }
    }

    submitButton.disabled = true;
    status.textContent = "Sending your application securely…";
    try {
      if (!submitUrl || submitUrl.includes("YOUR-SUBDOMAIN")) {
        throw new Error("The application service is not configured yet. Please email hello@blossomvale.world.");
      }
      const payload = { ...application };
      const proof = payload.proof;
      delete payload.proof;
      const requestBody = new FormData();
      requestBody.append("application", JSON.stringify(payload));
      if (proof) requestBody.append("channelProof", proof, "creator-proof.webp");
      const response = await fetch(submitUrl, { method: "POST", body: requestBody });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const failure = new Error(result.error || "Application submission failed.");
        failure.code = result.code || "unknown";
        throw failure;
      }
      form.reset();
      updateRoleQuestions();
      status.textContent = "Your application has been submitted. Thank you! The Blossom Vale team will review it and contact you on Discord.";
    } catch (error) {
      console.error("Application submission failed", error);
      const code = error?.code || "";
      if (code === "rate_limited") {
        status.textContent = "There have been too many applications from this connection. Please wait before trying again.";
      } else if (code === "invalid_application") {
        status.textContent = error.message || "Please check your application and try again.";
      } else {
        status.textContent = error?.message?.includes("not configured yet")
          ? error.message
          : "We couldn’t submit your application just now. Please try again later or email hello@blossomvale.world.";
      }
    } finally {
      submitButton.disabled = false;
    }
  });
  form.dataset.startedAt = String(Date.now());
}
