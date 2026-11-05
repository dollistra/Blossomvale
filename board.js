// Boards keep the art's true proportions. Fixed-shape boards (data-fit="w/h") keep their outer box
// and pick the nearest whole number of planks, adjusting the art scale a little instead of stretching it.
(() => {
  const TOP = 195, BOTTOM = 186, OFFSET = 63.5, UNIT = 87;
  const fit = (board, body) => {
    const [a, b] = board.dataset.fit.split("/").map(Number);
    const k0 = parseFloat(board.dataset.k) || 1, slack = parseFloat(board.dataset.slack) || 0;
    const W = board.getBoundingClientRect().width, H = W * b / a;
    const kmin = k0 * 0.45;
    let n = Math.max(0, Math.round((H / k0 - (TOP + BOTTOM + OFFSET)) / UNIT));
    let k = H / (TOP + BOTTOM + OFFSET + UNIT * n);
    for (let i = 0; i < 16; i++, n++) {
      k = H / (TOP + BOTTOM + OFFSET + UNIT * n);
      if (k < kmin) k = kmin; // never shrink the art too much: let the board grow taller instead
      board.style.setProperty("--k", k.toFixed(4));
      body.style.minHeight = "0px";
      const need = body.getBoundingClientRect().height - slack * k;
      const have = (OFFSET + UNIT * n) * k;
      body.style.minHeight = have.toFixed(2) + "px";
      if (have >= need - 0.5) break;
    }
  };
  const snap = (board, body) => {
    const k = parseFloat(getComputedStyle(board).getPropertyValue("--k")) || 0.62;
    const unit = UNIT * k, offset = OFFSET * k;
    body.style.minHeight = "0px";
    const natural = body.getBoundingClientRect().height;
    body.style.minHeight = (offset + Math.ceil((natural - offset) / unit) * unit).toFixed(2) + "px";
  };
  const snapBoards = () => {
    document.querySelectorAll(".board").forEach((board) => {
      const body = board.querySelector(".board-body");
      if (!body || board.offsetParent === null) return;
      if (board.dataset.fit) fit(board, body); else if (!board.hasAttribute("data-static")) snap(board, body);
    });
  };
  let t;
  const soon = () => { clearTimeout(t); t = setTimeout(snapBoards, 60); };
  window.addEventListener("resize", soon);
  window.addEventListener("load", snapBoards);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snapBoards);
  if (document.readyState !== "loading") snapBoards(); else document.addEventListener("DOMContentLoaded", snapBoards);
  window.snapBoards = snapBoards;
})();
