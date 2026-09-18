// ============================================================

// sync.js

// Firebase-Synchronisation + WebRTC-Kamera

// ============================================================





// ============================================================

// SPIELBRETT / SPIELER

// ============================================================



function cellKey(catIndex, value) {

  return `${catIndex}_${value}`;

}





// ------------------------------------------------------------

// Spieler initialisieren

// ------------------------------------------------------------



function seedPlayersIfEmpty() {



  return db.ref("players").once("value").then(snapshot => {



    if (!snapshot.exists()) {

      return db.ref("players").set(PLAYERS);

    }



  }).catch(error => {



    console.error(

      "Fehler beim Initialisieren der Spieler:",

      error

    );



  });



}





// ------------------------------------------------------------

// Spieler überwachen

// ------------------------------------------------------------



function watchPlayers(callback) {



  db.ref("players").on("value", snapshot => {



    const value = snapshot.val();



    if (value !== null) {

      callback(value);

    }



  });



}





// ------------------------------------------------------------

// Benutzte Spielfelder überwachen

// ------------------------------------------------------------



function watchUsedCells(callback) {



  db.ref("usedCells").on("value", snapshot => {



    callback(

      snapshot.val() || {}

    );



  });



}





// ------------------------------------------------------------

// Spieler speichern

// ------------------------------------------------------------



function savePlayers(players) {



  return db.ref("players")

    .set(players)

    .catch(error => {



      console.error(

        "Spieler konnten nicht gespeichert werden:",

        error

      );



      alert(

        "Die Spieler konnten nicht gespeichert werden.\n\n" +

        error.message

      );



    });



}





// ------------------------------------------------------------

// Spielfeld-Feld als benutzt markieren

// ------------------------------------------------------------



function markCellUsed(catIndex, value) {



  return db.ref(

    `usedCells/${cellKey(catIndex, value)}`

  ).set(true);



}





// ============================================================

// WEBRTC / KAMERA

// ============================================================



const WEBRTC_ROOT = "webrtc";





// Eigene Peer-ID.

// Bei jedem neuen Tab gibt es eine neue ID.

const RTC_PEER_ID =

  "peer_" +

  Math.random()

    .toString(36)

    .substring(2, 10) +

  "_" +

  Date.now().toString(36);





let rtcInitialized = false;



let rtcRole = "player";



let rtcPlayerId = null;



let rtcLocalStream = null;



let rtcPeerRef = null;





// Alle aktiven WebRTC-Verbindungen

const rtcConnections = {};





// Gespeicherte Remote-Streams

const remoteCameraStreams = {};





// Callback aus host.html / index.html

let rtcRemoteStreamCallback = null;





// Informationen über andere Peers

const rtcPeerInfos = {};





// ============================================================

// HILFSFUNKTIONEN

// ============================================================



function createRtcId() {



  return (

    Math.random()

      .toString(36)

      .substring(2, 12) +

    "_" +

    Date.now().toString(36)

  );



}





function getPairId(peerA, peerB) {



  return [peerA, peerB]

    .sort()

    .join("__");



}





function getCandidatePath(

  pairId,

  sessionId,

  peerId

) {



  return (

    `${WEBRTC_ROOT}/candidates/` +

    `${pairId}/` +

    `${sessionId}/` +

    `${peerId}`

  );



}





// ============================================================

// INIT CAMERA SYNC

// ============================================================



