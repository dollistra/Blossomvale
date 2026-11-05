const restartCounter = document.querySelector("#last-restart");
const serverStatus = document.querySelector("#server-status");
let restartedAt = NaN;

const updateRestartTime = () => {
  if (!restartCounter || !Number.isFinite(restartedAt)) return;
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - restartedAt) / 60000));
  const days = Math.floor(elapsedMinutes / 1440);
  const hours = Math.floor((elapsedMinutes % 1440) / 60);
  const minutes = elapsedMinutes % 60;
  restartCounter.textContent = days
    ? days + "d " + hours + "h ago"
    : hours + "h " + minutes + "m ago";
};

const showServerStatsUnavailable = () => {
  if (!restartCounter || !serverStatus) return;
  restartCounter.textContent = "Unavailable";
  serverStatus.dataset.status = "unavailable";
  serverStatus.querySelector("span").textContent = "Unavailable";
};

window.addEventListener("blossom:server-stats", (event) => {
  if (!restartCounter || !serverStatus) return;
  const { status, restartedAt: restartDate } = event.detail;
  restartedAt = Date.parse(restartDate);
  if (!Number.isFinite(restartedAt)) {
    showServerStatsUnavailable();
    return;
  }
  updateRestartTime();
  serverStatus.dataset.status = status;
  serverStatus.querySelector("span").textContent = status.charAt(0).toUpperCase() + status.slice(1);
});

window.addEventListener("blossom:server-stats-error", showServerStatsUnavailable);
if (restartCounter) window.setInterval(updateRestartTime, 60000);
const dialog = document.querySelector(".join-dialog");
const copyFeedback = document.querySelector("#copy-feedback");
// Addresses shown in the Play Now pop-up. Leave bedrockIp empty until the Bedrock address is confirmed.
const javaIp = "play.blossomvale.world";
const bedrockIp = "";

const copyTextFallback = (text) => {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
};

const javaText = document.querySelector("#join-java"), bedrockText = document.querySelector("#join-bedrock");
const bedrockBtn = document.querySelector("[data-copy='bedrock']");
if (javaText) javaText.textContent = javaIp;
if (bedrockText && bedrockIp) { bedrockText.textContent = bedrockIp; if (bedrockBtn) bedrockBtn.disabled = false; }

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!dialog) return;
    if (copyFeedback) copyFeedback.textContent = "";
    dialog.querySelectorAll("[data-copy]").forEach((b) => { b.textContent = "Copy"; });
    dialog.showModal();
    if (window.snapBoards) window.snapBoards();
  });
});

dialog?.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = btn.dataset.copy === "bedrock" ? bedrockIp : javaIp;
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else if (!copyTextFallback(text)) throw new Error("Clipboard access is unavailable.");
      dialog.querySelectorAll("[data-copy]").forEach((b) => { b.textContent = "Copy"; });
      btn.textContent = "Copied!";
      if (copyFeedback) copyFeedback.textContent = "";
    } catch {
      if (copyFeedback) copyFeedback.textContent = "Copy didn\u2019t work automatically. Select the address and copy it.";
    }
  });
});

document.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

const navLinks = [...document.querySelectorAll(".nav-link")];
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
const observer = new IntersectionObserver((entries) => {
  const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  navLinks.forEach((link) => {
    const active = link.getAttribute("href") === "#" + visible.target.id;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}, { threshold: [0.35, 0.6] });
sections.forEach((section) => observer.observe(section));

const headerArt = document.querySelector(".header-art");
if (headerArt) {
  const header = headerArt.closest(".site-header");
  const sources = {
    home: headerArt.dataset.homeSrc,
    wiki: headerArt.dataset.wikiSrc,
    shop: headerArt.dataset.shopSrc
  };
  const activeKey = headerArt.dataset.activeBar || "home";
  const activeSource = sources[activeKey];
  const previewArt = document.createElement("img");

  previewArt.className = "header-art-preview";
  previewArt.alt = "";
  previewArt.setAttribute("aria-hidden", "true");
  previewArt.draggable = false;
  header.insertBefore(previewArt, headerArt.nextSibling);

  Object.values(sources).forEach((source) => { if (source) new Image().src = source; });

  const keyFor = (link) => link.classList.contains("home-hitbox") ? "home" : link.classList.contains("wiki-hitbox") ? "wiki" : "shop";

  const updateHeaderBar = () => {
    const hoveredOrFocused = document.querySelector(".image-nav a:hover, .image-nav a:focus");
    if (!hoveredOrFocused) {
      header.classList.remove("is-previewing");
      return;
    }
    const targetSource = sources[keyFor(hoveredOrFocused)];
    if (targetSource && targetSource !== activeSource) {
      if (!previewArt.src.endsWith(targetSource.replace("./", ""))) previewArt.src = targetSource;
      header.classList.add("is-previewing");
    } else {
      header.classList.remove("is-previewing");
    }
  };

  document.querySelectorAll(".image-nav a").forEach((link) => {
    link.addEventListener("pointerenter", updateHeaderBar);
    link.addEventListener("pointerleave", updateHeaderBar);
    link.addEventListener("focus", updateHeaderBar);
    link.addEventListener("blur", updateHeaderBar);
  });
}

window.addEventListener('DOMContentLoaded', () => {
    // Look for any element containing the badge or Netlify iframe
    const badge = document.querySelector('[id*="netlify-badge"]') || document.querySelector('.netlify-badge');
    if (badge) {
        badge.remove();
    }
});
