// ============================================================
// JEOPARDY - FIREBASE + WEBRTC SYNCHRONISATION
// ============================================================

function cellKey(catIndex, value) {
  return catIndex + '_' + value;
}


// ============================================================
// SPIELER
// ============================================================

function normalizePlayers(players) {
  if (!players) return [];

  if (Array.isArray(players)) {
    return players;
  }

  return Object.values(players);
}


function seedPlayersIfEmpty() {
  db.ref('players').once('value').then(snap => {

    if (!snap.exists()) {
      db.ref('players').set(PLAYERS);
    }

  }).catch(error => {
    console.error('Fehler beim Initialisieren der Spieler:', error);
  });
}


function watchPlayers(callback) {

  db.ref('players').on('value', snap => {

    const val = snap.val();

    if (val) {
      callback(normalizePlayers(val));
    }

  });

}


function savePlayers(players) {

  return db.ref('players').set(players)
    .then(() => {
      console.log('Spieler gespeichert:', players);
    })
    .catch(error => {

      console.error('Fehler beim Speichern der Spieler:', error);

      alert(
        'Spieler konnte nicht gespeichert werden: ' +
        error.message
      );

      throw error;
    });

}


// ============================================================
// BENUTZTE FELDER
// ============================================================

function watchUsedCells(callback) {

  db.ref('usedCells').on('value', snap => {

    callback(snap.val() || {});

  });

}


function markCellUsed(catIndex, value) {

  return db
    .ref('usedCells/' + cellKey(catIndex, value))
    .set(true);

}


// ============================================================
// WEBRTC
// ============================================================
//
// Firebase speichert NICHT die Kamerabilder.
// Firebase wird nur benutzt, um WebRTC-Verbindungen
// zwischen den Browsern aufzubauen.
//
// Das eigentliche Video läuft anschließend direkt
// zwischen den Browsern.
//
// ============================================================

const RTC_CONFIG = {

  iceServers: [

    {
      urls: 'stun:stun.l.google.com:19302'
    },

    {
      urls: 'stun:stun1.l.google.com:19302'
    }

  ]

};


let rtcClientId =
  'client_' +
  Math.random().toString(36).substring(2) +
  '_' +
  Date.now();


let rtcInitialized = false;

let rtcIsHost = false;

let rtcLocalPlayerId = null;

let rtcLocalStream = null;

let rtcPeers = new Map();

let rtcClients = new Map();

let rtcRemoteStreams = new Map();

let rtcCallbacks = {

  onRemoteStream: null,

  onRemoteCameraState: null

};


const rtcRoot = () => db.ref('rtc');

const rtcClientRef = () =>
  db.ref('rtc/clients/' + rtcClientId);


function rtcPairKey(a, b) {

  return [a, b].sort().join('__');

}


// ============================================================
// WEBRTC INITIALISIEREN
// ============================================================

function initRTC(options = {}) {

  if (rtcInitialized) {
    return;
  }

  rtcInitialized = true;

  rtcIsHost = !!options.isHost;

  rtcCallbacks.onRemoteStream =
    options.onRemoteStream || null;

  rtcCallbacks.onRemoteCameraState =
    options.onRemoteCameraState || null;


  // Eigene Anwesenheit bei Firebase anmelden

  const ownData = {

    host: rtcIsHost,

    playerId: null,

    cameraOn: false,

    joinedAt: firebase.database.ServerValue.TIMESTAMP

  };


  rtcClientRef().set(ownData);


  // Beim Verlassen automatisch aus der Liste entfernen

  rtcClientRef().onDisconnect().remove();


  // Alle anderen Browser beobachten

  db.ref('rtc/clients').on('value', snap => {

    const clients = snap.val() || {};

    handleRTCClients(clients);

  });

}


// ============================================================
// CLIENT-LISTE VERARBEITEN
// ============================================================

function handleRTCClients(clients) {

  const currentIds = new Set(
    Object.keys(clients)
  );


  // Neue / bestehende Clients

  Object.entries(clients).forEach(([clientId, data]) => {

    if (clientId === rtcClientId) {
      return;
    }

    rtcClients.set(clientId, data);

    ensureRTCPeer(clientId, data);

  });


  // Clients, die verschwunden sind

  for (const [clientId] of rtcPeers) {

    if (!currentIds.has(clientId)) {

      closeRTCPeer(clientId);

    }

  }

}


// ============================================================
// PEER VERBINDUNG ERSTELLEN
// ============================================================

