// ---- Echte Video-Übertragung zwischen den Browsern (WebRTC), Firebase nur zur Vermittlung ----
console.log('[WebRTC] webrtc.js DEBUG-Version geladen, meine peerId wird gleich erzeugt...');

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const myPeerId = 'p_' + Math.random().toString(36).slice(2, 10);

let getRemoteVideoEl = null;   // wird von der Seite gesetzt: (playerId) => <video> oder null
let onBroadcasterLeft = null;  // wird von der Seite gesetzt: (playerId) => void

const viewerConnections = {};    // broadcasterPeerId -> RTCPeerConnection (ich schaue zu)
const broadcastConnections = {}; // viewerPeerId -> RTCPeerConnection (ich sende)
let localStream = null;
let broadcastingPlayerId = null;
const peerIdToPlayerId = {};

function setRemoteVideoResolver(fn){ getRemoteVideoEl = fn; }
function setOnBroadcasterLeft(fn){ onBroadcasterLeft = fn; }

// Muss einmal aufgerufen werden, damit man eingehende Streams anderer empfängt.
function watchBroadcasters(){
  db.ref('webrtc/peers').on('child_added', snap => {
    const peerId = snap.key;
    const data = snap.val();
    if (!data || peerId === myPeerId || viewerConnections[peerId]) return;
    peerIdToPlayerId[peerId] = data.playerId;
    connectAsViewer(peerId, data.playerId);
  });

  db.ref('webrtc/peers').on('child_removed', snap => {
    const peerId = snap.key;
    const playerId = peerIdToPlayerId[peerId];
    if (viewerConnections[peerId]) {
      viewerConnections[peerId].close();
      delete viewerConnections[peerId];
    }
    if (playerId && typeof onBroadcasterLeft === 'function') {
      onBroadcasterLeft(playerId);
    }
  });
}

function connectAsViewer(broadcasterPeerId, playerId){
  console.log('[WebRTC] Verbinde als Zuschauer zu', broadcasterPeerId, 'playerId', playerId);
  const pc = new RTCPeerConnection(ICE_SERVERS);
  viewerConnections[broadcasterPeerId] = pc;
  pc.addTransceiver('video', { direction: 'recvonly' });

  pc.oniceconnectionstatechange = () => {
    console.log('[WebRTC][Viewer] ICE-Status:', pc.iceConnectionState, 'für', broadcasterPeerId);
  };
  pc.onconnectionstatechange = () => {
    console.log('[WebRTC][Viewer] Verbindungsstatus:', pc.connectionState, 'für', broadcasterPeerId);
  };

  pc.ontrack = (event) => {
    console.log('[WebRTC][Viewer] Track empfangen von', broadcasterPeerId, event.streams[0]);
    const videoEl = getRemoteVideoEl && getRemoteVideoEl(playerId);
    console.log('[WebRTC][Viewer] Video-Element gefunden?', !!videoEl, 'für playerId', playerId);
    if (videoEl) {
      videoEl.srcObject = event.streams[0];
      videoEl.style.display = 'block';
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('[WebRTC][Viewer] Eigener ICE-Kandidat gefunden, sende an Broadcaster');
      db.ref(`webrtc/signals/${broadcasterPeerId}/iceFromViewer/${myPeerId}`).push(event.candidate.toJSON());
    }
  };

  pc.createOffer()
    .then(offer => pc.setLocalDescription(offer))
    .then(() => {
      console.log('[WebRTC][Viewer] Sende Offer an', broadcasterPeerId);
      db.ref(`webrtc/signals/${broadcasterPeerId}/offersFromViewers/${myPeerId}`)
        .set(pc.localDescription.toJSON());
    })
    .catch(err => console.error('[WebRTC][Viewer] Fehler beim Erstellen des Offers:', err));

  db.ref(`webrtc/signals/${broadcasterPeerId}/answersToViewers/${myPeerId}`).on('value', snap => {
    const answer = snap.val();
    if (answer && pc.currentRemoteDescription === null) {
      console.log('[WebRTC][Viewer] Antwort erhalten von', broadcasterPeerId);
      pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(err => {
        console.error('[WebRTC][Viewer] Fehler beim Setzen der Antwort:', err);
      });
    }
  });

  db.ref(`webrtc/signals/${broadcasterPeerId}/iceFromBroadcaster/${myPeerId}`).on('child_added', snap => {
    const candidate = snap.val();
    if (candidate) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
  });
}

// Aufrufen, sobald jemand für einen bestimmten Spieler die Kamera einschaltet.
function startBroadcast(playerId, stream){
  console.log('[WebRTC] Starte Broadcast als playerId', playerId, 'meine peerId:', myPeerId);
  localStream = stream;
  broadcastingPlayerId = playerId;

  db.ref('webrtc/peers/' + myPeerId).set({ playerId: playerId, ts: Date.now() });
  db.ref('webrtc/peers/' + myPeerId).onDisconnect().remove();
  db.ref('webrtc/signals/' + myPeerId).onDisconnect().remove();

  db.ref(`webrtc/signals/${myPeerId}/offersFromViewers`).on('child_added', snap => {
    const viewerPeerId = snap.key;
    const offer = snap.val();
    console.log('[WebRTC][Broadcaster] Offer erhalten von Zuschauer', viewerPeerId);
    if (broadcastConnections[viewerPeerId]) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    broadcastConnections[viewerPeerId] = pc;

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC][Broadcaster] ICE-Status:', pc.iceConnectionState, 'für Zuschauer', viewerPeerId);
    };

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        db.ref(`webrtc/signals/${myPeerId}/iceFromBroadcaster/${viewerPeerId}`).push(event.candidate.toJSON());
      }
    };

    pc.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => pc.createAnswer())
      .then(answer => pc.setLocalDescription(answer))
      .then(() => {
        console.log('[WebRTC][Broadcaster] Sende Antwort an Zuschauer', viewerPeerId);
        db.ref(`webrtc/signals/${myPeerId}/answersToViewers/${viewerPeerId}`).set(pc.localDescription.toJSON());
      })
      .catch(err => console.error('[WebRTC][Broadcaster] Fehler bei Antwort:', err));

    db.ref(`webrtc/signals/${myPeerId}/iceFromViewer/${viewerPeerId}`).on('child_added', s => {
      const candidate = s.val();
      if (candidate) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });
  });
}

// Aufrufen, wenn die eigene Kamera wieder ausgeschaltet wird.
function stopBroadcast(){
  db.ref('webrtc/peers/' + myPeerId).remove();
  db.ref('webrtc/signals/' + myPeerId).remove();
  Object.values(broadcastConnections).forEach(pc => pc.close());
  for (const k in broadcastConnections) delete broadcastConnections[k];
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  broadcastingPlayerId = null;
}
