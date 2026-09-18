import { db } from './firebase-config.js';
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Standard-Spielerliste beim Start
export let PLAYERS = [
  { id: 1, name: 'Spieler 1', score: 0 },
  { id: 2, name: 'Spieler 2', score: 0 }
];

// Spieler in Firebase speichern
export function savePlayers(players) {
  set(ref(db, 'game/players'), players)
    .catch(err => console.error("Fehler beim Speichern der Spieler:", err));
}

// Erstellt Standard-Spieler, falls die Datenbank leer ist
export function seedPlayersIfEmpty() {
  const playersRef = ref(db, 'game/players');
  onValue(playersRef, (snapshot) => {
    if (!snapshot.exists()) {
      savePlayers(PLAYERS);
    }
  }, { onlyOnce: true });
}

// Horcht auf Änderungen an den Spielern (Live-Updates)
export function watchPlayers(callback) {
  const playersRef = ref(db, 'game/players');
  onValue(playersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      PLAYERS = data;
      callback(data);
    }
  });
}

// Horcht auf benutzte Quiz-Felder (Live-Updates)
export function watchUsedCells(callback) {
  const usedRef = ref(db, 'game/usedCells');
  onValue(usedRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || {});
  });
}

// Speichert ein benutztes Quiz-Feld
export function markCellUsed(cellId) {
  set(ref(db, `game/usedCells/${cellId}`), true)
    .catch(err => console.error("Fehler beim Speichern des Feldes:", err));
}
