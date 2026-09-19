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
function applyUsedCells(usedCells){
  Object.keys(cellRefs).forEach(key => {
    if (usedCells[key]) {
      cellRefs[key].disabled = true;
    }
  });
}

const overlay = document.getElementById('overlay');
const modalMeta = document.getElementById('modal-meta');
const modalQuestion = document.getElementById('modal-question');
const modalAnswer = document.getElementById('modal-answer');
const revealBtn = document.getElementById('reveal-btn');
const closeBtn = document.getElementById('close-btn');

function openQuestion(cat, catIndex, value, btn){
  const item = cat.questions[value];
  modalMeta.textContent = `${cat.category} — ${value}`;
  modalQuestion.textContent = item.q;
  modalAnswer.textContent = item.a;
  modalAnswer.hidden = true;
  revealBtn.textContent = 'Antwort zeigen';
  overlay.hidden = false;
  revealBtn.onclick = () => {
    modalAnswer.hidden = false;
  };
  closeBtn.onclick = () => {
    overlay.hidden = true;
    btn.disabled = true;
    markCellUsed(currentBoardIndex, catIndex, value);
  };
}

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    overlay.hidden = true;
  }
});
