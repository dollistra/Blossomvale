import { mcstatusConfig } from "./mcstatus-config.js";

const playerCount = document.querySelector("#players-online");
const allowedEditions = new Set(["java", "bedrock"]);
const refreshInterval = 60000;

async function updatePlayerCount() {
  if (!playerCount) return;
  const address = mcstatusConfig.address.trim();
  const edition = mcstatusConfig.edition.toLowerCase();
  if (!address || !allowedEditions.has(edition)) {
    playerCount.textContent = "—";
    return;
  }

  try {
    const endpoint = `https://api.mcstatus.io/v2/status/${edition}/${encodeURIComponent(address)}${edition === "java" ? "?query=false" : ""}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error(`MCStatus returned ${response.status}`);
    const result = await response.json();
    if (result.online === false) {
      playerCount.textContent = "0";
      return;
    }
    playerCount.textContent = Number.isInteger(result.players?.online)
      ? String(result.players.online)
      : "—";
  } catch (error) {
    console.warn("Could not load the live Minecraft player count:", error);
    playerCount.textContent = "—";
  }
}

updatePlayerCount();
window.setInterval(updatePlayerCount, refreshInterval);
