// ---- Namens-/Punkte-Leiste (ohne eigene Kamera-Logik) ----
// Die eigentliche Kamera-Übertragung übernimmt jetzt Jitsi Meet als eigener,
// eingebetteter Video-Call unterhalb dieser Leiste (siehe jitsi.js).

const camrow = document.getElementById('camrow');
const camTiles = {}; // playerId -> { tile, nameEl, scoreEl }

function buildTile(p){
  const tile = document.createElement('div');
  tile.className = 'score-tile';

  const nameEl = document.createElement('span');
  nameEl.className = 'score-tile-name';
  const scoreEl = document.createElement('span');
  scoreEl.className = 'score-tile-score';

  tile.appendChild(nameEl);
  tile.appendChild(scoreEl);

  return { tile, nameEl, scoreEl };
}

function renderCamRow(players){
  const currentIds = new Set(players.map(p => String(p.id)));

  Object.keys(camTiles).forEach(id => {
    if (!currentIds.has(id)) {
      camTiles[id].tile.remove();
      delete camTiles[id];
    }
  });

  players.forEach(p => {
    const id = String(p.id);
    if (!camTiles[id]) {
      camTiles[id] = buildTile(p);
      camrow.appendChild(camTiles[id].tile);
    }
    camTiles[id].nameEl.textContent = p.name;
    camTiles[id].scoreEl.textContent = p.score;
  });
}
