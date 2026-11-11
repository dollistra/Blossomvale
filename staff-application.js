import { staffApplicationConfig } from "./staff-application-config.js";

const form = document.getElementById("staff-application-form");
const status = document.getElementById("staff-form-status");
if (form && status) {
  const webhookUrl = staffApplicationConfig.webhookUrl;
  const roleSelect = document.getElementById("app-role");
  const roleSections = [...form.querySelectorAll("[data-role-questions]")];
  const submitButton = form.querySelector(".staff-submit");
  form.addEventListener("invalid", (event) => {
    const section = event.target.closest("details");
    if (section && !section.open) section.open = true;
  }, true);

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

  const applicationLabels = {
    name: "Name",
    discordId: "Discord User ID",
    minecraft: "Minecraft username",
    availability: "Time zone",
    experience: "Relevant experience",
    reference: "Someone who can vouch for them",
    reason: "Why they want to join the team",
    helperTenure: "Time in the community and weekly hours",
    helperFeedback: "Responding to feedback",
    helperStuck: "Something they stuck with",
    helperRemoved: "Removed or punished before",
    helperStepBack: "What would make them step back",
    helperLand: "Saving a spot and protecting it (SMP)",
    helperRanks: "Ranks and cosmetics",
    helperRules: "The rules and what happens when they are broken",
    helperReport: "How to report a cheater",
    helperEarn: "Getting started and earning money",
    helper: "Damaged build report",
    helperLimits: "Request outside permissions",
    helperStaffAbuse: "Staff member misusing permissions",
    helperDiscordScam: "Discord: scam link",
    helperDiscordAccusation: "Discord: public accusation",
    helperDiscordWellbeing: "Discord: a member who is struggling",
    platforms: "Platforms and audience size",
    contentLink: "Channel link"
  };

  function applicationText(application) {
    const common = ["name", "discordId", "minecraft", "availability", "experience", "reference", "reason"];
    const roleFields = application.role === "helper"
      ? ["helperTenure", "helperFeedback", "helperStuck", "helperRemoved", "helperStepBack", "helperLand", "helperRanks", "helperRules", "helperReport", "helperEarn", "helper", "helperLimits", "helperStaffAbuse", "helperDiscordScam", "helperDiscordAccusation", "helperDiscordWellbeing"]
      : ["platforms", "contentLink"];
    return [...common, ...roleFields]
      .filter((key) => application[key])
      .map((key) => `${applicationLabels[key]}\n${application[key]}`)
      .concat(application.experienceProofCount ? [`Experience proof\n${application.experienceProofCount} screenshot${application.experienceProofCount === 1 ? "" : "s"} attached`] : [])
      .concat(application.requirementsConfirmed ? ["Requirements\nThey confirmed they read the guidelines, meet the requirements and wrote their answers without AI."] : [])
      .join("\n\n");
  }

  function discordEmbedValue(text) {
    return String(text).replace(/[\\*_`~|>]/g, "\\$&").slice(0, 256);
  }

  function makeDiscordPayload(application) {
    const creator = application.role === "creator";
    const embed = {
      title: creator ? "Content Creator application" : "Helper application",
      color: creator ? 0xB8D7F0 : 0xEFB6D9,
      fields: [
        { name: "Applicant", value: discordEmbedValue(application.name), inline: true },
        { name: "Discord User ID", value: application.discordId, inline: true },
        { name: "Minecraft username", value: discordEmbedValue(application.minecraft), inline: true }
      ],
      footer: { text: "Blossom Vale • Staff applications" },
      timestamp: new Date().toISOString()
    };
    if (application.experienceProofCount) embed.fields.push({ name: "Experience proof", value: String(application.experienceProofCount) + " screenshot(s) attached", inline: true });
    if (creator) {
      embed.fields.push({ name: "Channel", value: discordEmbedValue(application.contentLink).slice(0, 1024) });
      embed.image = { url: "attachment://creator-proof.webp" };
    }
    return {
      username: "Blossom Vale Applications",
      embeds: [embed],
      allowed_mentions: { parse: [] }
    };
  }

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

  // answer length: a live counter under each long answer, and a minimum so one-liners can't be sent
  const countedFields = [...form.querySelectorAll("textarea[data-min]")];
  countedFields.forEach((field) => {
    const note = document.createElement("p");
    note.className = "staff-field-hint staff-count";
    field.insertAdjacentElement("afterend", note);
    const update = () => {
      const length = field.value.trim().length;
      const min = Number(field.dataset.min);
      note.textContent = length + " / " + field.maxLength + " characters" + (length < min ? " · write at least " + min : " · long enough");
      note.classList.toggle("is-short", length < min);
    };
    field.addEventListener("input", update);
    form.addEventListener("reset", () => setTimeout(update));
    update();
  });

  const requestedRole = new URLSearchParams(window.location.search).get("role");
  if (["helper", "creator"].includes(requestedRole)) roleSelect.value = requestedRole;
  roleSelect.addEventListener("change", updateRoleQuestions);
  updateRoleQuestions();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const tooShort = countedFields.find((field) => !field.disabled && field.value.trim().length < Number(field.dataset.min));
    if (tooShort) {
      const group = tooShort.closest("details");
      if (group) group.open = true;
      status.textContent = "Please write a little more in the answer we’ve taken you to (at least " + tooShort.dataset.min + " characters). Specific answers help us get to know you.";
      tooShort.focus();
      return;
    }

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
      reference: value(data, "reference"),
      reason: value(data, "reason"),
      consented: data.get("consent") === "on",
      requirementsConfirmed: data.get("requirements") === "on",
      website: value(data, "website"),
      startedAt: Number(form.dataset.startedAt || Date.now())
    };

    if (role === "helper") {
      for (const field of ["helperTenure", "helperFeedback", "helperStuck", "helperRemoved", "helperStepBack", "helperLand", "helperRanks", "helperRules", "helperReport", "helperEarn", "helper", "helperLimits", "helperStaffAbuse", "helperDiscordScam", "helperDiscordAccusation", "helperDiscordWellbeing"]) {
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

    const proofFiles = data.getAll("experienceProof").filter((file) => file && file.size > 0);
    const proofImages = [];
    if (proofFiles.length) {
      const allowedProof = ["image/png", "image/jpeg", "image/webp"];
      const proofInput = document.getElementById("app-experience-proof");
      if (proofFiles.length > 3) {
        status.textContent = "Please attach no more than 3 screenshots of your experience.";
        proofInput.focus();
        return;
      }
      if (proofFiles.some((file) => !allowedProof.includes(file.type) || file.size > 10 * 1024 * 1024)) {
        status.textContent = "Experience screenshots must be PNG, JPG, or WebP files up to 10 MB each.";
        proofInput.focus();
        return;
      }
      submitButton.disabled = true;
      status.textContent = "Preparing your screenshots…";
      try {
        for (const file of proofFiles) proofImages.push(await compressProof(file));
      } catch (error) {
        status.textContent = error.message || "Could not prepare those screenshots. Please try other images.";
        submitButton.disabled = false;
        return;
      }
      application.experienceProofCount = proofImages.length;
    }

    submitButton.disabled = true;
    status.textContent = "Sending your application to Discord…";
    try {
      if (!webhookUrl) throw new Error("The application webhook is not configured.");
      const payload = { ...application };
      const proof = payload.proof;
      delete payload.proof;
      const requestBody = new FormData();
      requestBody.append("payload_json", JSON.stringify(makeDiscordPayload(payload)));
      requestBody.append(
        "files[0]",
        new Blob([applicationText(payload)], { type: "text/plain;charset=utf-8" }),
        `blossom-vale-${payload.role}-application.txt`
      );
      if (proof) requestBody.append("files[1]", proof, "creator-proof.webp");
      proofImages.forEach((image, index) => requestBody.append("files[" + (2 + index) + "]", image, "experience-proof-" + (index + 1) + ".webp"));
      const response = await fetch(webhookUrl, { method: "POST", body: requestBody, mode: "no-cors" });
      if (response.type !== "opaque" && !response.ok) throw new Error("Application submission failed.");
      form.reset();
      updateRoleQuestions();
      status.textContent = "Your application has been submitted. Thank you! The Blossom Vale team will review it and contact you on Discord.";
    } catch (error) {
      console.error("Application submission failed", error);
      status.textContent = "We couldn’t submit your application just now. Please try again later or email hello@blossomvale.world.";
    } finally {
      submitButton.disabled = false;
    }
  });
  form.dataset.startedAt = String(Date.now());
}
