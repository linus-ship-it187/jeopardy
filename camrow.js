// ---- Facecam-Kacheln mit geteilten Kameras über unser eigenes WebRTC ----

const camrow = document.getElementById('camrow');
const camTiles = {}; // playerId -> { tile, nameEl, scoreEl, videoEl, placeholder, camBtn, broadcasting }

function buildTile(p){
  const tile = document.createElement('div');
  tile.className = 'cam-tile';

  const videoWrap = document.createElement('div');
  videoWrap.className = 'cam-video-wrap';

  const placeholder = document.createElement('div');
  placeholder.className = 'cam-placeholder';
  placeholder.textContent = p.name.charAt(0).toUpperCase();

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true; // eigene Vorschau stumm; bei empfangenen Streams unten wieder aufgehoben
  video.playsInline = true;

  const camBtn = document.createElement('button');
  camBtn.className = 'cam-toggle';
  camBtn.textContent = 'Kamera an';

  videoWrap.appendChild(placeholder);
  videoWrap.appendChild(video);
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

  const ref = { tile, nameEl, scoreEl, videoEl: video, placeholder, camBtn, broadcasting: false };

  camBtn.addEventListener('click', async () => {
    if (ref.broadcasting) {
      stopBroadcast();
      video.srcObject && video.srcObject.getTracks().forEach(t => t.stop());
      video.srcObject = null;
      video.style.display = 'none';
      placeholder.style.display = 'flex';
      camBtn.textContent = 'Kamera an';
      ref.broadcasting = false;
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.muted = true;
      video.srcObject = stream;
      video.style.display = 'block';
      placeholder.style.display = 'none';
      camBtn.textContent = 'Kamera aus';
      ref.broadcasting = true;
      startBroadcast(p.id, stream);
    } catch (err) {
      alert('Kamera konnte nicht gestartet werden: ' + err.message);
    }
  });

  return ref;
}

// Zeigt einen empfangenen Stream für playerId an (wird von webrtc.js aufgerufen).
setRemoteVideoResolver(playerId => {
  const ref = camTiles[playerId];
  if (!ref || ref.broadcasting) return null; // eigene Kachel nicht mit Fremd-Stream überschreiben
  ref.placeholder.style.display = 'none';
  ref.videoEl.muted = false;
  return ref.videoEl;
});

// Wenn ein anderer Browser die Übertragung für playerId beendet.
setOnBroadcasterLeft(playerId => {
  const ref = camTiles[playerId];
  if (!ref || ref.broadcasting) return;
  ref.videoEl.srcObject = null;
  ref.videoEl.style.display = 'none';
  ref.placeholder.style.display = 'flex';
});

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
    camTiles[id].nameEl.textContent = p.team ? `${p.name} (${p.team})` : p.name;
    camTiles[id].scoreEl.textContent = p.score;
    camTiles[id].placeholder.textContent = p.name.charAt(0).toUpperCase();
  });
}

watchBroadcasters();