async function ensureRTCPeer(remoteClientId, remoteData) {

  if (rtcPeers.has(remoteClientId)) {

    const existing =
      rtcPeers.get(remoteClientId);

    existing.remotePlayerId =
      remoteData.playerId != null
        ? Number(remoteData.playerId)
        : null;

    return;

  }


  const pairKey =
    rtcPairKey(rtcClientId, remoteClientId);


  const isCaller =
    rtcClientId < remoteClientId;


  const pc =
    new RTCPeerConnection(RTC_CONFIG);


  // Video-Kanal von Anfang an anlegen.
  // Dadurch brauchen wir später keine neue
  // SDP-Verhandlung, wenn die Kamera eingeschaltet wird.

  const videoTransceiver =
    pc.addTransceiver('video', {
      direction: 'sendrecv'
    });


  const peer = {

    pc: pc,

    remotePlayerId:
      remoteData.playerId != null
        ? Number(remoteData.playerId)
        : null,

    isCaller: isCaller,

    videoTransceiver: videoTransceiver,

    pendingCandidates: [],

    remoteDescriptionSet: false,

    offerListener: null,

    answerListener: null,

    callerCandidateListener: null,

    calleeCandidateListener: null

  };


  rtcPeers.set(remoteClientId, peer);


  // ----------------------------------------------------------
  // ICE-Kandidaten
  // ----------------------------------------------------------

  pc.onicecandidate = event => {

    if (!event.candidate) {
      return;
    }

    const candidatePath =
      isCaller
        ? 'callerCandidates'
        : 'calleeCandidates';


    db.ref(
      'rtc/connections/' +
      pairKey +
      '/' +
      candidatePath
    ).push({

      candidate:
        event.candidate.toJSON
          ? event.candidate.toJSON()
          : event.candidate,

      createdAt:
        firebase.database.ServerValue.TIMESTAMP

    });

  };


  // ----------------------------------------------------------
  // EINGEHENDES VIDEO
  // ----------------------------------------------------------

  pc.ontrack = event => {

    let stream =
      rtcRemoteStreams.get(remoteClientId);


    if (!stream) {

      stream = new MediaStream();

      rtcRemoteStreams.set(
        remoteClientId,
        stream
      );

    }


    if (
      !stream
        .getTracks()
        .some(track => track.id === event.track.id)
    ) {

      stream.addTrack(event.track);

    }


    const currentPeer =
      rtcPeers.get(remoteClientId);


    const playerId =
      currentPeer
        ? currentPeer.remotePlayerId
        : null;


    if (
      playerId != null &&
      rtcCallbacks.onRemoteStream
    ) {

      rtcCallbacks.onRemoteStream(
        playerId,
        stream
      );

    }


    event.track.onended = () => {

      // Stream nicht sofort löschen,
      // weil WebRTC Tracks neu erscheinen können.

    };

  };


  // ----------------------------------------------------------
  // VERBINDUNGSSTATUS
  // ----------------------------------------------------------

  pc.onconnectionstatechange = () => {

    console.log(
      'WebRTC',
      remoteClientId,
      pc.connectionState
    );


    if (
      pc.connectionState === 'failed' ||
      pc.connectionState === 'closed'
    ) {

      closeRTCPeer(remoteClientId);

    }

  };


  // ----------------------------------------------------------
  // SIGNALING
  // ----------------------------------------------------------

  if (isCaller) {

    listenForAnswer(
      remoteClientId,
      pairKey,
      peer
    );

  } else {

    listenForOffer(
      remoteClientId,
      pairKey,
      peer
    );

  }


  // ICE vom anderen Browser

  const remoteCandidatePath =
    isCaller
      ? 'calleeCandidates'
      : 'callerCandidates';


  const candidateRef =
    db.ref(
      'rtc/connections/' +
      pairKey +
      '/' +
      remoteCandidatePath
    );


  peer.remoteCandidateListener =
    candidateRef.on('child_added', async snap => {

      const value = snap.val();

      if (!value || !value.candidate) {
        return;
      }


      const candidate =
        new RTCIceCandidate(
          value.candidate
        );


      if (peer.remoteDescriptionSet) {

        try {

          await pc.addIceCandidate(candidate);

        } catch (error) {

          console.warn(
            'ICE-Kandidat konnte nicht hinzugefügt werden:',
            error
          );

        }

      } else {

        peer.pendingCandidates.push(
          candidate
        );

      }

    });


  // ----------------------------------------------------------
  // CALLER ERSTELLT ANGEBOT
  // ----------------------------------------------------------

  if (isCaller) {

    try {

      const offerRef =
        db.ref(
          'rtc/connections/' +
          pairKey +
          '/offer'
        );


      const existingOffer =
        await offerRef.once('value');


      if (!existingOffer.exists()) {

        const offer =
          await pc.createOffer();


        await pc.setLocalDescription(
          offer
        );


        await offerRef.set({

          type: offer.type,

          sdp: offer.sdp,

          createdAt:
            firebase.database.ServerValue.TIMESTAMP

        });

      }

    } catch (error) {

      console.error(
        'WebRTC Offer Fehler:',
        error
      );

    }

  }

}


// ============================================================
// OFFER EMPFANGEN
// ============================================================

