const LIMITS = {
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
  contentLink: 500
};

const labels = {
  name: "Name",
  discordId: "Discord User ID",
  minecraft: "Minecraft username",
  availability: "Time zone and availability",
  experience: "Relevant experience",
  reason: "Why they want to join the team",
  helper: "Damaged build report",
  helperIssue: "Helping a new player",
  helperBoundaries: "Argument and private information",
  helperLimits: "Request outside permissions",
  helperMistake: "Correcting a mistake",
  platforms: "Platforms and audience size",
  contentLink: "Channel link"
};

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function cleanApplication(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const app = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    const value = input[key] == null ? "" : String(input[key]).trim();
    if (value.length > max) return null;
    app[key] = value;
  }
  app.role = String(input.role || "");
  app.consented = input.consented === true;
  app.website = String(input.website || "").slice(0, 300);
  app.startedAt = Number(input.startedAt);
  if (!app.name || !/^\d{17,20}$/.test(app.discordId) || !app.minecraft || !app.availability || !app.reason || !app.consented) return null;
  if (!["helper", "creator"].includes(app.role)) return null;
  if (app.role === "helper" && !["helper", "helperIssue", "helperBoundaries", "helperLimits", "helperMistake"].every((key) => app[key])) return null;
  if (app.role === "creator") {
    if (!app.platforms || !app.contentLink) return null;
    try {
      const url = new URL(app.contentLink);
      if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    } catch { return null; }
  }
  return app;
}

function applicationText(app) {
  const fields = ["name", "discordId", "minecraft", "availability", "experience", "reason"];
  const roleFields = app.role === "helper"
    ? ["helper", "helperIssue", "helperBoundaries", "helperLimits", "helperMistake"]
    : ["platforms", "contentLink"];
  return [...fields, ...roleFields]
    .filter((key) => app[key])
    .map((key) => `${labels[key]}\n${app[key]}`)
    .join("\n\n");
}

function safeFilename(role) {
  return `blossom-vale-${role}-application.txt`;
}

function safeEmbedValue(value) {
  return value.replace(/[\\*_`~|>]/g, "\\$&").slice(0, 256);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = origin === env.SITE_ORIGIN || (env.ALLOW_LOCAL_ORIGIN === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname !== "/submit" || request.method !== "POST") return json({ error: "Not found." }, 404);
    if (!allowedOrigin) return json({ error: "Request origin not allowed." }, 403);
    const responseHeaders = corsHeaders(origin);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 2 * 1024 * 1024) return json({ error: "Application upload is too large.", code: "invalid_application" }, 413, responseHeaders);
    if (!env.DISCORD_WEBHOOK_URL || !/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w.-]+$/.test(env.DISCORD_WEBHOOK_URL)) {
      return json({ error: "Application service is not configured.", code: "service_unavailable" }, 503, responseHeaders);
    }
    if (!env.APPLICATION_RATE_LIMITER) return json({ error: "Application rate limit is not configured.", code: "service_unavailable" }, 503, responseHeaders);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rate = await env.APPLICATION_RATE_LIMITER.limit({ key: ip });
    if (!rate.success) return json({ error: "Please wait before submitting another application.", code: "rate_limited" }, 429, responseHeaders);

    let form;
    try { form = await request.formData(); }
    catch { return json({ error: "Please check your application and try again.", code: "invalid_application" }, 400, responseHeaders); }
    let input;
    try { input = JSON.parse(String(form.get("application") || "")); }
    catch { return json({ error: "Please check your application and try again.", code: "invalid_application" }, 400, responseHeaders); }
    const app = cleanApplication(input);
    if (!app) return json({ error: "Please complete all required fields with valid information.", code: "invalid_application" }, 400, responseHeaders);
    if (app.website) return json({ ok: true }, 200, responseHeaders);
    if (!Number.isFinite(app.startedAt) || Date.now() - app.startedAt < 2500 || Date.now() - app.startedAt > 24 * 60 * 60 * 1000) {
      return json({ error: "Please wait a moment and try submitting again.", code: "invalid_application" }, 400, responseHeaders);
    }

    const proof = form.get("channelProof");
    if (app.role === "creator" && (!(proof instanceof File) || !["image/png", "image/jpeg", "image/webp"].includes(proof.type) || proof.size < 1 || proof.size > 480 * 1024)) {
      return json({ error: "Please upload a valid YouTube Studio screenshot under 480 KB.", code: "invalid_application" }, 400, responseHeaders);
    }
    if (app.role !== "creator" && proof instanceof File && proof.size) {
      return json({ error: "Unexpected file attached.", code: "invalid_application" }, 400, responseHeaders);
    }

    const roleTitle = app.role === "helper" ? "Helper application" : "Content Creator application";
    const embed = {
      title: roleTitle,
      color: app.role === "helper" ? 0xEFB6D9 : 0xB8D7F0,
      fields: [
        { name: "Applicant", value: safeEmbedValue(app.name), inline: true },
        { name: "Discord User ID", value: app.discordId, inline: true },
        { name: "Minecraft username", value: safeEmbedValue(app.minecraft), inline: true }
      ],
      footer: { text: "Blossom Vale • Staff applications" },
      timestamp: new Date().toISOString()
    };
    if (app.role === "creator") {
      embed.fields.push({ name: "Channel", value: safeEmbedValue(app.contentLink).slice(0, 1024) });
      embed.image = { url: "attachment://creator-proof.webp" };
    }
    const outgoing = new FormData();
    outgoing.append("payload_json", JSON.stringify({
      username: "Blossom Vale Applications",
      embeds: [embed],
      allowed_mentions: { parse: [] }
    }));
    outgoing.append("files[0]", new Blob([applicationText(app)], { type: "text/plain;charset=utf-8" }), safeFilename(app.role));
    if (app.role === "creator") outgoing.append("files[1]", proof, "creator-proof.webp");

    try {
      const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, { method: "POST", body: outgoing });
      if (!discordResponse.ok) {
        // Do not log response bodies or applicant data; Discord errors can contain request details.
        return json({ error: "We couldn’t deliver your application to the review team. Please try again later or email hello@blossomvale.world.", code: "delivery_failed" }, 502, responseHeaders);
      }
    } catch {
      return json({ error: "We couldn’t deliver your application to the review team. Please try again later or email hello@blossomvale.world.", code: "delivery_failed" }, 502, responseHeaders);
    }
    return json({ ok: true }, 200, responseHeaders);
  }
};
