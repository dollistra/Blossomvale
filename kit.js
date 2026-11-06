// The monthly kit as a Minecraft-style chest screen: the kit's chest on top, "your inventory" underneath, the coins and
// keys beside them. Hover or tap an item for its name, click a key to see the other crates it can be for, switch ranks to
// compare, and "Take everything" to watch the stacks move into the inventory the way shift-click does in the game.
// The numbers come from the page itself (#kit-data), so the written list and the chest can never disagree.
//
// Item pictures: small pixel icons drawn for this page. If pictures named like kit-iron_pickaxe.png sit next to this file, those
// are used instead, one by one (see get-kit-icons.bat).
(() => {
  const dataEl = document.getElementById("kit-data");
  const roots = [...document.querySelectorAll("[data-kit]")];
  if (!dataEl || !roots.length) return;
  let DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }
  const RANKS = ["free", "sprout", "blossom", "bloom", "everbloom"];
  const LABEL = { free: "Everyone", sprout: "Sprout", blossom: "Blossom", bloom: "Bloom", everbloom: "Everbloom" };
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- drawing helpers: a 16 x 16 grid, a colour letter per pixel
  const grid = () => Array.from({ length: 16 }, () => Array(16).fill("."));
  const put = (g, x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = c; };
  const line = (g, x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) put(g, Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)), c); };
  const fill = (g, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, c); };
  const ascii = (rows) => rows.map((r) => [...r.padEnd(16, ".")]);
  // material colours: h = main, H = light, d = dark, o = outline
  const MAT = {
    stone: { h: "#9a9a9a", H: "#c4c4c4", d: "#6e6e6e", o: "#3d3d3d" },
    iron: { h: "#d4d8dc", H: "#fbfbfb", d: "#9aa0a6", o: "#464a50" },
    diamond: { h: "#4fe3d6", H: "#c9fff8", d: "#1fa597", o: "#0f4f4a" },
  };
  const WOOD = { s: "#a8743a", S: "#7a5128" };

  // tools: a handle from the bottom left to the top right, and a head that depends on the tool
  const tool = (kind, mat) => {
    const g = grid(), m = MAT[mat];
    const handle = (x0, y0, x1, y1) => { line(g, x0, y0, x1, y1, "s"); line(g, x0 + 1, y0, x1 + 1, y1 + 0, "S"); };
    if (kind === "sword") {
      line(g, 4, 11, 13, 2, "h"); line(g, 5, 11, 13, 3, "d"); line(g, 4, 10, 12, 2, "H");
      line(g, 3, 9, 6, 12, "o"); line(g, 4, 9, 7, 12, "d");                       // guard
      line(g, 2, 13, 4, 11, "s"); put(g, 1, 14, "S"); put(g, 2, 14, "S");            // grip and pommel
      put(g, 14, 1, "o"); line(g, 13, 1, 14, 2, "H");
    } else if (kind === "pickaxe") {
      handle(2, 14, 10, 6);
      line(g, 5, 2, 14, 11, "h"); line(g, 5, 3, 13, 11, "d"); line(g, 6, 2, 13, 9, "H");
      put(g, 4, 3, "h"); put(g, 4, 4, "d"); put(g, 14, 12, "d"); put(g, 13, 12, "d");
    } else if (kind === "axe") {
      handle(2, 14, 11, 5);
      fill(g, 8, 2, 13, 4, "h"); fill(g, 10, 5, 14, 7, "h"); fill(g, 9, 4, 12, 6, "h");
      fill(g, 12, 6, 14, 8, "d"); line(g, 8, 2, 13, 2, "H"); line(g, 9, 3, 13, 3, "H"); put(g, 14, 8, "o");
    } else if (kind === "shovel") {
      handle(2, 14, 10, 6);
      fill(g, 10, 2, 13, 5, "h"); fill(g, 11, 1, 12, 1, "h"); fill(g, 10, 5, 13, 5, "d"); line(g, 10, 2, 13, 2, "H"); put(g, 9, 5, "o");
    }
    const pal = Object.assign({ o: m.o }, WOOD, m);
    return { g, pal };
  };
  const ARMOUR = {
    helmet: ["", "", "....oooooooo....", "...ohhhhhhhho...", "..ohHHHHHHHHdo..", "..ohHhhhhhhHdo..", "..ohHo....oHdo..", "..ohho....ohdo..", "..oooo....oooo.."],
    chestplate: ["", "..ooo......ooo..", "..ohHo....oHdo..", "..ohHhoooohHdo..", "..ohHHHHHHHHdo..", "...ohHHhhHHdo...", "...ohHHhhHHdo...", "...ohHHHHHHdo...", "...ohHHHHHHdo...", "....oooooooo...."],
    leggings: ["", "...oooooooooo...", "...ohHHHHHHdo...", "...ohHhhhhHdo...", "...ohHo..oHdo...", "...ohHo..oHdo...", "...ohHo..oHdo...", "...ohdo..ohdo...", "...oooo..oooo..."],
    boots: ["", "", "", "...oo......oo...", "...ohdo....ohdo..", "...ohdo....ohdo..", "..ohHdo...ohHdo..", "..oooooo..oooooo."],
  };
  const armour = (kind, mat) => ({ g: ascii(ARMOUR[kind]), pal: MAT[mat] });
  const FOOD = {
    steak: { pal: { o: "#4a2412", b: "#8a4a2a", B: "#b0653a", G: "#d78a4e", w: "#f0e4d0" }, g: ascii(["", "", "....oooooo......", "...obBBBBbo.....", "..obBGGGGBbo....", "..oBGbbbbGBo....", "..oBGbwwbGBo....", "..obBGGGGBbo....", "...obBBBBbo.....", "....oooooo......"]) },
    goldencarrot: (() => { const g = grid(); line(g, 3, 12, 11, 4, "y"); line(g, 4, 12, 12, 4, "y"); line(g, 3, 11, 10, 4, "Y"); line(g, 4, 11, 11, 4, "y"); line(g, 5, 12, 12, 5, "d"); line(g, 12, 3, 13, 1, "g"); line(g, 11, 3, 11, 1, "g"); line(g, 13, 4, 15, 3, "g"); put(g, 2, 13, "o"); put(g, 3, 13, "d"); return { g, pal: { y: "#f6d24a", Y: "#fff3a0", d: "#c99a1e", g: "#4f9a3a", o: "#8a6a10" } }; })(),
  };
  const ICONS = {
    stone_pickaxe: () => tool("pickaxe", "stone"), stone_axe: () => tool("axe", "stone"),
    iron_sword: () => tool("sword", "iron"), iron_pickaxe: () => tool("pickaxe", "iron"), iron_axe: () => tool("axe", "iron"), iron_shovel: () => tool("shovel", "iron"),
    diamond_sword: () => tool("sword", "diamond"), diamond_pickaxe: () => tool("pickaxe", "diamond"), diamond_axe: () => tool("axe", "diamond"), diamond_shovel: () => tool("shovel", "diamond"),
    iron_helmet: () => armour("helmet", "iron"), iron_chestplate: () => armour("chestplate", "iron"), iron_leggings: () => armour("leggings", "iron"), iron_boots: () => armour("boots", "iron"),
    steak: () => FOOD.steak, golden_carrot: () => FOOD.goldencarrot,
    shield: () => ({ pal: { o: "#4a4a54", h: "#c8ccd2", b: "#a8743a", B: "#80542a" }, g: ascii(["", "...oooooooooo...", "...ohhhhhhhho...", "...ohbbbbbbho...", "...ohbbhhbbho...", "...ohbhhhhbho...", "...ohbbhhbbho...", "...ohbbbbbbho...", "....ohbbbbho....", ".....ohbbho.....", "......ohho......", ".......oo......."]) }),
    bow: () => { const g = ascii(["", ".....bbb........", "....b...t.......", "...b....t.......", "..b.....t.......", "..b.....t.......", "..b.....t.......", "...b....t.......", "....b...t.......", ".....bbb........"]); return { g, pal: { b: "#8a5a2a", t: "#e8e8e8" } }; },
    arrow: () => { const g = grid(); line(g, 3, 12, 12, 3, "s"); line(g, 13, 2, 14, 1, "t"); put(g, 12, 2, "t"); put(g, 13, 3, "t"); line(g, 2, 13, 3, 12, "w"); line(g, 1, 12, 3, 14, "w"); put(g, 4, 11, "w"); put(g, 2, 11, "w"); put(g, 4, 13, "w"); return { g, pal: { s: "#a8743a", t: "#aab0b8", w: "#f5f5f5" } }; },
    torch: () => ({ pal: { y: "#ffe27a", o: "#f59a2a", c: "#2f2a28", s: "#b98a45", w: "#8a6430" }, g: ascii(["", ".......y........", "......yoy.......", "......yoy.......", ".......o........", ".......cc.......", ".......cc.......", ".......sw.......", ".......sw.......", ".......sw.......", ".......sw.......", ".......sw.......", ".......sw.......", ".......sw......."]) }),
    bonemeal: () => ({ pal: { w: "#f5f2e8", s: "#cfc9b6", o: "#9c9684" }, g: ascii(["", "", "", "", "......oooo......", "....ooswwwoo....", "...oswwwwwwso...", "..oswwwwwwwwso..", "..owwwswwwwwwo..", "..oswwwwwwswwo..", "...owwwwwwwwo...", "....ooswwsoo....", "......oooo......"]) }),
    sapling: (leaf, light, stem) => ({ pal: { L: leaf, l: light, s: stem, d: "#5a3a1a" }, g: ascii(["", ".....LL..LL.....", "....LlLLLlLL....", "...LLlLLLLlLL...", "...LLLLlLLLLL...", "....LLLLLLLL....", ".....LLlLLL.....", "......LLLL......", ".......ss.......", ".......ss.......", ".......ss.......", ".......sd.......", "......ddsd......"]) }),
    cherry: () => ICONS.sapling("#e58fc0", "#f7bddc", "#7a5628"),
    oak: () => ICONS.sapling("#4f9a3a", "#7cc45a", "#7a5628"),
    lantern: () => ({ pal: { i: "#4a4a54", b: "#2e2e36", y: "#f7c85a", Y: "#fff0a8" }, g: ascii(["", "", ".......ii.......", "......i..i......", ".....iiiiii.....", ".....ibbbbi.....", ".....iyyyyi.....", ".....iyYYyi.....", ".....iyYYyi.....", ".....iyyyyi.....", ".....ibbbbi.....", ".....iiiiii....."]) }),
    honey: () => ({ pal: { g: "#a9d3e0", c: "#b98a45", a: "#e8a12b", A: "#f8cf62" }, g: ascii(["", "", "......cccc......", "......cccc......", ".......gg.......", ".....gggggg.....", "....gaaaaaag....", "....gaAAaaag....", "....gaAaaaag....", "....gaaaaaag....", "....gaaaaAag....", ".....gggggg....."]) }),
    cake: () => ({ pal: { w: "#fbf7ef", r: "#d94a4a", j: "#e66a6a", b: "#d9a066", B: "#b27a44", k: "#6b4a2a" }, g: ascii(["", "", "", "", ".....r...r......", "...wwwwwwwwww...", "...wwwwwwwwww...", "...jjjjjjjjjj...", "...bbbbbbbbbb...", "...bBbbbbBbbb...", "...bbbbbbbbbb...", "...kkkkkkkkkk..."]) }),
    iron_ingot: () => ({ pal: MAT.iron, g: ascii(["", "", "", "....oooooooooo..", "...oHHHHHHhhhdo.", "..oHHhhhhhhhddo.", ".oddddddddddddo.", ".oooooooooooooo."]) }),
    gold_ingot: () => ({ pal: { o: "#7a5a12", h: "#f2c14e", H: "#fff0a8", d: "#c8962a" }, g: ascii(["", "", "", "....oooooooooo..", "...oHHHHHHhhhdo.", "..oHHhhhhhhhddo.", ".oddddddddddddo.", ".oooooooooooooo."]) }),
    diamond: () => ({ pal: MAT.diamond, g: ascii(["", "...oooooooooo...", "..oHHhhhhhhhdo..", ".oHhhhhhhhhhhdo.", ".ohhhhhhhhhhddo.", "..ohhhhhhhhddo..", "...ohhhhhhddo...", "....ohhhhddo....", ".....ohhddo.....", "......ohdo......", ".......oo......."]) }),
    emerald: () => ({ pal: { o: "#0b4a1f", h: "#2ed36b", H: "#a8f5c4", d: "#13954a" }, g: ascii(["", "", ".....oooooo.....", "....oHHhhhho....", "...oHhhhhhhdo...", "...ohhhhhhhdo...", "...ohhhhhhhdo...", "...ohhhhhhddo...", "...odhhhhhddo...", "....oddddddo....", ".....oooooo....."]) }),
    coal: () => ({ pal: { o: "#141414", h: "#3a3a3a", H: "#6e6e6e", d: "#222222" }, g: ascii([".", ".....oooooo.....", "...ooHHhhhhoo...", "..oHHhhhhhhhho..", ".ohhhhhHhhhhhdo.", ".ohhhhhhhhhhhdo.", ".ohhHhhhhhhhddo.", "..ohhhhhhhhddo..", "...oodddddddoo..", ".....oooooo....."]) }),
    lapis: () => ({ pal: { o: "#12296b", h: "#2f5fd0", H: "#8fb0ff", d: "#1c3f9a" }, g: ascii([".", ".....oooooo.....", "...ooHHhhhhoo...", "..oHHhhhhhhhho..", ".ohhhhhHhhhhhdo.", ".ohhhhhhhhHhhdo.", ".ohhHhhhhhhhddo.", "..ohhhhhhhhddo..", "...oodddddddoo..", ".....oooooo....."]) }),
    xp: () => ({ pal: { c: "#b98a45", s: "#cfe8ef", G: "#7be04a", L: "#d4ff9a" }, g: ascii(["", "", "......cccc......", "......cccc......", ".......ss.......", "......sGGs......", ".....sGLGGs.....", "....sGGLGGGs....", "....sGGGGGGs....", "....sGGGGGGs....", ".....sGGGGs.....", "......ssss......"]) }),
    redstone: () => ({ pal: { o: "#5a0f0f", R: "#d62828", r: "#ff6a5a" }, g: ascii(["", "", "", ".....oo..oo.....", "....oRRooRRo....", "...oRrRRRrRRo...", "..oRRRrRRRRRro..", "..oRrRRRRrRRRo..", "...oRRRRRrRRo...", "....ooRRRRoo....", ".....oooooo....."]) }),
    coin: () => ({ pal: { k: "#6b4a0e", s: "#e0a92f", Y: "#fff3b0", r: "#b9801c", y: "#f6cb55", e: "#c8941f" }, g: ascii(["................", ".....kkkkkk.....", "...kkYYYYYskk...", "..kkYYYyyysskk..", "..kYYYyeeyyysk..", ".kYYYyeYYeyyssk.", ".kYYyeYYYyeyyrk.", ".kYyeYYYyyyeyrk.", ".kYyeYYyyyreyrk.", ".kYyyeyyyreyyrk.", ".kssyyeyreyyrrk.", "..ksyyyeeyyyrk..", "..kkssyyyyrrkk..", "...kksrrrrrkk...", ".....kkkkkk.....", "................"]) }),
    key: () => ({ pal: {"k": "#2f2433", "m": "#ffffff", "h": "#ffffff", "d": "#c9c9d6"}, g: ascii(["................", "...kkkk.........", "..khhhmk........", ".khhhmmmk.......", ".khh..mdk.......", ".khm..ddk.......", ".kmmmhmdk.......", "..kmddhmdk......", "...kkkkhmdk.....", ".......khmdk....", "......kkkhmdk...", "......kmdkhmdk..", "......kmdkkhmdk.", "......kkkmdkhmdk", "........kmdkkkkk", "........kkkk...."]) }),
  };

  // ---- redstone gear and shulker boxes (drawn stand-ins; the real pictures replace them when the kit-*.png pictures are there)
  const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const TOP = [[8, 1], [15, 4.5], [8, 8], [1, 4.5]], LEFT = [[1, 4.5], [8, 8], [8, 15], [1, 11.5]], RIGHT = [[8, 8], [15, 4.5], [15, 11.5], [8, 15]];
  const faceAt = (x, y) => (inPoly(x + 0.5, y + 0.5, TOP) ? "t" : inPoly(x + 0.5, y + 0.5, LEFT) ? "l" : inPoly(x + 0.5, y + 0.5, RIGHT) ? "r" : null);
  // a little isometric block: pal has t (top), l (left), r (right), o (outline); accent(face, x, y) can pick another colour key
  const cube = (pal, accent) => {
    const g = grid();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const f = faceAt(x, y); if (!f) continue;
      const edge = !faceAt(x - 1, y) || !faceAt(x + 1, y) || !faceAt(x, y - 1) || !faceAt(x, y + 1);
      g[y][x] = edge ? "o" : (accent && accent(f, x, y)) || f;
    }
    return { g, pal };
  };
  const rail = (rc, plate) => { const g = grid(); for (let y = 1; y < 15; y++) { put(g, 4, y, "r"); put(g, 11, y, "r"); if (y % 3 === 0) fill(g, 5, y, 10, y, "s"); } if (plate) fill(g, 6, 6, 9, 9, plate); return { g, pal: { r: rc, s: "#8a6430", p: "#7a7a7a", q: "#d62828" } }; };
  const SHULK = {
    lime: { L: "#9be05a", D: "#6aa83a", B: "#7fc447", d: "#58882f", c: "#f0f4c0", o: "#2f4a1a" },
    purple: { L: "#b58de0", D: "#8a64b8", B: "#9c74d0", d: "#6e4e98", c: "#efe4ff", o: "#3a2858" },
    pink: { L: "#f4a7d2", D: "#c97aa6", B: "#e68fc0", d: "#a85e86", c: "#ffe3f1", o: "#5a2a44" },
    yellow: { L: "#f6d860", D: "#c9a830", B: "#e8c444", d: "#a8861c", c: "#fff3b0", o: "#5a4410" },
  };
  const shulker = (c) => ({ pal: SHULK[c], g: ascii(["", "", "", "..oooooooooooo..", ".oLLLLLLLLLLLLo.", ".oLLLLLLLLLLLLo.", ".oDDDDDDDDDDDDo.", ".oBBBBBccBBBBBo.", ".oBBBBBccBBBBBo.", ".oBBBBBBBBBBBBo.", ".oBBBBBBBBBBBBo.", ".oBBBBBBBBBBBBo.", ".oddddddddddddo.", "..oooooooooooo.."]) });
  const stoneC = { t: "#a8a8a8", l: "#8a8a8a", r: "#6a6a6a", o: "#2e2e2e", A: "#a8743a", B: "#252525", R: "#d62828", W: "#efe9d8", Y: "#f6e27a" };
  Object.assign(ICONS, {
    redstone_torch: () => ({ pal: { y: "#ff8a7a", o: "#d62828", c: "#5a0f0f", s: "#b98a45", w: "#8a6430" }, g: ICONS.torch().g }),
    lever: () => ({ pal: { c: "#8a8a8a", C: "#6e6e6e", s: "#a8743a" }, g: ascii(["", "", "", "......ss........", ".......ss.......", "........s.......", "...ccccccccc....", "..cCcCcCcCcCc...", "..cccccccccccc.."]) }),
    repeater: () => ({ pal: { o: "#4a4a4a", S: "#9a9a9a", r: "#ff5a4a" }, g: ascii(["", "", "", "", "", "", ".ooooooooooooo..", ".oSSSSSSSSSSSo..", ".oSSrSSSSrSSSo..", ".oSSrSSSSrSSSo..", ".oSSSSSSSSSSSo..", ".ooooooooooooo.."]) }),
    comparator: () => ({ pal: { o: "#4a4a4a", S: "#9a9a9a", r: "#ff5a4a" }, g: ascii(["", "", "", "", "", "", ".ooooooooooooo..", ".oSSSSSSSSSSSo..", ".oSSrSSrSSrSSo..", ".oSSrSSrSSrSSo..", ".oSSSSSSSSSSSo..", ".ooooooooooooo.."]) }),
    hopper: () => ({ pal: { o: "#2a2a2a", H: "#7a7a7a", d: "#3a3a3a" }, g: ascii(["", "", "..oooooooooooo..", "..oHHHHHHHHHHo..", "..oHddddddddHo..", "...oHHHHHHHHo...", "....oHHHHHHo....", ".....oHHHHo.....", ".....ooHHoo.....", "......oHHo......", "......oooo......"]) }),
    stone_button: () => ({ pal: { o: "#3a3a3a", H: "#b0b0b0", h: "#8a8a8a" }, g: ascii(["", "", "", "", "", "....oooooooo....", "...oHHHHHHHHo...", "...ohhhhhhhho...", "....oooooooo...."]) }),
    powered_rail: () => rail("#e6b730", "#d62828"), detector_rail: () => rail("#9a9a9a", "#7a7a7a"),
    piston: () => cube(Object.assign({}, stoneC, { t: "#c9a063", l: "#8a8a8a", r: "#6a6a6a" }), (f, x, y) => (f !== "t" && y < 9 ? "A" : null)),
    sticky_piston: () => cube(Object.assign({}, stoneC, { t: "#7fc447", l: "#8a8a8a", r: "#6a6a6a" }), (f, x, y) => (f !== "t" && y < 9 ? "A" : null)),
    observer: () => cube(stoneC, (f, x, y) => (f === "l" && x >= 3 && x <= 5 && y >= 8 && y <= 10 ? "B" : f === "r" && x >= 10 && x <= 11 && y >= 8 && y <= 9 ? "R" : null)),
    dropper: () => cube(stoneC, (f, x, y) => (f === "l" && x >= 3 && x <= 6 && y >= 8 && y <= 11 ? "B" : null)),
    dispenser: () => cube(stoneC, (f, x, y) => (f === "l" && x >= 3 && x <= 6 && y >= 8 && y <= 11 ? "B" : f === "l" && x === 4 && y >= 9 && y <= 10 ? "W" : null)),
    slime_block: () => cube({ t: "#8fe06a", l: "#6cc24a", r: "#52a238", o: "#2f6a1f" }),
    honey_block: () => cube({ t: "#f6b83a", l: "#e89a1e", r: "#c47a12", o: "#7a4a0a" }),
    note_block: () => cube({ t: "#b98a55", l: "#a8743a", r: "#80542a", o: "#3d2a14", B: "#3d2a14" }, (f, x, y) => (f === "l" && x === 4 && y === 10 ? "B" : f === "r" && x === 11 && y === 10 ? "B" : null)),
    target: () => cube({ t: "#f0ece0", l: "#d9d4c4", r: "#b8b2a0", o: "#5a4a40", R: "#d62828" }, (f, x, y) => (f === "t" && ((x >= 6 && x <= 9 && y >= 4 && y <= 5) ? "R" : null))),
    redstone_lamp: () => cube({ t: "#c98a4a", l: "#b87a3a", r: "#90602c", o: "#4a2e14", Y: "#f6d27a" }, (f, x, y) => (f !== "t" && x % 3 === 1 && y % 3 === 1 ? "Y" : null)),
    daylight_detector: () => cube({ t: "#6a5a4a", l: "#a8743a", r: "#80542a", o: "#3d2a14", Y: "#d8c8a8" }, (f, x, y) => (f === "t" && (x + y) % 3 === 0 ? "Y" : null)),
    box_lime: () => shulker("lime"), box_purple: () => shulker("purple"), box_pink: () => shulker("pink"), box_yellow: () => shulker("yellow"),
  });
  const svgCache = {};
  const icon = (id, tint) => {
    const key = id + "|" + (tint || "");
    if (svgCache[key]) return svgCache[key];
    const make = ICONS[id]; if (!make) return "";
    const def = make(), pal = Object.assign({}, def.pal);
    if (tint) {
      // the crate colour paints the key; lighter and darker versions of it give the key its shine and shade
      const t = tint.replace("#", ""), n = [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16));
      const mix = (w, a) => "#" + n.map((c) => Math.round(c * (1 - a) + w * a).toString(16).padStart(2, "0")).join("");
      pal.m = tint; pal.h = mix(255, 0.55); pal.d = mix(0, 0.35);
    }
    let r = "";
    def.g.forEach((row, y) => row.forEach((c, x) => { if (c !== "." && pal[c]) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${pal[c]}"/>`; }));
    return (svgCache[key] = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${r}</svg>`);
  };

  // ---- optional real pictures (kit-<name>.png). Checked once; a missing one just keeps the drawn icon.
  let texReady = null;     // null = not asked, a promise afterwards
  const texProbe = () => texReady || (texReady = new Promise((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = "./kit-iron_pickaxe.png"; }));
  const applyTextures = (scope) => {
    const slots = [...scope.querySelectorAll("[data-tex],[data-cube],[data-shulker]")]; if (!slots.length) return;
    texProbe().then((ok) => { if (!ok) return; slots.forEach((s) => {
      if (!s.isConnected) return;
      if (s.dataset.shulker) {   // a shulker box: the game draws it from its model, so cut the lid and base out of the colour's texture
        const name = s.dataset.shulker, im = new Image();
        im.onload = () => {
          if (!s.isConnected) return; const old = s.querySelector("svg"); if (!old) return;
          const piece = (rx, ry, rw, rh, m) => `<g transform="matrix(${m})"><svg x="0" y="0" width="${rw}" height="${rh}" viewBox="${rx} ${ry} ${rw} ${rh}" preserveAspectRatio="none" overflow="hidden"><image href="./kit-${name}.png" width="64" height="64" style="image-rendering:pixelated"/></svg></g>`;
          const iso = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          iso.setAttribute("viewBox", "0 0 16 16"); iso.setAttribute("class", "kit-tex kit-iso"); iso.setAttribute("aria-hidden", "true");
          iso.innerHTML = piece(16, 0, 16, 16, ".4375 .21875 -.4375 .21875 8 1")                       // lid top
            + piece(16, 16, 16, 12, ".4375 .21875 0 .4375 1 4.5") + piece(16, 48, 16, 4, ".4375 .21875 0 .4375 1 9.75")    // front: lid, then the base below it
            + piece(32, 16, 16, 12, ".4375 -.21875 0 .4375 8 8") + piece(32, 48, 16, 4, ".4375 -.21875 0 .4375 8 13.25")  // side: lid, then the base
            + '<polygon points="1,4.5 8,8 8,15 1,11.5" fill="#000" opacity=".2"/><polygon points="8,8 15,4.5 15,11.5 8,15" fill="#000" opacity=".4"/>';
          old.replaceWith(iso);
        };
        im.src = "./kit-" + name + ".png";
        return;
      }
      if (s.dataset.cube) {   // a block: draw it as the game does, three faces seen from above
        const names = s.dataset.cube.split(","), t = names[0], l = names[1], r = names[2];
        Promise.all([...new Set(names)].map((n) => new Promise((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = "./kit-" + n + ".png"; }))).then((all) => {
          if (!all.every(Boolean) || !s.isConnected) return;
          const img = (n, m) => `<image href="./kit-${n}.png" width="16" height="16" transform="matrix(${m})" style="image-rendering:pixelated"/>`;
          const old = s.querySelector("svg"); if (!old) return;
          const iso = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          iso.setAttribute("viewBox", "0 0 16 16"); iso.setAttribute("class", "kit-tex kit-iso"); iso.setAttribute("aria-hidden", "true");
          iso.innerHTML = img(t, ".4375 .21875 -.4375 .21875 8 1") + img(l, ".4375 .21875 0 .4375 1 4.5") + img(r, ".4375 -.21875 0 .4375 8 8") + '<polygon points="1,4.5 8,8 8,15 1,11.5" fill="#000" opacity=".22"/><polygon points="8,8 15,4.5 15,11.5 8,15" fill="#000" opacity=".42"/>';
          old.replaceWith(iso);
        });
        return;
      }
      const i = new Image(); i.alt = ""; i.draggable = false; i.className = "kit-tex"; i.onload = () => { const old = s.querySelector("svg"); if (old) old.replaceWith(i); }; i.src = "./kit-" + s.dataset.tex + ".png";
    }); });
  };

  const ITEMS = DATA.items;           // id -> { name, max, icon, tex, about }
  const CRATES = DATA.crates;         // id -> { name, colour, about }
  const money = (n) => "$" + n.toLocaleString("en-GB");
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
  const stacksOf = (kit) => {          // whole stacks, like the game splits them
    const out = [];
    kit.items.forEach(([id, amount]) => {
      const it = ITEMS[id]; if (!it) return;
      for (let left = amount; left > 0; left -= it.max) out.push({ id, n: Math.min(left, it.max), total: amount });
    });
    return out;
  };

  let uidCount = 0;
  roots.forEach((root) => {
    let current = root.dataset.rank in DATA.kits ? root.dataset.rank : "sprout";
    const own = current;
    const choice = {};
    const uid = "kit" + (++uidCount);
    const tabs = el("div", "kit-tabs"); tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "Compare monthly kits");
    const box = el("div", "kit-box"), chest = el("div", "kit-chest");
    const tip = el("div", "kit-tip"); tip.id = uid + "-tip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
    const foot = el("div", "kit-foot");
    root.textContent = "";
    root.append(tabs, box, foot);
    box.append(chest, tip);

    RANKS.forEach((r) => {
      const b = el("button", "kit-tab r-" + r, LABEL[r]); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.r = r;
      b.addEventListener("click", () => { current = r; draw(); });
      b.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault(); const n = RANKS[(RANKS.indexOf(r) + (e.key === "ArrowRight" ? 1 : RANKS.length - 1)) % RANKS.length];
        current = n; draw(); tabs.querySelector(`[data-r="${n}"]`).focus();
      });
      tabs.appendChild(b);
    });

    const show = (slot, lines) => {
      tip.textContent = "";
      lines.forEach((l, i) => { const d = el("div", i === 0 ? "kit-tip-name" : "kit-tip-line", l.text || l); if (l && l.colour) d.style.color = l.colour; tip.appendChild(d); });
      tip.hidden = false;
      const b = box.getBoundingClientRect(), s = slot.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      let x = s.left - b.left + s.width / 2 - tw / 2, y = s.top - b.top - th - 8;
      if (y < -70) y = s.bottom - b.top + 8;
      tip.style.left = Math.max(4, Math.min(x, b.width - tw - 4)) + "px"; tip.style.top = y + "px";
    };
    const hide = () => { tip.hidden = true; };
    const slotEl = (inner, label, tipLines, cls) => {
      const s = el("button", "kit-slot" + (cls ? " " + cls : "")); s.type = "button"; s.setAttribute("aria-label", label); s.setAttribute("aria-describedby", uid + "-tip");
      s.innerHTML = inner;
      s.addEventListener("mouseenter", () => show(s, tipLines())); s.addEventListener("focus", () => show(s, tipLines()));
      s.addEventListener("mouseleave", hide); s.addEventListener("blur", hide);
      return s;
    };
    const emptySlot = (cls) => { const s = el("div", "kit-slot empty" + (cls ? " " + cls : "")); s.setAttribute("aria-hidden", "true"); return s; };
    const boxStacks = (it) => stacksOf({ items: it.box });
    const itemSlot = (st, i, inside) => {
      const it = ITEMS[st.id];
      const s = slotEl(icon(it.icon) + (st.n > 1 ? `<span class="kit-n">${st.n}</span>` : ""), `${st.n} ${it.name}`,
        () => it.box
          ? [it.name, { text: it.about, colour: "#b8b8c8" }, { text: `Holds ${boxStacks(it).length} stacks of redstone gear`, colour: "#8a7ab8" }]
          : [it.name, { text: it.about, colour: "#b8b8c8" }, { text: inside ? (st.n === st.total ? "In the box" : `In the box: ${st.total} in total`) : st.n === st.total ? "Monthly kit" : `Monthly kit: ${st.total} in total`, colour: "#8a7ab8" }]);
      if (it.tex) s.dataset.tex = it.tex;
      if (it.cube) s.dataset.cube = it.cube.join(",");
      if (it.shulker) s.dataset.shulker = it.shulker;
      if (it.box) { s.classList.add("kit-has-box"); s.setAttribute("aria-haspopup", "true"); s.addEventListener("click", () => openBox(st)); }
      s.style.setProperty("--i", String(i));
      return s;
    };

    // a shulker box in the kit: click it to see what is inside, like opening it in the game
    function openBox(st) {
      const it = ITEMS[st.id], old = chest.querySelector(".kit-boxpanel"), same = old && old.dataset.id === st.id;
      if (old) old.remove();
      if (same) return;
      const panel = el("div", "kit-boxpanel kit-box-" + it.colour); panel.dataset.id = st.id;
      const head = el("div", "kit-boxhead");
      head.appendChild(el("div", "kit-title", it.name + ": inside"));
      const close = el("button", "kit-boxclose", "Close"); close.type = "button"; close.addEventListener("click", () => panel.remove());
      head.appendChild(close);
      const g = el("div", "kit-grid"), cs = boxStacks(it);
      for (let k = 0; k < 27; k++) g.appendChild(cs[k] ? itemSlot(cs[k], k, true) : emptySlot());
      panel.append(head, g, el("div", "kit-boxnote", `${cs.length} of 27 slots used, ${cs.reduce((a, c) => a + c.n, 0).toLocaleString("en-GB")} items.`));
      chest.querySelector(".kit-grid").after(panel);
      applyTextures(panel);
    }

    function draw() {
      const kit = DATA.kits[current], stacks = stacksOf(kit);
      tabs.querySelectorAll(".kit-tab").forEach((b) => { const on = b.dataset.r === current; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; b.classList.toggle("mine", b.dataset.r === own); });
      chest.textContent = ""; hide(); chest.classList.remove("taken");
      chest.appendChild(el("div", "kit-title", (current === "free" ? "Everyone's" : LABEL[current]) + " Monthly Kit"));
      const chestGrid = el("div", "kit-grid"), rows = Math.max(2, Math.ceil(stacks.length / 9));
      const chestSlots = [];
      for (let i = 0; i < rows * 9; i++) {
        const st = stacks[i];
        if (!st) { chestGrid.appendChild(emptySlot()); continue; }
        const s = itemSlot(st, i); chestSlots.push(s); chestGrid.appendChild(s);
      }
      chest.appendChild(chestGrid);

      // your inventory: three rows and the hotbar, empty until you take the kit
      chest.appendChild(el("div", "kit-title kit-title-inv", "Inventory"));
      const invGrid = el("div", "kit-grid"), hotbar = el("div", "kit-grid kit-hotbar");
      const inv = [];
      for (let i = 0; i < 36; i++) { const s = emptySlot(); inv.push(s); (i < 27 ? invGrid : hotbar).appendChild(s); }
      chest.append(invGrid, hotbar);

      const extras = el("div", "kit-extras");
      extras.appendChild(el("div", "kit-extras-label", "Also in your kit (goes straight to your account)"));
      const row = el("div", "kit-extras-row");
      const coin = slotEl(icon("coin"), money(kit.coins) + " coins", () => [money(kit.coins) + " coins", { text: "To spend in the village. Arrives wherever you type /monthly.", colour: "#b8b8c8" }], "kit-coin");
      coin.insertAdjacentHTML("beforeend", `<span class="kit-n kit-n-wide">${kit.coins >= 1000 ? kit.coins / 1000 + "k" : kit.coins}</span>`);
      row.appendChild(coin);
      const cs = kit.crates;
      for (let k = 0; k < kit.keys; k++) {
        const ck = current + ":" + k, cr = () => CRATES[cs[(choice[ck] || 0) % cs.length]];
        const lines = (extra) => { const c = cr(); return [{ text: c.name + " Key", colour: c.colour }, { text: "Opens the " + c.name + ": " + c.about.toLowerCase() + ".", colour: "#b8b8c8" }, { text: extra, colour: "#8a7ab8" }]; };
        const s = slotEl("", "Monthly key", () => lines(cs.length > 1 ? `You choose this key's crate when you type /monthly (${cs.length} choices). Click to look at the others.` : "Use it at the crate stall and pick the exact piece you want."), "kit-key");
        const paint = () => { const cid = cs[(choice[ck] || 0) % cs.length]; s.innerHTML = `<img class="kit-keyimg" src="./kit-key-${cid}.png?v=1" alt="" draggable="false">`; s.setAttribute("aria-label", cr().name + " Key" + (cs.length > 1 ? ", one of " + cs.length + " choices" : "")); };
        paint();
        if (cs.length > 1) s.addEventListener("click", () => { choice[ck] = (choice[ck] || 0) + 1; paint(); show(s, lines(`Choice ${(choice[ck] % cs.length) + 1} of ${cs.length}. Click again for the next.`)); });
        row.appendChild(s);
      }
      if (!kit.keys) row.appendChild(el("span", "kit-nokey", "No key (ranks get one every month)"));
      extras.appendChild(row);
      chest.appendChild(extras);
      applyTextures(chest);

      foot.textContent = "";
      const items = stacks.reduce((a, s) => a + s.n, 0);
      foot.appendChild(el("p", "kit-sum", `${items} items in ${stacks.length} ${stacks.length === 1 ? "stack" : "stacks"}, ${money(kit.coins)}` + (kit.keys ? `, ${kit.keys} crate ${kit.keys === 1 ? "key" : "keys"}` : "") + "."));
      const take = el("button", "kit-take", "Take everything"); take.type = "button";
      let timers = [];
      take.addEventListener("click", () => {
        if (chest.classList.contains("taken")) { timers.forEach(clearTimeout); draw(); return; }
        chest.classList.add("taken"); hide(); take.textContent = "Fill it again";
        // shift-click moves stacks into the hotbar first (right to left), then the inventory from the bottom up
        chestSlots.forEach((s, k) => {
          const move = () => {
            const target = inv[35 - k]; if (!target) return;
            const src = s.cloneNode(true);
            target.replaceWith(src); inv[35 - k] = src;
            src.classList.add("arrived");
            const st = stacks[Number(s.style.getPropertyValue("--i"))]; if (st && ITEMS[st.id].box) src.addEventListener("click", () => openBox(st)); if (st) { src.addEventListener("mouseenter", () => show(src, [ITEMS[st.id].name, { text: ITEMS[st.id].about, colour: "#b8b8c8" }])); src.addEventListener("focus", () => show(src, [ITEMS[st.id].name, { text: ITEMS[st.id].about, colour: "#b8b8c8" }])); src.addEventListener("mouseleave", hide); src.addEventListener("blur", hide); }
            s.classList.add("gone");
          };
          if (reduce) move(); else timers.push(setTimeout(move, 70 * k));
        });
      });
      foot.appendChild(take);
      if (current !== own) foot.appendChild(el("p", "kit-note", `You're looking at ${current === "free" ? "the free kit" : "the " + LABEL[current] + " kit"}. Your rank's kit is the ${LABEL[own]} tab.`));
      else foot.appendChild(el("p", "kit-note kit-fine", "Tools and armour arrive new, never enchanted. Items arrive on the SMP; coins and keys arrive wherever you type /monthly."));
    }
    draw();
    root.addEventListener("click", (e) => { if (!e.target.closest(".kit-slot")) hide(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !tip.hidden) hide(); });
    const dlg = root.closest("dialog");
    if (dlg) dlg.addEventListener("close", () => { current = own; draw(); });
  });
  document.querySelectorAll(".rd-textkit").forEach((d) => { d.open = false; });
})();
