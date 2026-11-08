// Blossom Vale cart: reads packages and builds baskets with the Tebex Headless API, then opens Tebex.js checkout.
// Only Tebex's PUBLIC token is used here (safe in the browser). No private key or server secret belongs in this file.
(() => {
  const TOKEN = "15853-876456fc55d71463b89e1e0146359a5e112dd8f4";
  const API = "https://headless.tebex.io/api/accounts/" + TOKEN;
  const IDS = {
    sprout: "7795186", blossom: "7795189", bloom: "7795204", everbloom: "7795206"
  };
  const PRODUCTS = {
    petals300: "7796999", petals700: "7797001", petals1500: "7797005", petals3500: "7797006",
    poppy1: "7797013", poppy3: "7797014", tulip1: "7797015", tulip3: "7797016"
  };
  const PETAL_PRODUCTS = [PRODUCTS.petals300, PRODUCTS.petals700, PRODUCTS.petals1500, PRODUCTS.petals3500];
  const KEY_PRODUCTS = [PRODUCTS.poppy1, PRODUCTS.poppy3, PRODUCTS.tulip1, PRODUCTS.tulip3];
  const ALL_PRODUCTS = [...Object.values(IDS), ...Object.values(PRODUCTS)];
  const OLD_UPGRADES = {"7796380": IDS.blossom, "7796381": IDS.bloom, "7796384": IDS.bloom, "7796385": IDS.everbloom, "7796387": IDS.everbloom, "7796388": IDS.everbloom};
  const KEY = "bv_cart_v1";
  const NAME_OK = /^\.?[A-Za-z0-9_ ]{3,16}$/;       // Java names, or Bedrock names with the leading dot
  let catalog = {}, catalogOk = false, catalogError = false, cart = [], basket = null, migrated = false;

  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); if (!Array.isArray(v)) return []; return [...new Set(v.map(String).map((x) => { if (OLD_UPGRADES[x]) { migrated = true; return OLD_UPGRADES[x]; } return x; }).filter((x) => ALL_PRODUCTS.includes(x)))]; } catch (e) { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* storage can be blocked */ } };
  cart = load();

  const money = (n, cur) => { try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur || "GBP" }).format(Number(n)); } catch (e) { return "£" + Number(n).toFixed(2); } };
  const priceOf = (p) => p ? Number(p.base_price != null ? p.base_price : (p.price != null ? p.price : p.total_price)) : NaN;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const api = async (path, opts) => {
    const r = await fetch(API + path, Object.assign({ headers: { "Content-Type": "application/json", Accept: "application/json" } }, opts));
    let j = null; try { j = await r.json(); } catch (e) { /* no body */ }
    if (!r.ok) throw new Error((j && (j.detail || j.message || j.title)) || "Tebex said no (" + r.status + ").");
    return j;
  };

  const first = async (urls, opts) => {
    let last;
    for (const u of urls) {
      const r = await fetch(u, Object.assign({ headers: { "Content-Type": "application/json", Accept: "application/json" } }, opts));
      let j = null; try { j = await r.json(); } catch (e) { /* no body */ }
      if (r.ok) return j;
      last = new Error((j && (j.detail || j.message || j.title)) || "Tebex said no (" + r.status + ").");
      if (r.status !== 404) throw last;
    }
    throw last;
  };

  // ---- the cart window
  const dlg = document.createElement("dialog");
  dlg.className = "cart-dialog"; dlg.setAttribute("aria-labelledby", "cart-title");
  dlg.innerHTML = '<div class="cart-box"><div class="cart-head"><h2 id="cart-title">Your cart</h2><button type="button" class="cart-x" data-cart-close aria-label="Close cart">&times;</button></div><div class="cart-body" aria-live="polite"></div></div>';
  const body = dlg.querySelector(".cart-body");
  const fab = el("button", "cart-fab"); fab.type = "button";
  const setFab = () => { fab.textContent = "Cart" + (cart.length ? " (" + cart.length + ")" : ""); fab.setAttribute("aria-label", "Open cart, " + cart.length + " item" + (cart.length === 1 ? "" : "s")); };
  const open = () => { render(); if (!dlg.open) dlg.showModal(); };
  fab.addEventListener("click", open);
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-cart-close]")) dlg.close(); });
  dlg.addEventListener("close", () => { basket = null; });

  const msg = (t, bad) => { const m = el("p", "cart-msg" + (bad ? " bad" : ""), t); return m; };

  function syncPackageButtons() {
    document.querySelectorAll("[data-cart-package], [data-purchase-package]").forEach((b) => {
      const id = String(b.dataset.cartPackage || b.dataset.purchasePackage || "");
      const ready = catalogOk && Boolean(catalog[id]);
      b.disabled = !ready;
      b.setAttribute("aria-disabled", ready ? "false" : "true");
      b.dataset.pkg = id;
      b.textContent = catalogError ? "Temporarily unavailable" : !catalogOk ? "Checking availability…" : ready ? (b.hasAttribute("data-cart-package") ? "Add to cart" : "Buy now") : "Coming soon";
    });
  }

  function render() {
    body.textContent = "";
    setFab();
    if (basket) return renderReview();
    if (!cart.length) { body.append(msg("Your cart is empty. Pick a rank, Petal bundle or key bundle and press Add to cart."), btn("Keep browsing", () => dlg.close(), "ghost")); return; }
    if (migrated) body.append(msg("Your previous upgrade selection is now the rank you want. Check the final upgrade price after entering your Minecraft name.", true));
    cart.forEach((id) => {
      const p = catalog[id], row = el("div", "cart-row"), info = el("div", "cart-info");
      info.append(el("strong", "", p ? p.name : "Package " + id), el("span", "cart-sub", Object.values(IDS).includes(id) ? "One rank for this player" : "Quantity: 1 bundle"));
      const price = el("span", "cart-price", p ? money(priceOf(p), p.currency) : "Price unavailable");
      const rm = btn("Remove", () => { cart = cart.filter((item) => item !== id); basket = null; save(); render(); }, "ghost small");
      row.append(info, price, rm); body.append(row);
    });
    body.append(msg("Prices shown are before tax. Tebex checks eligible rank purchases and calculates any upgrade price after you enter your Minecraft name."));
    const rankCount = cart.filter((id) => Object.values(IDS).includes(id)).length;
    if (rankCount > 1) body.append(msg("Please choose one rank for this player. Higher ranks include the benefits of lower ranks. Remove the extra rank to continue.", true));
    if (!catalogOk) body.append(msg("We could not load prices from Tebex just now. Please try again in a moment.", true));
    const form = el("form", "cart-form");
    const couponLab = el("label", "", "Discount code (optional)"); couponLab.htmlFor = "cart-coupon";
    const coupon = el("input"); coupon.id = "cart-coupon"; coupon.name = "coupon"; coupon.autocomplete = "off"; coupon.maxLength = 64; coupon.placeholder = "Enter a Tebex code";
    const lab = el("label", "", "Minecraft name"); lab.htmlFor = "cart-name";
    const inp = el("input"); inp.id = "cart-name"; inp.name = "mcname"; inp.autocomplete = "off"; inp.maxLength = 17; inp.placeholder = "Java name, or .Name on Bedrock"; inp.required = true;
    try { inp.value = localStorage.getItem("bv_mcname") || ""; } catch (e) { /* ignore */ }
    const note = el("p", "cart-fine", "Enter the Minecraft account that should receive your items. Bedrock players: put a dot in front, like .Willow. Check the spelling before checkout.");
    const err = msg("", true); err.hidden = true;
    const go = btn("Continue to checkout", null, "primary"); go.type = "submit"; go.disabled = rankCount > 1 || !catalogOk || cart.some((id) => !catalog[id]);
    form.append(couponLab, coupon, lab, inp, note, err, go);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (cart.filter((id) => Object.values(IDS).includes(id)).length > 1) return;
      const name = inp.value.trim();
      if (!NAME_OK.test(name)) { err.textContent = "Names are 3 to 16 letters, numbers or underscores. Bedrock names start with a dot."; err.hidden = false; return; }
      err.hidden = true; go.disabled = true; go.textContent = "Creating your basket...";
      try { localStorage.setItem("bv_mcname", name); } catch (x) { /* ignore */ }
      try { await createBasket(name, coupon.value.trim()); render(); }
      catch (x) { const detail = x.message || ""; err.textContent = /(?:isn.t|is not) purchasable/i.test(detail) ? "Tebex couldn't add this item. You may already own this rank or a higher rank, or the item may have another purchase restriction. Check your Minecraft name and contact us on Discord if you need help." : (detail || "Something went wrong. Please try again."); err.hidden = false; go.disabled = false; go.textContent = "Continue to checkout"; }
    });
    body.append(form);
  }

  // The basket Tebex returns is what we show and pay for. Prices on this page are only a preview.
  async function createBasket(name, couponCode) {
    const here = location.origin + location.pathname;
    const b = await api("/baskets", { method: "POST", body: JSON.stringify({ username: name, complete_url: here + "?checkout=return", cancel_url: here + "?checkout=cancelled", complete_auto_redirect: true }) });
    const ident = b.data && b.data.ident;
    if (!ident) throw new Error("Tebex did not give us a basket. Please try again.");
    // Add-package is POST https://headless.tebex.io/api/baskets/{ident}/packages (no token in the path); the basket read keeps a fallback.
    const ROOT = "https://headless.tebex.io/api";
    for (const id of cart) {
      const addBody = JSON.stringify({ package_id: Number(id), quantity: 1 });
      await first([ROOT + "/baskets/" + ident + "/packages"], { method: "POST", body: addBody });
    }
    if (couponCode) {
      await api("/baskets/" + encodeURIComponent(ident) + "/coupons", {
        method: "POST", body: JSON.stringify({ coupon_code: couponCode })
      });
    }
    const full = await first([API + "/baskets/" + ident, ROOT + "/baskets/" + ident], { method: "GET" });
    if (!full.data) throw new Error("Tebex could not load your basket. Please try again.");
    const included = new Set((full.data.packages || []).map((p) => String(p.id)));
    if (cart.some((id) => !included.has(id))) throw new Error("Tebex could not add every item. Please review your selections or try them separately.");
    basket = full.data; basket._name = name;
  }

  function renderReview() {
    const b = basket, cur = b.currency || "GBP";
    body.append(el("p", "cart-fine", "Review what Tebex has for " + b._name + ":"));
    if (Array.isArray(b.coupons) && b.coupons.length) {
      body.append(msg("Tebex applied discount code: " + b.coupons.map((c) => c.coupon_code).filter(Boolean).join(", ")));
    }
    (b.packages || []).forEach((p) => {
      const row = el("div", "cart-row"), info = el("div", "cart-info");
      info.append(el("strong", "", p.name), el("span", "cart-sub", "Quantity: " + ((p.in_basket && p.in_basket.quantity) || 1)));
      row.append(info, el("span", "cart-price", money((p.in_basket && p.in_basket.price) != null ? p.in_basket.price : priceOf(p), cur)));
      body.append(row);
    });
    const tot = el("div", "cart-total"); tot.append(el("span", "", "Total"), el("strong", "", money(b.total_price != null ? b.total_price : b.base_price, cur)));
    body.append(tot);
    body.append(el("p", "cart-fine", "Payment happens in Tebex's secure checkout. Your items are delivered after Tebex confirms payment, not by this page. For rank gifts, choose “Purchase as Gift” in Tebex checkout."));
    const pay = btn("Pay securely with Tebex", () => { dlg.close(); launch(b); }, "primary");   // our panel closes so checkout is unobstructed; cart and basket stay if the buyer cancels
    body.append(pay, btn("Back", () => { basket = null; render(); }, "ghost"));
  }

  function launch(b) {
    const start = () => {
      try {
        window.Tebex.checkout.init({ ident: b.ident, locale: "en_GB", theme: "light", colors: [{ name: "primary", color: "#c25aa6" }, { name: "secondary", color: "#7d4a33" }] });
        // Clear the cart only when Tebex.js itself reports a completed payment (if this build of Tebex.js offers the event)
        try { if (window.Tebex.checkout.on) window.Tebex.checkout.on("payment:complete", () => { cart = []; basket = null; save(); setFab(); }); } catch (e) { /* optional */ }
        window.Tebex.checkout.launch();
      } catch (e) { fallback(b); }
    };
    if (window.Tebex && window.Tebex.checkout) return start();
    const s = document.createElement("script"); s.src = "https://js.tebex.io/v/1.js"; s.onload = start; s.onerror = () => fallback(b);
    document.head.appendChild(s);
  }
  // If Tebex.js can't load (blocked, offline), use the checkout link Tebex gave us. It returns to this page afterwards.
  function fallback(b) { const u = b.links && b.links.checkout; if (u && /^https:\/\//.test(u)) location.href = u; else { basket = null; render(); body.prepend(msg("Checkout could not open. Please try again.", true)); } }

  function btn(label, fn, cls) { const b = el("button", "rank-buy cart-btn " + (cls || ""), label); b.type = "button"; if (fn) b.addEventListener("click", fn); return b; }

  function add(id, buyNow) {
    if (!ALL_PRODUCTS.includes(String(id)) || !catalog[String(id)]) return;
    id = String(id);
    const isRank = Object.values(IDS).includes(id);
    if (!buyNow && isRank && cart.some((item) => Object.values(IDS).includes(item) && item !== id)) {
      let notice = document.getElementById("cart-added-notice");
      if (!notice) { notice = el("div", "cart-return"); notice.id = "cart-added-notice"; notice.setAttribute("role", "status"); document.body.prepend(notice); }
      notice.textContent = "Your cart can have one rank at a time. Remove the current rank before choosing another.";
      clearTimeout(add.noticeTimer); add.noticeTimer = setTimeout(() => notice.remove(), 5000);
      return;
    }
    const already = cart.includes(id);
    if (buyNow) cart = [id];
    else if (!already) cart.push(id);
    basket = null; save(); setFab();
    if (buyNow) { open(); const n = body.querySelector("#cart-name"); if (n) n.focus(); }
    else {
      let notice = document.getElementById("cart-added-notice");
      if (!notice) { notice = el("div", "cart-return"); notice.id = "cart-added-notice"; notice.setAttribute("role", "status"); document.body.prepend(notice); }
      notice.textContent = already ? "This item is already in your cart." : "Item added to cart.";
      clearTimeout(add.noticeTimer); add.noticeTimer = setTimeout(() => notice.remove(), 4000);
    }
  }

  // ---- attach to the page
  function wire() {
    document.body.append(dlg, fab); setFab();
    const codeButton = document.getElementById("open-cart-code");
    if (codeButton) codeButton.addEventListener("click", open);
    // Put a one-click checkout action directly on each rank card.
    document.querySelectorAll(".rank-card [data-rank-open]").forEach((details) => {
      const id = IDS[String(details.dataset.rankOpen || "")];
      if (!id) return;
      const actions = el("div", "rank-actions");
      const buy = btn("Checking availability…", () => add(id, true), "primary cart-buy");
      buy.dataset.purchasePackage = id;
      buy.disabled = true;
      details.parentNode.insertBefore(actions, details);
      actions.append(buy, details);
    });
    // rank windows: swap the checkout line for Add to cart
    document.querySelectorAll("dialog.rank-dialog").forEach((d) => {
      const slug = d.id.replace("rd-", ""), id = IDS[slug]; if (!id) return;
      const soon = d.querySelector(".rd-soon"), link = d.querySelector("[data-checkout]");
      if (link) link.remove();
      const b = btn("Add to cart", () => { d.close(); add(id); }, "cart-add"); b.dataset.pkg = id;
      const buy = btn("Buy now", () => { d.close(); add(id, true); }, "primary cart-buy");
      if (soon) soon.replaceWith(buy, b); else d.append(buy, b);
    });
    // Petal bundles and crate keys use the same Tebex basket and checkout as ranks.
    document.querySelectorAll("[data-cart-package]").forEach((b) => {
      const id = String(b.dataset.cartPackage || "");
      if (!ALL_PRODUCTS.includes(id)) return;
      b.addEventListener("click", () => add(id));
      if (PETAL_PRODUCTS.includes(id) || KEY_PRODUCTS.includes(id)) {
        const buy = btn("Checking availability…", () => add(id, true), "primary cart-buy small");
        buy.dataset.purchasePackage = id;
        buy.disabled = true;
        b.insertAdjacentElement("afterend", buy);
      }
    });
    syncPackageButtons();
    // coming back from Tebex: say nothing about success, we only know the shopper came back
    const q = new URLSearchParams(location.search).get("checkout");
    if (q) {
      setFab();
      const n = el("div", "cart-return", q === "cancelled" ? "Checkout was cancelled. Your cart is still here." : "Thanks for visiting checkout. If your payment went through, your purchase should arrive in the game within a few minutes (rejoin if you are online). Tebex confirms the payment, not this page. Not there after 15 minutes? Message us on Discord.");
      n.setAttribute("role", "status"); document.body.prepend(n);
      history.replaceState(null, "", location.pathname);
    }
  }

  // prices straight from Tebex
  api("/packages").then((j) => {
    (j.data || []).forEach((p) => { catalog[String(p.id)] = p; });
    catalogOk = true;
    syncPackageButtons();
    if (dlg.open) render();
  }).catch(() => { catalogOk = false; catalogError = true; syncPackageButtons(); if (dlg.open) render(); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
