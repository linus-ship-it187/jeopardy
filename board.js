// ============================================================
// board.js
// Spielbrett-Rendern & Fragen-Modal
// ============================================================

import { DATA, VALUES } from './game-data.js';
import { markCellUsed, cellKey, setActiveQuestion } from './sync.js';

// Merkt sich jede Zellen-Schaltfläche unter ihrem Schlüssel
let cellRefs = {};

// ------------------------------------------------------------
// Spielbrett rendern
// interactive = true  -> Host-Ansicht (Klickbar, öffnet Frage für alle)
// interactive = false -> Player-Ansicht (Reine Anzeige)
// ------------------------------------------------------------
export function renderBoard(interactive = false) {
  const grid = document.getElementById('board-grid');
  if (!grid) return;

  grid.style.setProperty('--cols', DATA.length);
  grid.innerHTML = '';
  cellRefs = {};

  // Kategorien anlegen
  DATA.forEach(cat => {
    const label = document.createElement('div');
    label.className = 'category';
    label.textContent = cat.category;
    grid.appendChild(label);
  });

  // Kacheln anlegen
  VALUES.forEach(value => {
    DATA.forEach((cat, catIndex) => {
      const btn = document.createElement('button');
      btn.className = 'cell';
      btn.textContent = value;
      cellRefs[cellKey(catIndex, value)] = btn;

      if (interactive) {
        btn.addEventListener('click', () => {
          if (!btn.disabled) {
            openQuestion(cat, catIndex, value, btn);
          }
        });
      } else {
        btn.style.cursor = 'default';
      }

      grid.appendChild(btn);
    });
  });
}

// ------------------------------------------------------------
// Benutzte Spielfelder aktualisieren (deaktivieren & Reset unterstützen)
// ------------------------------------------------------------
export function applyUsedCells(usedCells) {
  Object.keys(cellRefs).forEach(key => {
    if (usedCells && usedCells[key]) {
      cellRefs[key].disabled = true;
    } else {
      // Setzt das Feld wieder auf aktiv, falls 'Alle Felder zurücksetzen' geklickt wurde
      cellRefs[key].disabled = false;
    }
  });
}

// ------------------------------------------------------------
// Frage öffnen (nur im Host getriggert)
// ------------------------------------------------------------
export function openQuestion(cat, catIndex, value, btn) {
  const item = cat.questions[value];
  if (!item) return;

  const qData = {
    meta: `${cat.category} — ${value}`,
    q: item.q,
    a: item.a,
    catIndex: catIndex,
    value: value
  };

  // An Firebase senden, damit die Frage bei allen Spielern aufpoppt
  setActiveQuestion(qData);
  openModal(qData, btn);
}

// ------------------------------------------------------------
// Modal mit Frageninhalten füllen und anzeigen
// ------------------------------------------------------------
export function openModal(qData, btn = null) {
  const overlay = document.getElementById('overlay');
  const modalMeta = document.getElementById('modal-meta');
  const modalQuestion = document.getElementById('modal-question');
  const modalAnswer = document.getElementById('modal-answer');
  const revealBtn = document.getElementById('reveal-btn');
  const closeBtn = document.getElementById('close-btn');

  if (!overlay) return;

  modalMeta.textContent = qData.meta;
  modalQuestion.textContent = qData.q;
  modalAnswer.textContent = qData.a;
  modalAnswer.hidden = true;

  if (revealBtn) {
    revealBtn.textContent = 'Antwort zeigen';
    revealBtn.onclick = () => {
      modalAnswer.hidden = false;
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.hidden = true;
      
      // Feld ausgrauen und in DB als benutzt speichern
      if (qData.catIndex !== undefined && qData.value !== undefined) {
        markCellUsed(qData.catIndex, qData.value);
      }
      if (btn) {
        btn.disabled = true;
      }

      // Frage-Fenster für alle anderen wieder schließen
      setActiveQuestion(null);
    };
  }

  overlay.hidden = false;
}

// Klick auf grauen Hintergrund schließt das Modal
const overlay = document.getElementById('overlay');
if (overlay) {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.hidden = true;
      setActiveQuestion(null);
    }
  });
}
