(() => {
  const cfg = window.SHOP_CONFIG || {};
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
  // Goal bar
  const goal = cfg.goal, g = document.getElementById("goal-section");
  if (g) {
    if (goal && goal.target > 0 && goal.raised > 0) {
      g.hidden = false;
      const pct = Math.max(0, Math.min(100, Math.round((goal.raised / goal.target) * 100)));
      const bar = g.querySelector(".goal-bar");
      bar.setAttribute("aria-valuenow", pct);
      bar.querySelector("i").style.width = pct + "%";
      g.querySelector(".goal-title-label").textContent = goal.label || "Village Fund";
      g.querySelector(".goal-numbers").textContent = goal.currency + goal.raised + " of " + goal.currency + goal.target + " (" + pct + "%)";
    }
  }
  // Supporters wall: names from shop-config.js plus the list the game exports (supporters.json, optional).
  const wall = document.getElementById("wall-grid");
  if (wall) {
    const order = { everbloom: 0, bloom: 1, blossom: 2, sprout: 3 };
    const draw = (list) => {
      const seen = new Set();
      const names = list
        .filter((s) => s && typeof s.name === "string" && s.name.trim() && !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()))
        .map((s) => ({ name: s.name.slice(0, 32), rank: s.rank in order ? s.rank : "sprout" }))
        .sort((a, b) => order[a.rank] - order[b.rank] || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      wall.textContent = "";
      if (!names.length) return;
      document.getElementById("wall-section").hidden = false;
      const th = document.getElementById("thanks-section"); if (th) th.hidden = true;
      names.forEach((s) => {
        const li = el("li", "plaque r-" + s.rank);
        if (s.rank === "everbloom") li.appendChild(el("span", "plaque-star", "★"));
        li.appendChild(el("span", "plaque-name", s.name));
        wall.appendChild(li);
      });
      if (window.snapBoards) window.snapBoards();
    };
    const fixed = Array.isArray(cfg.supporters) ? cfg.supporters : [];
    draw(fixed);
    try {
      fetch("./supporters.json", { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && Array.isArray(d.supporters)) { draw(fixed.concat(d.supporters)); } })
        .catch(() => {});
    } catch (e) { /* no list yet: the wall stays as configured */ }
  }
})();

// Re-fit the wooden boards when a fold-away section opens or closes.
document.addEventListener('toggle',(e)=>{ if(e.target.classList&&e.target.classList.contains('fold')&&window.snapBoards) window.snapBoards(); },true);

// Tabs: one section at a time so the page stays short.
(() => {
  const tabs = [...document.querySelectorAll(".shop-tab")];
  const panels = [...document.querySelectorAll(".shop-panel")];
  if (!tabs.length) return;
  const ids = panels.map((p) => p.id);
  const wrap = document.querySelector(".shop-tabs-wrap");
  const show = (id, focusPanel) => {
    if (!ids.includes(id)) id = ids[0];
    tabs.forEach((t) => { const on = t.getAttribute("href") === "#" + id; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
    panels.forEach((p) => p.classList.toggle("is-active", p.id === id));
    if (window.snapBoards) { window.snapBoards(); setTimeout(window.snapBoards, 80); }
    return id;
  };
  const fromHash = () => (location.hash || "").replace("#", "");
  const toTabs = () => { const r = wrap.getBoundingClientRect(); if (r.top < 0 || r.top > 80) window.scrollTo({ top: window.scrollY + r.top - 8, behavior: "auto" }); };
  tabs.forEach((t, i) => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      const id = t.getAttribute("href").slice(1);
      show(id);
      history.replaceState(null, "", "#" + id);
      toTabs();
    });
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); n.click();
    });
  });
  window.addEventListener("hashchange", () => show(fromHash()));
  show(fromHash());
  // sticky look
  const onScroll = () => wrap.classList.toggle("is-stuck", wrap.getBoundingClientRect().top <= 9);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
})();