function listenForOffer(
  remoteClientId,
  pairKey,
  peer
) {

  const offerRef =
    db.ref(
      'rtc/connections/' +
      pairKey +
      '/offer'
    );


  peer.offerListener =
    offerRef.on('value', async snap => {

      const offer = snap.val();

      if (!offer) {
        return;
      }


      if (peer.pc.remoteDescription) {
        return;
      }


      try {

        await peer.pc.setRemoteDescription(
          new RTCSessionDescription({
            type: offer.type,
            sdp: offer.sdp
          })
        );


        peer.remoteDescriptionSet = true;


        await flushPendingCandidates(
          peer
        );


        const answer =
          await peer.pc.createAnswer();


        await peer.pc.setLocalDescription(
          answer
        );


        await db.ref(
          'rtc/connections/' +
          pairKey +
          '/answer'
        ).set({

          type: answer.type,

          sdp: answer.sdp,

          createdAt:
            firebase.database.ServerValue.TIMESTAMP

        });

      } catch (error) {

        console.error(
          'WebRTC Offer Fehler:',
          error
        );

      }

    });

}


// ============================================================
// ANSWER EMPFANGEN
// ============================================================

function listenForAnswer(
  remoteClientId,
  pairKey,
  peer
) {

  const answerRef =
    db.ref(
      'rtc/connections/' +
      pairKey +
      '/answer'
    );


  peer.answerListener =
    answerRef.on('value', async snap => {

      const answer = snap.val();

      if (!answer) {
        return;
      }


      if (peer.pc.remoteDescription) {
        return;
      }


      try {

        await peer.pc.setRemoteDescription(
          new RTCSessionDescription({
            type: answer.type,
            sdp: answer.sdp
          })
        );


        peer.remoteDescriptionSet = true;


        await flushPendingCandidates(
          peer
        );

      } catch (error) {

        console.error(
          'WebRTC Answer Fehler:',
          error
        );

      }

    });

}


// ============================================================
// GESPEICHERTE ICE-KANDIDATEN NACHLADEN
// ============================================================

async function flushPendingCandidates(peer) {

  const candidates =
    peer.pendingCandidates.splice(0);


  for (const candidate of candidates) {

    try {

      await peer.pc.addIceCandidate(
        candidate
      );

    } catch (error) {

      console.warn(
        'Gespeicherter ICE-Kandidat Fehler:',
        error
      );

    }

  }

}


// ============================================================
// LOKALE KAMERA STARTEN
// ============================================================

async function setLocalCameraStream(
  playerId,
  stream
) {

  rtcLocalPlayerId =
    Number(playerId);


  rtcLocalStream =
    stream;


  // Firebase mitteilen,
  // welcher Spieler diese Kamera sendet.

  await rtcClientRef().update({

    playerId:
      rtcLocalPlayerId,

    cameraOn: true

  });


  // Kamera an alle bestehenden Verbindungen senden

  for (const peer of rtcPeers.values()) {

    try {

      const sender =
        peer.videoTransceiver.sender;


      await sender.replaceTrack(
        stream.getVideoTracks()[0] || null
      );

    } catch (error) {

      console.error(
        'Kamera konnte an Peer gesendet werden:',
        error
      );

    }

  }

}


// ============================================================
// LOKALE KAMERA STOPPEN
// ============================================================

async function stopLocalCamera() {

  if (rtcLocalStream) {

    rtcLocalStream
      .getTracks()
      .forEach(track => track.stop());

  }


  rtcLocalStream = null;


  for (const peer of rtcPeers.values()) {

    try {

      await peer.videoTransceiver
        .sender
        .replaceTrack(null);

    } catch (error) {

      console.warn(
        'Kamera konnte nicht getrennt werden:',
        error
      );

    }

  }


  rtcLocalPlayerId = null;


  if (rtcInitialized) {

    await rtcClientRef().update({

      playerId: null,

      cameraOn: false

    });

  }

}


// ============================================================
// PEER SCHLIESSEN
// ============================================================

function closeRTCPeer(remoteClientId) {

  const peer =
    rtcPeers.get(remoteClientId);


  if (!peer) {
    return;
  }


  try {

    peer.pc.close();

  } catch (error) {

    console.warn(error);

  }


  rtcPeers.delete(
    remoteClientId
  );


  rtcClients.delete(
    remoteClientId
  );


  rtcRemoteStreams.delete(
    remoteClientId
  );


  if (
    rtcCallbacks.onRemoteCameraState
  ) {

    const playerId =
      peer.remotePlayerId;


    if (playerId != null) {

      rtcCallbacks.onRemoteCameraState(
        playerId,
        false
      );

    }

  }

}


// ============================================================
// WEBRTC HILFSFUNKTIONEN FÜR DIE UI
// ============================================================

function getLocalCameraStream() {

  return rtcLocalStream;

}


function getLocalCameraPlayerId() {

  return rtcLocalPlayerId;

}