function initCameraSync(options = {}) {



  if (rtcInitialized) {



    console.warn(

      "initCameraSync wurde bereits ausgeführt."

    );



    return;



  }





  rtcInitialized = true;





  rtcRole =

    options.role || "player";





  rtcPlayerId =

    options.playerId !== undefined

      ? options.playerId

      : null;





  rtcRemoteStreamCallback =

    typeof options.onRemoteStream === "function"

      ? options.onRemoteStream

      : null;





  console.log(

    "WebRTC wird gestartet:",

    {

      peerId: RTC_PEER_ID,

      role: rtcRole,

      playerId: rtcPlayerId

    }

  );





  // ----------------------------------------------------------

  // Eigenen Peer bei Firebase anmelden

  // ----------------------------------------------------------



  rtcPeerRef =

    db.ref(

      `${WEBRTC_ROOT}/peers/${RTC_PEER_ID}`

    );





  const peerInfo = {



    role: rtcRole,



    playerId:

      rtcPlayerId !== null &&

      rtcPlayerId !== undefined

        ? String(rtcPlayerId)

        : null,



    online: true,



    createdAt:

      firebase.database.ServerValue.TIMESTAMP



  };





  rtcPeerRef.set(peerInfo)

    .then(() => {



      console.log(

        "WebRTC-Peer bei Firebase angemeldet."

      );



    })

    .catch(error => {



      console.error(

        "WebRTC-Peer konnte nicht angemeldet werden:",

        error

      );



    });





  // Beim Verlassen automatisch löschen

  rtcPeerRef

    .onDisconnect()

    .remove();





  // ----------------------------------------------------------

  // Andere Peers überwachen

  // ----------------------------------------------------------



  db.ref(`${WEBRTC_ROOT}/peers`).on(

    "value",

    snapshot => {



      const peers =

        snapshot.val() || {};





      Object.entries(peers).forEach(

        ([remotePeerId, remoteInfo]) => {



          if (

            remotePeerId === RTC_PEER_ID

          ) {

            return;

          }





          rtcPeerInfos[remotePeerId] =

            remoteInfo;





          /*

           * Verbindung existiert bereits.

           * Nur die Informationen aktualisieren.

           */

          if (

            rtcConnections[remotePeerId]

          ) {



            rtcConnections[

              remotePeerId

            ].remoteInfo = remoteInfo;



            return;



          }





          console.log(

            "Neuer Peer gefunden:",

            remotePeerId,

            remoteInfo

          );





          createRtcConnection(

            remotePeerId,

            remoteInfo

          );



        }

      );





      // ------------------------------------------------------

      // Verbindungen zu verschwundenen Peers schließen

      // ------------------------------------------------------



      Object.keys(

        rtcConnections

      ).forEach(remotePeerId => {



        if (

          !peers[remotePeerId]

        ) {



          closeRtcConnection(

            remotePeerId

          );



        }



      });



    }

  );





  // ----------------------------------------------------------

  // Eigene Verbindung beim Schließen aufräumen

  // ----------------------------------------------------------



  window.addEventListener(

    "beforeunload",

    () => {



      Object.keys(

        rtcConnections

      ).forEach(remotePeerId => {



        closeRtcConnection(

          remotePeerId

        );



      });



    }

  );



}





// ============================================================

// WEBRTC VERBINDUNG ERSTELLEN

// ============================================================



