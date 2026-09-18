// ============================================================
// sync.js
// Firebase Realtime Database Sync + WebRTC Webcams (Modular SDK v10)
// ============================================================

import { db } from './firebase-config.js';
import { 
  ref, set, update, onValue, once, push, onDisconnect, remove, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Standard-Spielerliste
export let PLAYERS = [
  { id: 1, name: 'Spieler 1', score: 0 },
  { id: 2, name: 'Spieler 2', score: 0 }
];

function cellKey(catIndex, value) {
  return `${catIndex}_${value}`;
}

// ============================================================
// SPIELSTAND & BENUTZER-DATEN
// ============================================================

export function seedPlayersIfEmpty() {
  const playersRef = ref(db, "game/players");
  onValue(playersRef, (snapshot) => {
    if (!snapshot.exists()) {
      savePlayers(PLAYERS);
    }
  }, { onlyOnce: true });
}

export function watchPlayers(callback) {
  const playersRef = ref(db, "game/players");
  onValue(playersRef, snapshot => {
    const value = snapshot.val();
    if (value !== null) {
      PLAYERS = value;
      callback(value);
    }
  });
}

export function savePlayers(players) {
  return set(ref(db, "game/players"), players)
    .catch(error => {
      console.error("Fehler beim Speichern der Spieler:", error);
    });
}

export function watchUsedCells(callback) {
  const usedRef = ref(db, "game/usedCells");
  onValue(usedRef, snapshot => {
    callback(snapshot.val() || {});
  });
}

export function markCellUsed(cellId) {
  return set(ref(db, `game/usedCells/${cellId}`), true);
}

// ALLE FELDER ZURÜCKSETZEN
export function resetAllCells() {
  set(ref(db, 'game/usedCells'), null);
  set(ref(db, 'game/activeQuestion'), null);
}

// AKTIVE FRAGE SYNCHRONISIEREN (FÜR ALLE ANZEIGEN)
export function setActiveQuestion(questionData) {
  set(ref(db, 'game/activeQuestion'), questionData);
}

export function watchActiveQuestion(callback) {
  const qRef = ref(db, 'game/activeQuestion');
  onValue(qRef, snapshot => {
    callback(snapshot.val());
  });
}

// ============================================================
// WEBRTC / KAMERA SYNC
// ============================================================

const WEBRTC_ROOT = "webrtc";

const RTC_PEER_ID =
  "peer_" +
  Math.random().toString(36).substring(2, 10) +
  "_" +
  Date.now().toString(36);

let rtcInitialized = false;
let rtcRole = "player";
let rtcPlayerId = null;
let rtcLocalStream = null;
let rtcPeerRef = null;

const rtcConnections = {};
const remoteCameraStreams = {};
let rtcRemoteStreamCallback = null;
const rtcPeerInfos = {};

function createRtcId() {
  return Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
}

function getPairId(peerA, peerB) {
  return [peerA, peerB].sort().join("__");
}

function getCandidatePath(pairId, sessionId, peerId) {
  return `${WEBRTC_ROOT}/candidates/${pairId}/${sessionId}/${peerId}`;
}

export function initCameraSync(options = {}) {
  if (rtcInitialized) {
    console.warn("initCameraSync wurde bereits ausgeführt.");
    return;
  }

  rtcInitialized = true;
  rtcRole = options.role || "player";
  rtcPlayerId = options.playerId !== undefined ? options.playerId : null;
  rtcRemoteStreamCallback = typeof options.onRemoteStream === "function" ? options.onRemoteStream : null;

  console.log("WebRTC wird gestartet:", { peerId: RTC_PEER_ID, role: rtcRole, playerId: rtcPlayerId });

  rtcPeerRef = ref(db, `${WEBRTC_ROOT}/peers/${RTC_PEER_ID}`);

  const peerInfo = {
    role: rtcRole,
    playerId: rtcPlayerId !== null && rtcPlayerId !== undefined ? String(rtcPlayerId) : null,
    online: true,
    createdAt: serverTimestamp()
  };

  set(rtcPeerRef, peerInfo)
    .then(() => console.log("WebRTC-Peer bei Firebase angemeldet."))
    .catch(error => console.error("WebRTC-Peer Fehler:", error));

  onDisconnect(rtcPeerRef).remove();

  const peersRef = ref(db, `${WEBRTC_ROOT}/peers`);
  onValue(peersRef, snapshot => {
    const peers = snapshot.val() || {};

    Object.entries(peers).forEach(([remotePeerId, remoteInfo]) => {
      if (remotePeerId === RTC_PEER_ID) return;

      rtcPeerInfos[remotePeerId] = remoteInfo;

      if (rtcConnections[remotePeerId]) {
        rtcConnections[remotePeerId].remoteInfo = remoteInfo;
        return;
      }

      console.log("Neuer Peer gefunden:", remotePeerId, remoteInfo);
      createRtcConnection(remotePeerId, remoteInfo);
    });

    Object.keys(rtcConnections).forEach(remotePeerId => {
      if (!peers[remotePeerId]) {
        closeRtcConnection(remotePeerId);
      }
    });
  });

  window.addEventListener("beforeunload", () => {
    Object.keys(rtcConnections).forEach(remotePeerId => closeRtcConnection(remotePeerId));
  });
}

async function createRtcConnection(remotePeerId, remoteInfo) {
  if (rtcConnections[remotePeerId]) {
    return rtcConnections[remotePeerId].pc;
  }

  console.log("Erstelle WebRTC-Verbindung zu:", remotePeerId);

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302"] },
      { urls: ["stun:stun1.l.google.com:19302"] }
    ]
  });

  const pairId = getPairId(RTC_PEER_ID, remotePeerId);
  const isInitiator = RTC_PEER_ID < remotePeerId;

  const connection = {
    pc, remoteInfo, pairId,
    sessionId: null,
    isInitiator,
    remoteDescriptionSet: false,
    pendingCandidates: [],
    candidateListenerRef: null,
    signalListenerRef: null
  };

  rtcConnections[remotePeerId] = connection;

  let videoTransceiver;
  try {
    videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
  } catch (error) {
    console.error("Video-Transceiver Fehler:", error);
  }

  connection.videoTransceiver = videoTransceiver;

  if (rtcLocalStream && videoTransceiver) {
    const track = rtcLocalStream.getVideoTracks()[0];
    if (track) {
      try {
        await videoTransceiver.sender.replaceTrack(track);
      } catch (error) {
        console.error("Lokaler Track Fehler:", error);
      }
    }
  }

  pc.ontrack = event => {
    console.log("Remote-Kamera empfangen von:", remotePeerId);
    let stream = (event.streams && event.streams.length > 0) ? event.streams[0] : new MediaStream([event.track]);

    remoteCameraStreams[remotePeerId] = stream;

    const info = rtcConnections[remotePeerId] ? rtcConnections[remotePeerId].remoteInfo : rtcPeerInfos[remotePeerId];

    if (rtcRemoteStreamCallback) {
      rtcRemoteStreamCallback(info || {}, stream);
    }

    event.track.onended = () => {
      console.log("Remote-Kamera beendet:", remotePeerId);
      delete remoteCameraStreams[remotePeerId];
    };
  };

  pc.onicecandidate = event => {
    if (!event.candidate || !connection.sessionId) return;
    const candidateRef = ref(db, getCandidatePath(pairId, connection.sessionId, RTC_PEER_ID));
    push(candidateRef, event.candidate.toJSON()).catch(err => console.error("ICE-Fehler:", err));
  };

  pc.onconnectionstatechange = () => {
    console.log(`WebRTC ${remotePeerId}:`, pc.connectionState);
    if (pc.connectionState === "failed") {
      closeRtcConnection(remotePeerId);
    }
  };

  if (isInitiator) {
    await startRtcOffer(remotePeerId, connection);
  } else {
    waitForRtcOffer(remotePeerId, connection);
  }

  return pc;
}

