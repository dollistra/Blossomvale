// Edit these values; the Shop page reads them.
window.SHOP_CONFIG = {
  // Where "Discord" links on the Shop page go.
  discord: "https://discord.gg/YCUe6CXVaB",
  // Java address shown in "How it works" (with a Copy button).
  javaAddress: "play.blossomvale.world",
  // Ribbon on the Bloom card. Use "" to hide it. Switch to "Most popular" once you have real sales to back it up.
  ribbons: { bloom: "Best value" },
  // Keep at 0 unless the server is configured to deliver this bonus on every purchase.
  weekendBonusPercent: 0,
  // Optional banner under the hero for a sale or event. Leave text "" for none.
  // ends is optional: "2026-12-31" hides the banner after that day.
  sale: { text: "", ends: "" },
  // Monthly community goal (progress bar). Stays hidden until raised is above 0 (or target is 0).
  goal: { label: "Village Fund", target: 50, raised: 0, currency: "£" },
  // Supporter of the month, by name only. Example: { name: "Willow", rank: "bloom" }. null = hidden
  topSupporter: null,
  // Where each rank's "Continue to checkout" button goes (your Tebex package links, https only). Leave "" until the store is open:
  // the window then says checkout opens when the village opens.
  store: { sprout: "", blossom: "", bloom: "", everbloom: "" },
  // Names on the Supporters wall. rank is one of: "sprout", "blossom", "bloom", "everbloom".
  // Example: { name: "Willow", rank: "bloom" }
  supporters: []
};