// ---- extras: links, address, ribbon, weekend bonus, sale banner, top supporter
(() => {
  const cfg = window.SHOP_CONFIG || {};
  document.querySelectorAll("[data-discord]").forEach((a) => { if (cfg.discord) a.href = cfg.discord; });
  if (cfg.javaAddress) {
    document.querySelectorAll("[data-java-address]").forEach((n) => { n.textContent = cfg.javaAddress; });
  }
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    try { const t = document.createElement("textarea"); t.value = text; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok; } catch (e) { return false; }
  };
  document.querySelectorAll("[data-copy-java]").forEach((b) => {
    b.addEventListener("click", async () => {
      const ok = await copyText(cfg.javaAddress || "play.blossomvale.world");
      const old = b.textContent; b.textContent = ok ? "Copied!" : "Press Ctrl+C";
      setTimeout(() => { b.textContent = old; }, 1600);
    });
  });
  const rib = document.querySelector("[data-ribbon='bloom']");
  if (rib) { const t = cfg.ribbons && cfg.ribbons.bloom; if (t) rib.textContent = t; else rib.remove(); }
  // weekend bonus
  const pct = Number(cfg.weekendBonusPercent) || 0;
  const day = new Date().getDay(), weekend = day === 0 || day === 6;
  document.querySelectorAll("[data-weekend-pct]").forEach((n) => { n.textContent = pct; });
  const wb = document.getElementById("weekend-state");
  if (wb) { if (!pct) wb.hidden = true; else wb.classList.toggle("on", weekend); }
  // banner: manual sale first, otherwise the weekend bonus
  const banner = document.getElementById("sale-banner"), btxt = document.getElementById("sale-text");
  if (banner && btxt) {
    let msg = "";
    const sale = cfg.sale || {};
    const ends = sale.ends ? new Date(sale.ends + "T23:59:59") : null;
    if (sale.text && (!ends || new Date() <= ends)) msg = sale.text;
    else if (pct && weekend) msg = "Weekend bonus: +" + pct + "% extra Petals on every bundle until Sunday night!";
    if (msg) { btxt.textContent = msg; banner.hidden = false; }
  }
  // supporter of the month
  const top = cfg.topSupporter;
  if (top && top.name) {
    const n = document.getElementById("top-name");
    if (n) { n.textContent = "★ " + top.name; n.className = "top-name r-" + (top.rank || "sprout"); }
    const ts = document.getElementById("top-section"); if (ts) ts.hidden = false;
  }
  // community tab: show the calm thank-you board only while nothing else has anything to show
  const th = document.getElementById("thanks-section");
  if (th) th.hidden = ["goal-section", "top-section", "wall-section"].some((id) => { const s = document.getElementById(id); return s && !s.hidden; });
})();

// ---- rank windows: "See everything you get", with the player's own skin and a checkout link once the store is open
(() => {
  const cfg = window.SHOP_CONFIG || {};
  const store = cfg.store || {};
  const storeComingSoon = cfg.storeComingSoon !== false;
  const buttons = [...document.querySelectorAll("[data-rank-open]")];
  if (!buttons.length || typeof HTMLDialogElement === "undefined") return;
  const NAME = /^[A-Za-z0-9_]{3,16}$/;
  const lock = (on) => { document.documentElement.style.overflow = on ? "hidden" : ""; };
  document.querySelectorAll("dialog.rank-dialog").forEach((d) => {
    const slug = d.id.replace("rd-", "");
    // checkout: a real link only when you have put one in shop-config.js (https only)
    const url = typeof store[slug] === "string" ? store[slug].trim() : "";
    const link = d.querySelector("[data-checkout]"), soon = d.querySelector(".rd-soon");
    if (!storeComingSoon && /^https:\/\//i.test(url) && link) { link.href = url; link.hidden = false; if (soon) soon.hidden = true; }
    d.querySelectorAll("[data-rank-close]").forEach((b) => b.addEventListener("click", () => d.close()));
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });   // click on the dark backdrop
    d.addEventListener("close", () => { lock(false); const o = document.querySelector("[data-rank-open='" + slug + "']"); if (o) o.focus(); });
    // how it looks on you
    const form = d.querySelector("[data-look]"), input = form.querySelector("input"), note = d.querySelector("[data-look-note]");
    const box = d.querySelector("[data-skin-box]"), skin = d.querySelector("[data-skin]");
    const original = note.textContent;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!NAME.test(name)) { note.textContent = "Java names are 3 to 16 letters, numbers or underscores. Bedrock players: use your Java name if you have one, or try Willow to see the look."; return; }
      d.querySelectorAll("[data-name]").forEach((n) => {
        const star = n.querySelector(".cp-star");
        n.textContent = "";
        if (star) { n.appendChild(star); n.appendChild(document.createTextNode(" ")); }
        n.appendChild(document.createTextNode(name));
      });
      skin.onerror = () => { box.hidden = true; note.textContent = "We couldn't load a skin picture for that name, but this is how your name will look."; };
      skin.onload = () => { note.textContent = original; };
      skin.alt = name + "'s skin";
      skin.src = "https://mc-heads.net/body/" + encodeURIComponent(name) + "/220";
      box.hidden = false;
    });
  });
  buttons.forEach((b) => b.addEventListener("click", () => {
    const d = document.getElementById("rd-" + b.getAttribute("data-rank-open"));
    if (!d) return;
    lock(true);
    d.showModal();
    const body = d.querySelector(".rd-inner"); if (body) body.scrollTop = 0;
  }));
})();