async function startRtcOffer(remotePeerId, connection) {
  const pc = connection.pc;
  const signalRef = ref(db, `${WEBRTC_ROOT}/signals/${connection.pairId}`);
  const sessionId = createRtcId();
  connection.sessionId = sessionId;

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await set(signalRef, {
      sessionId,
      offer: { type: offer.type, sdp: offer.sdp },
      offerFrom: RTC_PEER_ID,
      createdAt: serverTimestamp()
    });

    onDisconnect(signalRef).remove();

    connection.signalListenerRef = onValue(signalRef, async snapshot => {
      const data = snapshot.val();
      if (!data || data.sessionId !== connection.sessionId) return;

      if (data.answer && !connection.remoteDescriptionSet) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          connection.remoteDescriptionSet = true;
          await flushPendingCandidates(connection);
        } catch (error) {
          console.error("Antwort-Fehler:", error);
        }
      }
    });

    listenForRtcCandidates(remotePeerId, connection);
  } catch (error) {
    console.error("Offer-Fehler:", error);
  }
}

function waitForRtcOffer(remotePeerId, connection) {
  const signalRef = ref(db, `${WEBRTC_ROOT}/signals/${connection.pairId}`);

  connection.signalListenerRef = onValue(signalRef, async snapshot => {
    const data = snapshot.val();
    if (!data || !data.offer || !data.sessionId) return;
    if (connection.sessionId === data.sessionId && connection.remoteDescriptionSet) return;

    connection.sessionId = data.sessionId;

    try {
      const pc = connection.pc;
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      connection.remoteDescriptionSet = true;
      await flushPendingCandidates(connection);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await update(signalRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        answerFrom: RTC_PEER_ID
      });

      onDisconnect(signalRef).remove();
      listenForRtcCandidates(remotePeerId, connection);
    } catch (error) {
      console.error("Fehler beim Verarbeiten des Offers:", error);
    }
  });
}

