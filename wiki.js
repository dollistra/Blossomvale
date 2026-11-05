(() => {
  const tabs = [...document.querySelectorAll(".wiki-tab")];
  const panels = [...document.querySelectorAll(".wiki-panel")];
  const tabStrip = document.querySelector(".wiki-tabs");
  if (!tabs.length || !panels.length) return;
  const ids = panels.map((panel) => panel.id);

  const tabStripEl = document.querySelector(".wiki-tabs");
  const show = (id) => {
    tabs.forEach((tab) => {
      const on = tab.getAttribute("href") === "#" + id;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel) => panel.classList.toggle("is-active", panel.id === id));
    const activeTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    if (activeTab && tabStripEl && tabStripEl.scrollWidth > tabStripEl.clientWidth) {
      tabStripEl.scrollTo({ left: activeTab.offsetLeft - (tabStripEl.clientWidth - activeTab.offsetWidth) / 2, behavior: "smooth" });
    }
    snapBoards();
  };

  // A link can point at a panel (#games) or at something inside one (#faq, #bedwars).
  const route = (scrollToTarget) => {
    const hash = decodeURIComponent(location.hash.slice(1));
    const target = hash ? document.getElementById(hash) : null;
    const panel = target ? target.closest(".wiki-panel") : null;
    show(panel ? panel.id : ids[0]);
    if (target && target.tagName === "DETAILS") target.open = true;
    if (scrollToTarget && target && target !== panel) {
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    }
  };

  // Make every board end on a plank line so the wood joins the bottom vines without a visible seam.
  const snapBoards = () => {
    document.querySelectorAll(".board").forEach((board) => {
      const body = board.querySelector(".board-body");
      if (!body || board.hasAttribute("data-static") || board.offsetParent === null) return;
      const k = parseFloat(getComputedStyle(board).getPropertyValue("--k")) || 0.62;
      const unit = 87 * k, offset = 63.5 * k;
      body.style.minHeight = "0px";
      const natural = body.getBoundingClientRect().height;
      body.style.minHeight = (offset + Math.ceil((natural - offset) / unit) * unit).toFixed(2) + "px";
    });
  };
  let snapTimer;
  const snapSoon = () => { clearTimeout(snapTimer); snapTimer = setTimeout(snapBoards, 60); };
  window.addEventListener("resize", snapSoon);
  document.addEventListener("toggle", snapSoon, true);
  document.addEventListener("input", snapSoon);
  window.addEventListener("load", snapBoards);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snapBoards);
  document.querySelectorAll(".shot-frame img").forEach((img) => img.addEventListener("load", snapBoards));

  // Tab strip: add a soft backing once it sticks to the top
  const sentinel = document.querySelector(".tabs-sentinel");
  const wrap = document.querySelector(".wiki-tabs-wrap");
  if (sentinel && wrap && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => wrap.classList.toggle("is-stuck", !entry.isIntersecting && entry.boundingClientRect.top < 0), { rootMargin: "-8px 0px 0px 0px" }).observe(sentinel);
  }

  // Back to top
  const toTop = document.querySelector(".to-top");
  if (toTop) {
    const check = () => toTop.classList.toggle("is-visible", window.scrollY > 700);
    window.addEventListener("scroll", check, { passive: true });
    check();
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const id = tab.getAttribute("href").slice(1);
      history.replaceState(null, "", "#" + id);
      show(id);
      if (tabStrip && tabStrip.getBoundingClientRect().top < 0) tabStrip.scrollIntoView({ block: "start" });
    });
    tab.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = tabs[(index + step + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });
  window.addEventListener("hashchange", () => route(true));
  route(true);

  // Copy the Java address
  document.querySelectorAll(".copy-btn").forEach((button) => {
    const label = button.textContent;
    button.addEventListener("click", async () => {
      const text = button.dataset.copy;
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else {
          const field = document.createElement("textarea");
          field.value = text; field.setAttribute("readonly", ""); field.style.cssText = "position:fixed;opacity:0";
          document.body.append(field); field.select();
          const ok = document.execCommand("copy"); field.remove();
          if (!ok) throw new Error("copy failed");
        }
        button.textContent = "Copied!";
      } catch {
        button.textContent = "Select and copy";
      }
      setTimeout(() => { button.textContent = label; }, 1800);
    });
  });

  // Command filter
  const filter = document.querySelector("#cmd-filter");
  const count = document.querySelector("#cmd-count");
  const groups = [...document.querySelectorAll(".cmd-group")];
  if (filter) {
    const defaults = groups.map((group) => group.open);
    filter.addEventListener("input", () => {
      const query = filter.value.trim().toLowerCase();
      let shown = 0;
      groups.forEach((group, index) => {
        let matches = 0;
        group.querySelectorAll("tbody tr").forEach((row) => {
          const hit = !query || row.textContent.toLowerCase().includes(query);
          row.hidden = !hit;
          if (hit) matches += 1;
        });
        group.hidden = query && !matches;
        group.open = query ? matches > 0 : defaults[index];
        shown += query ? matches : 0;
      });
      count.textContent = query ? (shown ? shown + " found" : "Nothing found. Try another word.") : "";
    });
  }
})();
