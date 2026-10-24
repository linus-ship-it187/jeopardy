// cellRefs merkt sich jede Zellen-Schaltfläche der AKTUELLEN Runde unter ihrem Schlüssel,
// damit wir sie später (bei einem Firebase-Update) gezielt ausgrauen können.
let cellRefs = {};
let currentInteractive = false;
let currentBoardIndex = 0;

// interactive = true  -> Board ist klickbar (host.html), Fragen öffnen sich
// interactive = false -> Board ist reine Anzeige (index.html), kein Klick möglich
function renderBoard(interactive){
  currentInteractive = interactive;
  renderCurrentBoard();
}

// Wird aufgerufen, wenn sich die Runde ändert (z. B. durch den "x2"-Button des Hosts).
function setBoardIndex(idx){
  currentBoardIndex = idx;
  renderCurrentBoard();
}

function renderCurrentBoard(){
  const board = BOARDS[currentBoardIndex];
  const grid = document.getElementById('board-grid');
  grid.style.setProperty('--cols', board.categories.length);
  grid.innerHTML = '';
  cellRefs = {};

  const titleEl = document.getElementById('board-title');
  if (titleEl) titleEl.textContent = board.name;

  board.categories.forEach(cat => {
    const label = document.createElement('div');
    label.className = 'category';
    label.textContent = cat.category;
    grid.appendChild(label);
  });

  board.values.forEach(value => {
    board.categories.forEach((cat, catIndex) => {
      const btn = document.createElement('button');
      btn.className = 'cell';
      btn.textContent = value;
      cellRefs[cellKey(currentBoardIndex, catIndex, value)] = btn;

      if (currentInteractive) {
        btn.addEventListener('click', () => openQuestion(cat, catIndex, value, btn));
      } else {
        btn.style.cursor = 'default';
      }

      grid.appendChild(btn);
    });
  });
}

// Wird von watchUsedCells() aufgerufen, sobald sich der Board-Status in der DB ändert.
// Setzt disabled sowohl auf true als auch zurück auf false, damit ein Reset
// (leeres usedCells-Objekt) die Zellen auch wieder freigibt.
function applyUsedCells(usedCells){
  Object.keys(cellRefs).forEach(key => {
    cellRefs[key].disabled = !!usedCells[key];
  });
}

const overlay = document.getElementById('overlay');
const modalMeta = document.getElementById('modal-meta');
const modalQuestion = document.getElementById('modal-question');
const modalImage = document.getElementById('modal-image');
const modalAnswer = document.getElementById('modal-answer');
const revealBtn = document.getElementById('reveal-btn');
const closeBtn = document.getElementById('close-btn');

let openBtn = null; // Board-Zelle, die gerade offen ist (nur beim Host relevant, zum Ausgrauen beim Schließen)

// ---- Bild zur Frage ----
// In game-data.js pro Frage: img: 'datei.png' (liegt im Repo), img: 'https://…' (Link)
// oder img: 'wiki:Seitenname' (Titelbild des englischen Wikipedia-Artikels, z. B. 'wiki:Eiffel_Tower').
const imgCache = {}; // img-Angabe -> { primary, fallback }

async function resolveImage(spec){
  if (imgCache[spec]) return imgCache[spec];
  let result;
  if (spec.startsWith('wiki:')) {
    const title = spec.slice(5);
    const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
    if (!r.ok) throw new Error('Wikipedia-Abfrage fehlgeschlagen (' + r.status + ')');
    const d = await r.json();
    const thumb = d.thumbnail && d.thumbnail.source;
    const orig = d.originalimage && d.originalimage.source;
    if (!thumb && !orig) throw new Error('Kein Bild gefunden für ' + title);
    // größere Vorschau (960px); falls die nicht lädt, greift die kleine bzw. das Original
    result = thumb
      ? { primary: thumb.replace(/\/\d+px-/, '/960px-'), fallback: thumb }
      : { primary: orig, fallback: orig };
  } else {
    result = { primary: spec, fallback: spec };
  }
  imgCache[spec] = result;
  return result;
}

function setModalImage(spec){
  if (!modalImage) return;
  if (!spec) {
    delete modalImage.dataset.spec;
    modalImage.removeAttribute('src');
    modalImage.hidden = true;
    return;
  }
  modalImage.hidden = false;

  // Gleiche Frage nochmal (z. B. beim Antwort-Zeigen): Bild nicht neu laden.
  if (modalImage.dataset.spec === spec && modalImage.getAttribute('src')) return;

  modalImage.dataset.spec = spec;

  // Normale Datei oder Link: sofort anzeigen, ohne Umweg.
  if (!spec.startsWith('wiki:')) {
    modalImage.dataset.fallback = spec;
    modalImage.alt = '';
    modalImage.src = spec;
    return;
  }

  modalImage.alt = 'Bild wird geladen …';
  modalImage.removeAttribute('src');

  resolveImage(spec).then(res => {
    if (modalImage.dataset.spec !== spec) return; // inzwischen andere Frage offen
    modalImage.dataset.fallback = res.fallback;
    modalImage.src = res.primary;
  }).catch(err => {
    console.error('[Bild]', err);
    if (modalImage.dataset.spec === spec) modalImage.alt = '⚠ Bild konnte nicht geladen werden';
  });
}

if (modalImage) {
  modalImage.addEventListener('error', () => {
    const fb = modalImage.dataset.fallback;
    const current = modalImage.getAttribute('src');
    if (fb && current && current !== fb) {
      modalImage.src = fb;           // zweiter Versuch mit der kleineren Version
    } else {
      modalImage.alt = '⚠ Bild nicht gefunden: ' + (current || '');
    }
  });
}

// Host: Klick auf eine Zelle öffnet die Frage — für ALLE sichtbar, über Firebase.
function openQuestion(cat, catIndex, value, btn){
  openBtn = btn;
  setOpenQuestion({ boardIndex: currentBoardIndex, catIndex, value, revealed: false });
}

// Zeigt die aktuell offene Frage an (wird von watchOpenQuestion sowohl beim Host
// als auch bei allen Zuschauern aufgerufen — so sehen alle dieselbe Frage).
function displayQuestion(data){
  const board = BOARDS[data.boardIndex];
  const cat = board.categories[data.catIndex];
  const item = cat.questions[data.value];

  modalMeta.textContent = `${cat.category} — ${data.value}`;
  modalQuestion.textContent = item.q;
  setModalImage(item.img);
  modalAnswer.textContent = item.a;
  modalAnswer.hidden = !data.revealed;
  overlay.hidden = false;

  // Nur der Host bekommt die Bedienknöpfe — Zuschauer sehen nur die Frage/Antwort.
  revealBtn.style.display = currentInteractive ? 'inline-block' : 'none';
  closeBtn.style.display = currentInteractive ? 'inline-block' : 'none';

  if (currentInteractive) {
    revealBtn.textContent = 'Antwort zeigen';
    revealBtn.onclick = () => {
      setOpenQuestion({ boardIndex: data.boardIndex, catIndex: data.catIndex, value: data.value, revealed: true });
    };
    closeBtn.onclick = () => {
      clearOpenQuestion();
      if (openBtn) openBtn.disabled = true;
      markCellUsed(data.boardIndex, data.catIndex, data.value);
    };
  }
}

function hideQuestionModal(){
  overlay.hidden = true;
}
