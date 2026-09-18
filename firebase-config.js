import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  // DEINE ZUGANGSDATEN HIER...
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
