// ---- Facecam-Kacheln über VDO.Ninja ----
// Statt eigenem WebRTC-Signaling betten wir VDO.Ninja unsichtbar per iframe ein.
// VDO.Ninja übernimmt die komplette Video-Übertragung (inkl. funktionierendem
// STUN/TURN) — wir müssen uns um nichts davon mehr kümmern.
//
// Eindeutiger Raumname, damit wir nicht mit fremden VDO.Ninja-Nutzern kollidieren:
const VDO_ROOM = 'jeopardyvonflixo2026';

const camrow = document.getElementById('camrow');
const camTiles = {}; // playerId -> { tile, nameEl, scoreEl, viewFrame, pushFrame, camBtn, broadcasting }

function streamIdFor(playerId){
  return 'p' + playerId + '_' + VDO_ROOM;
}

function buildTile(p){
  const tile = document.createElement('div');
  tile.className = 'cam-tile';

  const videoWrap = document.createElement('div');
  videoWrap.className = 'cam-video-wrap';

  const placeholder = document.createElement('div');
  placeholder.className = 'cam-placeholder';
  placeholder.textContent = p.name.charAt(0).toUpperCase();

  // Zeigt IMMER den Stream dieser Person an, sobald irgendjemand für sie sendet.
  const viewFrame = document.createElement('iframe');
  viewFrame.allow = 'camera; microphone; autoplay; fullscreen';
  viewFrame.style.width = '100%';
  viewFrame.style.height = '100%';
  viewFrame.style.border = 'none';
  viewFrame.style.display = 'none';
  viewFrame.src = `https://vdo.ninja/?view=${streamIdFor(p.id)}&cleanoutput`;

  const camBtn = document.createElement('button');
  camBtn.className = 'cam-toggle';
  camBtn.textContent = 'Kamera an';

  videoWrap.appendChild(placeholder);
  videoWrap.appendChild(viewFrame);
  videoWrap.appendChild(camBtn);

  const footer = document.createElement('div');
  footer.className = 'cam-footer';
  const nameEl = document.createElement('span');
  nameEl.className = 'cam-name';
  const scoreEl = document.createElement('span');
  scoreEl.className = 'cam-score';
  footer.appendChild(nameEl);
  footer.appendChild(scoreEl);

  tile.appendChild(videoWrap);
  tile.appendChild(footer);

  const ref = { tile, nameEl, scoreEl, viewFrame, pushFrame: null, camBtn, broadcasting: false };

  camBtn.addEventListener('click', () => {
    if (ref.broadcasting) {
      if (ref.pushFrame) {
        ref.pushFrame.remove();
        ref.pushFrame = null;
      }
      camBtn.textContent = 'Kamera an';
      ref.broadcasting = false;
      return;
    }
    // Unsichtbarer iframe, der NUR die eigene Kamera einfängt und sendet.
    // Bewusst "normal groß", aber außerhalb des sichtbaren Bereichs platziert —
    // ein 1x1-Pixel-iframe lässt manche Browser das Video pausieren.
    const pushFrame = document.createElement('iframe');
    pushFrame.allow = 'camera; microphone; autoplay';
    pushFrame.style.position = 'fixed';
    pushFrame.style.width = '320px';
    pushFrame.style.height = '240px';
    pushFrame.style.top = '-9999px';
    pushFrame.style.left = '-9999px';
    pushFrame.src = `https://vdo.ninja/?push=${streamIdFor(p.id)}&webcam&cleanoutput`;
    document.body.appendChild(pushFrame);
    ref.pushFrame = pushFrame;
    camBtn.textContent = 'Kamera aus';
    ref.broadcasting = true;
  });

  // Sobald der view-iframe irgendein Bild bekommt, Platzhalter ausblenden.
  // (VDO.Ninja zeigt bei "cleanoutput" nichts an, solange niemand sendet —
  //  wir blenden den iframe daher permanent sichtbar, sobald jemand auf
  //  "Kamera an" klickt ODER sobald wir wissen, dass für diese Person
  //  gerade gesendet wird; siehe unten.)
  return ref;
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
      // View-Frame von Anfang an sichtbar lassen — zeigt automatisch ein Bild,
      // sobald jemand für diesen Platz sendet, sonst bleibt es einfach leer/schwarz
      // und der Platzhalter (Buchstabe) liegt sichtbar darunter.
      camTiles[id].viewFrame.style.display = 'block';
    }
    camTiles[id].nameEl.textContent = p.name;
    camTiles[id].scoreEl.textContent = p.score;
  });
}