async function createRtcConnection(

  remotePeerId,

  remoteInfo

) {



  // Bereits vorhanden

  if (

    rtcConnections[remotePeerId]

  ) {



    return rtcConnections[

      remotePeerId

    ].pc;



  }





  console.log(

    "Erstelle WebRTC-Verbindung zu:",

    remotePeerId

  );





  const pc =

    new RTCPeerConnection({



      iceServers: [



        {

          urls: [

            "stun:stun.l.google.com:19302"

          ]

        },



        {

          urls: [

            "stun:stun1.l.google.com:19302"

          ]

        }



      ]



    });





  const pairId =

    getPairId(

      RTC_PEER_ID,

      remotePeerId

    );





  const isInitiator =

    RTC_PEER_ID < remotePeerId;





  const connection = {



    pc: pc,



    remoteInfo: remoteInfo,



    pairId: pairId,



    sessionId: null,



    isInitiator: isInitiator,



    remoteDescriptionSet: false,



    pendingCandidates: [],



    candidateListenerRef: null,



    signalListenerRef: null



  };





  rtcConnections[

    remotePeerId

  ] = connection;





  // ==========================================================

  // VIDEO-TRANSCEIVER

  // ==========================================================



  /*

   * Ganz wichtig:

   *

   * Wir erstellen die Video-Verbindung schon beim

   * Verbindungsaufbau.

   *

   * Dadurch kann später startLocalCamera() einfach

   * replaceTrack() benutzen.

   */



  let videoTransceiver;



  try {



    videoTransceiver =

      pc.addTransceiver(

        "video",

        {

          direction: "sendrecv"

        }

      );



  } catch (error) {



    console.error(

      "Video-Transceiver konnte nicht erstellt werden:",

      error

    );



  }





  connection.videoTransceiver =

    videoTransceiver;





  // ==========================================================

  // FALLS KAMERA BEREITS AKTIV IST

  // ==========================================================



  if (

    rtcLocalStream &&

    videoTransceiver

  ) {



    const track =

      rtcLocalStream.getVideoTracks()[0];





    if (track) {



      try {



        await videoTransceiver

          .sender

          .replaceTrack(track);



      } catch (error) {



        console.error(

          "Lokaler Video-Track konnte nicht gesetzt werden:",

          error

        );



      }



    }



  }





  // ==========================================================

  // REMOTE VIDEO

  // ==========================================================



  pc.ontrack = event => {



    console.log(

      "Remote-Kamera empfangen von:",

      remotePeerId

    );





    let stream;





    /*

     * Normalerweise liefert WebRTC event.streams[0].

     *

     * Falls der Browser keine Stream-ID liefert,

     * erstellen wir selbst einen MediaStream.

     */



    if (

      event.streams &&

      event.streams.length > 0

    ) {



      stream =

        event.streams[0];



    } else {



      stream =

        new MediaStream([

          event.track

        ]);



    }





    remoteCameraStreams[

      remotePeerId

    ] = stream;





    /*

     * Informationen des Spielers/Hosts

     * an die HTML-Seite weitergeben.

     */



    const info =

      rtcConnections[

        remotePeerId

      ]

        ? rtcConnections[

            remotePeerId

          ].remoteInfo

        : rtcPeerInfos[

            remotePeerId

          ];





    if (

      rtcRemoteStreamCallback

    ) {



      rtcRemoteStreamCallback(

        info || {},

        stream

      );



    }





    event.track.onended =

      () => {



        console.log(

          "Remote-Kamera beendet:",

          remotePeerId

        );



        delete remoteCameraStreams[

          remotePeerId

        ];



      };



  };





  // ==========================================================

  // ICE-KANDIDATEN

  // ==========================================================



  pc.onicecandidate =

    event => {



      if (

        !event.candidate ||

        !connection.sessionId

      ) {



        return;



      }





      const candidateRef =

        db.ref(

          getCandidatePath(

            pairId,

            connection.sessionId,

            RTC_PEER_ID

          )

        );





      candidateRef.push(

        event.candidate.toJSON()

      )

      .catch(error => {



        console.error(

          "ICE-Kandidat konnte nicht gespeichert werden:",

          error

        );



      });



    };





  // ==========================================================

  // CONNECTION STATE

  // ==========================================================



  pc.onconnectionstatechange =

    () => {



      console.log(

        `WebRTC ${remotePeerId}:`,

        pc.connectionState

      );





      if (

        pc.connectionState ===

          "failed" ||

        pc.connectionState ===

          "closed" ||

        pc.connectionState ===

          "disconnected"

      ) {



        /*

         * Bei disconnected nicht sofort löschen,

         * weil die Verbindung sich oft wieder fängt.

         */



        if (

          pc.connectionState ===

          "failed"

        ) {



          closeRtcConnection(

            remotePeerId

          );



        }



      }



    };





  // ==========================================================

  // INITIATOR

  // ==========================================================



  if (isInitiator) {



    await startRtcOffer(

      remotePeerId,

      connection

    );



  } else {



    waitForRtcOffer(

      remotePeerId,

      connection

    );



  }





  return pc;



}





