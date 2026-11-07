// Blossom Vale cart: reads packages and builds baskets with the Tebex Headless API, then opens Tebex.js checkout.
// Only Tebex's PUBLIC token is used here (safe in the browser). No private key or server secret belongs in this file.
(() => {
  const TOKEN = "15853-876456fc55d71463b89e1e0146359a5e112dd8f4";
  const API = "https://headless.tebex.io/api/accounts/" + TOKEN;
  const IDS = {
    sprout: "7795186", blossom: "7795189", bloom: "7795204", everbloom: "7795206",
    "sprout>blossom": "7796380", "sprout>bloom": "7796381", "blossom>bloom": "7796384",
    "blossom>everbloom": "7796385", "bloom>everbloom": "7796387", "sprout>everbloom": "7796388"
  };
  const KEY = "bv_cart_v1";
  const NAME_OK = /^\.?[A-Za-z0-9_ ]{3,16}$/;       // Java names, or Bedrock names with the leading dot
  let catalog = {}, catalogOk = false, cart = [], basket = null;

  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.filter((x) => Object.values(IDS).includes(String(x))).slice(0, 1) : []; } catch (e) { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* storage can be blocked */ } };
  cart = load();

  const money = (n, cur) => { try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur || "GBP" }).format(Number(n)); } catch (e) { return "£" + Number(n).toFixed(2); } };
  const priceOf = (p) => p ? Number(p.total_price != null ? p.total_price : p.price) : NaN;
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

  const msg = (t, bad) => { const m = el("p", "cart-msg" + (bad ? " bad" : ""), t); return m; };

  function render() {
    body.textContent = "";
    setFab();
    if (basket) return renderReview();
    if (!cart.length) { body.append(msg("Your cart is empty. Pick a rank or an upgrade and press Add to cart."), btn("Keep browsing", () => dlg.close(), "ghost")); return; }
    const p = catalog[cart[0]];
    const row = el("div", "cart-row");
    const info = el("div", "cart-info");
    info.append(el("strong", "", p ? p.name : "Package " + cart[0]), el("span", "cart-sub", "Quantity: 1 (one per player)"));
    const price = el("span", "cart-price", p ? money(priceOf(p), p.currency) : (catalogOk ? "" : "Price unavailable"));
    const rm = btn("Remove", () => { cart = []; save(); render(); }, "ghost small");
    row.append(info, price, rm);
    body.append(row);
    body.append(msg("You can buy one rank or upgrade at a time. Adding another replaces this one. Upgrades only work if you already own the rank they start from."));
    if (!catalogOk) body.append(msg("We could not load prices from Tebex just now. Please try again in a moment.", true));
    const form = el("form", "cart-form");
    const lab = el("label", "", "Minecraft name"); lab.htmlFor = "cart-name";
    const inp = el("input"); inp.id = "cart-name"; inp.name = "mcname"; inp.autocomplete = "off"; inp.maxLength = 17; inp.placeholder = "Java name, or .Name on Bedrock"; inp.required = true;
    try { inp.value = localStorage.getItem("bv_mcname") || ""; } catch (e) { /* ignore */ }
    const note = el("p", "cart-fine", "Bedrock players: put a dot in front, like .Willow. Check the spelling, the rank goes to this name.");
    const err = msg("", true); err.hidden = true;
    const go = btn("Continue to checkout", null, "primary"); go.type = "submit"; go.disabled = !catalogOk || !p;
    form.append(lab, inp, note, err, go);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = inp.value.trim();
      if (!NAME_OK.test(name)) { err.textContent = "Names are 3 to 16 letters, numbers or underscores. Bedrock names start with a dot."; err.hidden = false; return; }
      err.hidden = true; go.disabled = true; go.textContent = "Creating your basket...";
      try { localStorage.setItem("bv_mcname", name); } catch (x) { /* ignore */ }
      try { await createBasket(name); render(); }
      catch (x) { err.textContent = x.message || "Something went wrong. Please try again."; err.hidden = false; go.disabled = false; go.textContent = "Continue to checkout"; }
    });
    body.append(form);
  }

  // The basket Tebex returns is what we show and pay for. Prices on this page are only a preview.
  async function createBasket(name) {
    const here = location.origin + location.pathname;
    const b = await api("/baskets", { method: "POST", body: JSON.stringify({ username: name, complete_url: here + "?checkout=return", cancel_url: here + "?checkout=cancelled", complete_auto_redirect: true }) });
    const ident = b.data && b.data.ident;
    if (!ident) throw new Error("Tebex did not give us a basket. Please try again.");
    // Tebex's docs and live API disagree on these paths, so try the known forms until one is found (a 404 is the only reason to move on).
    const ROOT = "https://headless.tebex.io/api";
    const addBody = JSON.stringify({ package_id: cart[0], quantity: 1 });
    await first([ROOT + "/baskets/" + ident + "/packages", API + "/baskets/" + ident + "/packages", API + "/" + ident + "/packages"], { method: "POST", body: addBody });
    const full = await first([API + "/baskets/" + ident, ROOT + "/baskets/" + ident], { method: "GET" });
    basket = full.data; basket._name = name;
  }

  function renderReview() {
    const b = basket, cur = b.currency || "GBP";
    body.append(el("p", "cart-fine", "Review what Tebex has for " + b._name + ":"));
    (b.packages || []).forEach((p) => {
      const row = el("div", "cart-row"), info = el("div", "cart-info");
      info.append(el("strong", "", p.name), el("span", "cart-sub", "Quantity: " + ((p.in_basket && p.in_basket.quantity) || 1)));
      row.append(info, el("span", "cart-price", money((p.in_basket && p.in_basket.price) != null ? p.in_basket.price : priceOf(p), cur)));
      body.append(row);
    });
    const tot = el("div", "cart-total"); tot.append(el("span", "", "Total"), el("strong", "", money(b.total_price != null ? b.total_price : b.base_price, cur)));
    body.append(tot);
    body.append(el("p", "cart-fine", "Payment happens in Tebex's secure checkout. Your rank is delivered once Tebex confirms the payment, not by this page."));
    const pay = btn("Pay securely with Tebex", () => launch(b), "primary");
    body.append(pay, btn("Back", () => { basket = null; render(); }, "ghost"));
  }

  function launch(b) {
    const start = () => {
      try {
        window.Tebex.checkout.init({ ident: b.ident, locale: "en_GB", theme: "light", colors: [{ name: "primary", color: "#d36ab8" }, { name: "secondary", color: "#7d4a33" }] });
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

  function add(id) {
    const had = cart.length && cart[0] !== id;
    cart = [id]; basket = null; save(); setFab(); open();
    if (had) body.prepend(msg("Replaced the item that was in your cart."));
  }

  // ---- attach to the page
  function wire() {
    document.body.append(dlg, fab); setFab();
    // rank windows: swap the checkout line for Add to cart
    document.querySelectorAll("dialog.rank-dialog").forEach((d) => {
      const slug = d.id.replace("rd-", ""), id = IDS[slug]; if (!id) return;
      const soon = d.querySelector(".rd-soon"), link = d.querySelector("[data-checkout]");
      if (link) link.remove();
      const b = btn("Add to cart", () => { d.close(); add(id); }, "cart-add"); b.dataset.pkg = id;
      if (soon) soon.replaceWith(b); else d.append(b);
    });
    // upgrade table: one Add button per row
    document.querySelectorAll("table.rank-table.small").forEach((t) => {
      const head = t.querySelector("thead tr"); if (!head || !/From/i.test(head.textContent)) return;
      head.append(Object.assign(document.createElement("th"), { scope: "col", textContent: "" }));
      t.querySelectorAll("tbody tr").forEach((tr) => {
        const from = tr.querySelector("th").textContent.trim().toLowerCase(), to = tr.querySelector("td").textContent.trim().toLowerCase();
        const id = IDS[from + ">" + to], td = document.createElement("td"); if (id) { const b = btn("Add", () => add(id), "small cart-add"); b.dataset.pkg = id; b.setAttribute("aria-label", "Add " + from + " to " + to + " upgrade to cart"); td.append(b); }
        tr.append(td);
      });
    });
    // coming back from Tebex: say nothing about success, we only know the shopper came back
    const q = new URLSearchParams(location.search).get("checkout");
    if (q) {
      cart = []; save(); setFab();
      const n = el("div", "cart-return", q === "cancelled" ? "Checkout was cancelled. Nothing was charged by us." : "Thanks for visiting checkout. If your payment went through, your rank arrives in the game within a few minutes (rejoin if you are online). Tebex confirms the payment, not this page. Not there after 15 minutes? Message us on Discord.");
      n.setAttribute("role", "status"); document.body.prepend(n);
      history.replaceState(null, "", location.pathname);
    }
  }

  // prices straight from Tebex
  api("/packages").then((j) => {
    (j.data || []).forEach((p) => { catalog[String(p.id)] = p; });
    catalogOk = true;
    // show live prices on the upgrade table
    document.querySelectorAll("[data-pkg]").forEach((b) => {
      const td = b.closest("tr") && b.closest("tr").children[2], p = catalog[b.dataset.pkg];
      if (td && p && !isNaN(priceOf(p))) td.textContent = money(priceOf(p), p.currency);
    });
    if (dlg.open) render();
  }).catch(() => { catalogOk = false; if (dlg.open) render(); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
