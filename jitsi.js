// ---- Eingebetteter Video-Call (Jitsi Meet) für die Facecams ----
// Läuft komplett über Jitsis eigene, öffentliche Infrastruktur (keine eigene
// Signalisierung, kein eigenes WebRTC-Debugging mehr nötig).
//
// Eindeutiger Raumname, damit keine Fremden zufällig reinplatzen:
const JITSI_ROOM = 'JeopardyVonFlixo2026PrivaterRaum';

function initJitsi(){
  const container = document.getElementById('video-call');
  if (!container || typeof JitsiMeetExternalAPI === 'undefined') return;

  const api = new JitsiMeetExternalAPI('meet.jit.si', {
    roomName: JITSI_ROOM,
    parentNode: container,
    width: '100%',
    height: '100%',
    configOverwrite: {
      prejoinPageEnabled: true,      // Jitsi zeigt vorab einen Kamera-Test-Bildschirm
      disableDeepLinking: true,
      startWithVideoMuted: false
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      MOBILE_APP_PROMO: false,
      TILE_VIEW_MAX_COLUMNS: 5
    }
  });

  // Sobald man selbst dem Call beigetreten ist: erzwingt die Kachel-Ansicht,
  // damit alle nebeneinander erscheinen statt "ein großer Sprecher + Rand".
  api.addEventListener('videoConferenceJoined', () => {
    api.executeCommand('setTileView', true);
  });
}

window.addEventListener('DOMContentLoaded', initJitsi);
