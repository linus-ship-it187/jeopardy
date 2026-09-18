// ---- Sync-Helfer: verbindet Board & Punktestand mit der Firebase Realtime Database ----

function cellKey(catIndex, value){
  return catIndex + '_' + value;
}

// Schreibt die Ausgangs-Spielerliste einmalig in die Datenbank, falls dort noch nichts steht.
function seedPlayersIfEmpty(){
  db.ref('players').once('value').then(snap => {
    if (!snap.exists()) {
      db.ref('players').set(PLAYERS);
    }
  });
}

// Ruft callback(playersArray) jedes Mal auf, wenn sich die Spielerliste in der DB ändert.
function watchPlayers(callback){
  db.ref('players').on('value', snap => {
    const val = snap.val();
    if (val) callback(val);
  });
}

// Ruft callback(usedCellsObject) jedes Mal auf, wenn sich der Board-Status ändert.
function watchUsedCells(callback){
  db.ref('usedCells').on('value', snap => {
    callback(snap.val() || {});
  });
}

// Schreibt die komplette Spielerliste in die Datenbank (überschreibt den alten Stand).
function savePlayers(players){
  return db.ref('players').set(players)
    .then(() => {
      console.log('Spieler erfolgreich gespeichert:', players);
    })
    .catch(err => {
      console.error('Fehler beim Speichern der Spieler:', err);
      alert('Spieler konnte nicht gespeichert werden: ' + err.message);
    });
}
// Markiert eine einzelne Zelle als beantwortet.
function markCellUsed(catIndex, value){
  db.ref('usedCells/' + cellKey(catIndex, value)).set(true);
}
