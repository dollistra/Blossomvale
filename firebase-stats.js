import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { doc, getFirestore, onSnapshot } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const requiredConfig = [firebaseConfig.apiKey, firebaseConfig.projectId, firebaseConfig.appId];
const statusLabels = new Set(["online", "offline", "maintenance"]);

function reportUnavailable() {
  window.dispatchEvent(new CustomEvent("blossom:server-stats-error"));
}

function publishStats(data) {
  const restartedAt = data.restartedAt?.toDate instanceof Function
    ? data.restartedAt.toDate()
    : new Date(data.restartedAt);
  if (!statusLabels.has(data.status) ||
      Number.isNaN(restartedAt.getTime())) {
    reportUnavailable();
    return;
  }

  window.dispatchEvent(new CustomEvent("blossom:server-stats", {
    detail: {
      status: data.status,
      restartedAt: restartedAt.toISOString()
    }
  }));
}

if (requiredConfig.some((value) => !value || value.startsWith("PASTE_"))) {
  console.info("Add your Firebase web app config to firebase-config.js to load live server stats.");
  reportUnavailable();
} else {
  const app = initializeApp(firebaseConfig);
  const database = getFirestore(app);
  const statsDocument = doc(database, "siteConfig", "serverStats");

  onSnapshot(statsDocument, (snapshot) => {
    if (!snapshot.exists()) {
      reportUnavailable();
      return;
    }
    publishStats(snapshot.data());
  }, reportUnavailable);
}
