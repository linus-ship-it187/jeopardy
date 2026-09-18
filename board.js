// cellRefs merkt sich jede Zellen-Schaltfläche unter ihrem Schlüssel ("<kategorieIndex>_<wert>"),

// damit wir sie später (bei einem Firebase-Update) gezielt ausgrauen können.

let cellRefs = {};



// interactive = true  -> Board ist klickbar (host.html), Fragen öffnen sich

// interactive = false -> Board ist reine Anzeige (index.html), kein Klick möglich

function renderBoard(interactive){

  const grid = document.getElementById('board-grid');

  grid.style.setProperty('--cols', DATA.length);

  grid.innerHTML = '';

  cellRefs = {};



  DATA.forEach(cat => {

    const label = document.createElement('div');

    label.className = 'category';

    label.textContent = cat.category;

    grid.appendChild(label);

  });



  VALUES.forEach(value => {

    DATA.forEach((cat, catIndex) => {

      const btn = document.createElement('button');

      btn.className = 'cell';

      btn.textContent = value;

      cellRefs[cellKey(catIndex, value)] = btn;



      if (interactive) {

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

    markCellUsed(catIndex, value);

  };

}



overlay.addEventListener('click', (e) => {

  if (e.target === overlay) {

    overlay.hidden = true;

  }

});
