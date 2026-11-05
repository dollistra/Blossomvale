const layer = document.querySelector(".ambient-petals");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (layer && !reduceMotion) {
  for (let index = 0; index < 60; index += 1) {
    const bloom = document.createElement("span");
    const isSmallScreen = window.innerWidth <= 620;
    const size = isSmallScreen
      ? 8 + ((index * 5) % 10)
      : 11 + ((index * 7) % 18);

    bloom.className = "floating-bloom";
    bloom.style.left = String((index * 37 + 4) % 99) + "%";
    bloom.style.width = String(size) + "px";
    bloom.style.opacity = (0.14 + ((index * 7) % 21) / 100).toFixed(2);
    bloom.style.setProperty("--duration", String(38 + ((index * 11) % 19)) + "s");
    bloom.style.setProperty("--delay", "-" + String((index * 13) % 52) + "s");
    bloom.style.setProperty("--mid-x", String(((index * 17) % 51) - 25) + "px");
    bloom.style.setProperty("--end-x", String(((index * 23) % 31) - 15) + "px");
    layer.appendChild(bloom);
  }
}