// ============================================================

// ANGEBOT ERSTELLEN

// ============================================================



async function startRtcOffer(

  remotePeerId,

  connection

) {



  const pc =

    connection.pc;





  const signalRef =

    db.ref(

      `${WEBRTC_ROOT}/signals/` +

      connection.pairId

    );





  /*

   * Jede neue Verbindung bekommt eine neue Session.

   */



  const sessionId =

    createRtcId();





  connection.sessionId =

    sessionId;





  console.log(

    "Erstelle WebRTC-Angebot:",

    remotePeerId,

    sessionId

  );





  try {



    const offer =

      await pc.createOffer();





    await pc.setLocalDescription(

      offer

    );





    await signalRef.set({



      sessionId: sessionId,



      offer: {

        type: offer.type,

        sdp: offer.sdp

      },



      offerFrom:

        RTC_PEER_ID,



      createdAt:

        firebase.database.ServerValue.TIMESTAMP



    });





    /*

     * Signal beim Trennen löschen.

     */



    signalRef

      .onDisconnect()

      .remove();





    /*

     * Auf Antwort warten.

     */



    connection.signalListenerRef =

      signalRef.on(

        "value",

        async snapshot => {



          const data =

            snapshot.val();





          if (!data) {

            return;

          }





          if (

            data.sessionId !==

            connection.sessionId

          ) {



            return;



          }





          if (

            data.answer &&

            !connection.remoteDescriptionSet

          ) {



            try {



              await pc.setRemoteDescription(

                new RTCSessionDescription(

                  data.answer

                )

              );





              connection.remoteDescriptionSet =

                true;





              await flushPendingCandidates(

                connection

              );





              console.log(

                "WebRTC-Antwort erhalten:",

                remotePeerId

              );



            } catch (error) {



              console.error(

                "Fehler beim Setzen der WebRTC-Antwort:",

                error

              );



            }



          }



        }

      );





    /*

     * Auf ICE-Kandidaten des anderen Peers hören.

     */



    listenForRtcCandidates(

      remotePeerId,

      connection

    );





  } catch (error) {



    console.error(

      "Fehler beim Erstellen des WebRTC-Angebots:",

      error

    );



  }



}





// ============================================================

// AUF ANGEBOT WARTEN

// ============================================================



function waitForRtcOffer(

  remotePeerId,

  connection

) {



  const signalRef =

    db.ref(

      `${WEBRTC_ROOT}/signals/` +

      connection.pairId

    );





  connection.signalListenerRef =

    signalRef.on(

      "value",

      async snapshot => {



        const data =

          snapshot.val();





        if (!data) {

          return;

        }





        if (

          !data.offer ||

          !data.sessionId

        ) {



          return;



        }





        /*

         * Bereits bearbeitete Session ignorieren.

         */



        if (

          connection.sessionId ===

          data.sessionId &&

          connection.remoteDescriptionSet

        ) {



          return;



        }





        connection.sessionId =

          data.sessionId;





        console.log(

          "WebRTC-Angebot erhalten:",

          remotePeerId,

          connection.sessionId

        );





        try {



          const pc =

            connection.pc;





          await pc.setRemoteDescription(

            new RTCSessionDescription(

              data.offer

            )

          );





          connection.remoteDescriptionSet =

            true;





          await flushPendingCandidates(

            connection

          );





          const answer =

            await pc.createAnswer();





          await pc.setLocalDescription(

            answer

          );





          await signalRef.update({



            answer: {



              type:

                answer.type,



              sdp:

                answer.sdp



            },



            answerFrom:

              RTC_PEER_ID



          });





          signalRef

            .onDisconnect()

            .remove();





          listenForRtcCandidates(

            remotePeerId,

            connection

          );





          console.log(

            "WebRTC-Antwort gesendet:",

            remotePeerId

          );





        } catch (error) {



          console.error(

            "Fehler bei WebRTC-Angebot:",

            error

          );



        }



      }

    );



}





