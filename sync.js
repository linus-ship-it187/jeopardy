// ---- Sync-Helfer: verbindet Board & Punktestand mit der Firebase Realtime Database ----

function cellKey(boardIndex, catIndex, value){
  return boardIndex + '_' + catIndex + '_' + value;
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
  db.ref('players').set(players);
}

// Markiert eine einzelne Zelle als beantwortet.
function markCellUsed(boardIndex, catIndex, value){
  db.ref('usedCells/' + cellKey(boardIndex, catIndex, value)).set(true);
}

// Ruft callback(boardIndex) jedes Mal auf, wenn sich die aktuelle Runde ändert.
function watchCurrentBoard(callback){
  db.ref('currentBoardIndex').on('value', snap => {
    callback(snap.val() || 0);
  });
}

// Schaltet für ALLE (Host + Zuschauer) auf eine andere Runde um.
function setCurrentBoard(index){
  db.ref('currentBoardIndex').set(index);
}
