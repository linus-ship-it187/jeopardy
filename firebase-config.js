// ============================================================
// firebase-config.js
// Firebase Initialisierung (Modular SDK v10)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDoZCuIQ-y785px-X-oaMq1SKnaH1WZTk",
  authDomain: "jeopardyvonflixo.firebaseapp.com",
  databaseURL: "https://jeopardyvonflixo-default-rtdb.firebaseio.com",
  projectId: "jeopardyvonflixo",
  storageBucket: "jeopardyvonflixo.firebasestorage.app",
  messagingSenderId: "372958581592",
  appId: "1:372958581592:web:be20f84b139268af5a8b2d",
  measurementId: "G-5CBWM33M5M"
};

// Firebase App initialisieren
const app = initializeApp(firebaseConfig);

// Realtime Database Instanz exportieren
export const db = getDatabase(app);