// ============================================================

// ICE-KANDIDATEN EMPFANGEN

// ============================================================



function listenForRtcCandidates(

  remotePeerId,

  connection

) {



  if (

    !connection.sessionId

  ) {



    return;



  }





  if (

    connection.candidateListenerRef

  ) {



    return;



  }





  const candidateRef =

    db.ref(

      getCandidatePath(

        connection.pairId,

        connection.sessionId,

        remotePeerId

      )

    );





  connection.candidateListenerRef =

    candidateRef.on(

      "child_added",

      async snapshot => {



        const candidate =

          snapshot.val();





        if (!candidate) {

          return;

        }





        try {



          const iceCandidate =

            new RTCIceCandidate(

              candidate

            );





          if (

            connection.remoteDescriptionSet

          ) {



            await connection.pc

              .addIceCandidate(

                iceCandidate

              );



          } else {



            connection.pendingCandidates

              .push(

                iceCandidate

              );



          }



        } catch (error) {



          console.error(

            "ICE-Kandidat konnte nicht hinzugefügt werden:",

            error

          );



        }



      }

    );



}





// ============================================================

// WARTENDE ICE-KANDIDATEN ABARBEITEN

// ============================================================



async function flushPendingCandidates(

  connection

) {



  if (

    !connection.remoteDescriptionSet

  ) {



    return;



  }





  const candidates =

    connection.pendingCandidates

      .splice(0);





  for (

    const candidate of candidates

  ) {



    try {



      await connection.pc

        .addIceCandidate(

          candidate

        );



    } catch (error) {



      console.error(

        "Gespeicherter ICE-Kandidat konnte nicht hinzugefügt werden:",

        error

      );



    }



  }



}





// ============================================================

// VERBINDUNG SCHLIESSEN

// ============================================================



function closeRtcConnection(

  remotePeerId

) {



  const connection =

    rtcConnections[

      remotePeerId

    ];





  if (!connection) {

    return;

  }





  console.log(

    "Schließe WebRTC-Verbindung:",

    remotePeerId

  );





  try {



    if (

      connection.signalListenerRef

    ) {



      connection.signalListenerRef

        .off();



    }



  } catch (error) {



    console.warn(error);



  }





  try {



    if (

      connection.candidateListenerRef

    ) {



      connection.candidateListenerRef

        .off();



    }



  } catch (error) {



    console.warn(error);



  }





  try {



    connection.pc.close();



  } catch (error) {



    console.warn(error);



  }





  delete rtcConnections[

    remotePeerId

  ];





  delete remoteCameraStreams[

    remotePeerId

  ];



}





// ============================================================

// LOKALE KAMERA STARTEN

// ============================================================



async function startLocalCamera(

  suppliedStream = null

) {



  console.log(

    "startLocalCamera()"

  );





  /*

   * Wenn host.html/index.html bereits

   * getUserMedia() gemacht hat, verwenden

   * wir diesen Stream.

   */



  if (suppliedStream) {



    rtcLocalStream =

      suppliedStream;



  } else {



    if (

      !navigator.mediaDevices ||

      !navigator.mediaDevices.getUserMedia

    ) {



      throw new Error(

        "Kamerazugriff wird von diesem Browser nicht unterstützt."

      );



    }





    /*

     * Kamera benötigt HTTPS oder localhost.

     */



    if (

      !window.isSecureContext &&

      location.hostname !== "localhost"

    ) {



      throw new Error(

        "Kamera funktioniert nur über HTTPS oder localhost."

      );



    }





    rtcLocalStream =

      await navigator.mediaDevices.getUserMedia({



        video: true,



        audio: false



      });



  }





  const track =

    rtcLocalStream.getVideoTracks()[0];





  if (!track) {



    throw new Error(

      "Der Kamerastream enthält keinen Videotrack."

    );



  }





  console.log(

    "Lokale Kamera gestartet."

  );





  /*

   * Kamera an ALLE bereits bestehenden

   * WebRTC-Verbindungen übergeben.

   */



  const replacements =

    Object.entries(

      rtcConnections

    ).map(

      async ([remotePeerId, connection]) => {



        if (

          !connection.videoTransceiver

        ) {



          return;



        }





        try {



          await connection

            .videoTransceiver

            .sender

            .replaceTrack(track);





          console.log(

            "Kamera an Peer gesendet:",

            remotePeerId

          );





        } catch (error) {



          console.error(

            "Kamera konnte nicht an Peer gesendet werden:",

            remotePeerId,

            error

          );



        }



      }

    );





  await Promise.all(

    replacements

  );





  return rtcLocalStream;



}