function listenForRtcCandidates(remotePeerId, connection) {
  if (!connection.sessionId || connection.candidateListenerRef) return;

  const candidateRef = ref(db, getCandidatePath(connection.pairId, connection.sessionId, remotePeerId));

  connection.candidateListenerRef = onValue(candidateRef, snapshot => {
    const data = snapshot.val();
    if (!data) return;

    Object.values(data).forEach(async candidate => {
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        if (connection.remoteDescriptionSet) {
          await connection.pc.addIceCandidate(iceCandidate);
        } else {
          connection.pendingCandidates.push(iceCandidate);
        }
      } catch (error) {
        console.error("ICE-Hinzufügebefehl fehlgeschlagen:", error);
      }
    });
  });
}

async function flushPendingCandidates(connection) {
  if (!connection.remoteDescriptionSet) return;
  const candidates = connection.pendingCandidates.splice(0);

  for (const candidate of candidates) {
    try {
      await connection.pc.addIceCandidate(candidate);
    } catch (error) {
      console.error("ICE Flush-Fehler:", error);
    }
  }
}

function closeRtcConnection(remotePeerId) {
  const connection = rtcConnections[remotePeerId];
  if (!connection) return;

  try { connection.pc.close(); } catch (e) {}

  delete rtcConnections[remotePeerId];
  delete remoteCameraStreams[remotePeerId];
}

export async function startLocalCamera(suppliedStream = null) {
  if (suppliedStream) {
    rtcLocalStream = suppliedStream;
  } else {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Kamerazugriff wird nicht unterstützt.");
    }
    rtcLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }

  const track = rtcLocalStream.getVideoTracks()[0];
  if (!track) throw new Error("Kein Videotrack gefunden.");

  const replacements = Object.entries(rtcConnections).map(async ([remotePeerId, connection]) => {
    if (!connection.videoTransceiver) return;
    try {
      await connection.videoTransceiver.sender.replaceTrack(track);
    } catch (error) {
      console.error("Track-Ersetzung fehlgeschlagen:", remotePeerId, error);
    }
  });

  await Promise.all(replacements);
  return rtcLocalStream;
}

export function stopLocalCamera() {
  Object.values(rtcConnections).forEach(connection => {
    if (connection.videoTransceiver) {
      connection.videoTransceiver.sender.replaceTrack(null).catch(() => {});
    }
  });

  if (rtcLocalStream) {
    rtcLocalStream.getTracks().forEach(track => track.stop());
  }
  rtcLocalStream = null;
}

export function setCameraPlayerId(playerId) {
  rtcPlayerId = playerId !== null && playerId !== undefined ? String(playerId) : null;
  if (rtcPeerRef) {
    update(rtcPeerRef, { playerId: rtcPlayerId }).catch(err => console.error("Player ID Sync Fehler:", err));
  }
}

export function getRemoteCameraStream(playerId) {
  const wantedId = String(playerId);
  for (const [peerId, info] of Object.entries(rtcPeerInfos)) {
    if (info && info.role === "player" && String(info.playerId) === wantedId) {
      if (remoteCameraStreams[peerId]) return remoteCameraStreams[peerId];
    }
  }
  return null;
}

export function getRemoteHostCameraStream() {
  for (const [peerId, info] of Object.entries(rtcPeerInfos)) {
    if (info && info.role === "host") {
      if (remoteCameraStreams[peerId]) return remoteCameraStreams[peerId];
    }
  }
  return null;
}

export function getLocalCameraStream() {
  return rtcLocalStream;
}
