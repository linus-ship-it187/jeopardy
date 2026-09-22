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
const modalAnswer = document.getElementById('modal-answer');
const revealBtn = document.getElementById('reveal-btn');
const closeBtn = document.getElementById('close-btn');

let openBtn = null; // Board-Zelle, die gerade offen ist (nur beim Host relevant, zum Ausgrauen beim Schließen)

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