// ============================================================

// LOKALE KAMERA STOPPEN

// ============================================================



function stopLocalCamera() {



  console.log(

    "stopLocalCamera()"

  );





  /*

   * Track aus allen WebRTC-Verbindungen entfernen.

   */



  Object.entries(

    rtcConnections

  ).forEach(

    ([remotePeerId, connection]) => {



      if (

        connection.videoTransceiver

      ) {



        connection

          .videoTransceiver

          .sender

          .replaceTrack(null)

          .catch(error => {



            console.warn(

              "Video-Track konnte nicht entfernt werden:",

              remotePeerId,

              error

            );



          });



      }



    }

  );





  /*

   * Lokale Kamera stoppen.

   */



  if (rtcLocalStream) {



    rtcLocalStream

      .getTracks()

      .forEach(track => {



        track.stop();



      });



  }





  rtcLocalStream =

    null;





  console.log(

    "Lokale Kamera gestoppt."

  );



}





// ============================================================

// LOKALEN PLAYER ÄNDERN

// ============================================================



function setCameraPlayerId(

  playerId

) {



  rtcPlayerId =

    playerId !== null &&

    playerId !== undefined

      ? String(playerId)

      : null;





  if (

    rtcPeerRef

  ) {



    rtcPeerRef

      .update({



        playerId:

          rtcPlayerId



      })

      .catch(error => {



        console.error(

          "Spieler-ID konnte nicht aktualisiert werden:",

          error

        );



      });



  }



}





// ============================================================

// REMOTE CAMERA STREAM ABFRAGEN

// ============================================================



function getRemoteCameraStream(

  playerId

) {



  const wantedId =

    String(playerId);





  /*

   * Erst direkt über Peer-IDs suchen.

   */



  for (

    const [peerId, info]

    of Object.entries(rtcPeerInfos)

  ) {



    if (

      info &&

      info.role === "player" &&

      String(info.playerId) === wantedId

    ) {



      if (

        remoteCameraStreams[peerId]

      ) {



        return remoteCameraStreams[

          peerId

        ];



      }



    }



  }





  return null;



}





// ============================================================

// REMOTE HOST STREAM

// ============================================================



function getRemoteHostCameraStream() {



  for (

    const [peerId, info]

    of Object.entries(rtcPeerInfos)

  ) {



    if (

      info &&

      info.role === "host"

    ) {



      if (

        remoteCameraStreams[peerId]

      ) {



        return remoteCameraStreams[

          peerId

        ];



      }



    }



  }





  return null;



}





// ============================================================

// LOKALEN STREAM ABFRAGEN

// ============================================================



function getLocalCameraStream() {



  return rtcLocalStream;



}





// ============================================================

// DEBUG

// ============================================================



console.log(

  "sync.js geladen – WebRTC-Funktionen verfügbar:",

  {

    initCameraSync:

      typeof initCameraSync,



    startLocalCamera:

      typeof startLocalCamera,



    stopLocalCamera:

      typeof stopLocalCamera,



    getRemoteCameraStream:

      typeof getRemoteCameraStream



  }

);
