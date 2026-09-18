function renderBoard(){
  const grid = document.getElementById('board-grid');
  grid.style.setProperty('--cols', DATA.length);

  DATA.forEach(cat => {
    const label = document.createElement('div');
    label.className = 'category';
    label.textContent = cat.category;
    grid.appendChild(label);
  });

  VALUES.forEach(value => {
    DATA.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cell';
      btn.textContent = value;
      btn.addEventListener('click', () => openQuestion(cat, value, btn));
      grid.appendChild(btn);
    });
  });
}

const overlay = document.getElementById('overlay');
const modalMeta = document.getElementById('modal-meta');
const modalQuestion = document.getElementById('modal-question');
const modalAnswer = document.getElementById('modal-answer');
const revealBtn = document.getElementById('reveal-btn');
const closeBtn = document.getElementById('close-btn');

function openQuestion(cat, value, btn){
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
  };
}

overlay.addEventListener('click', (e) => {
  if(e.target === overlay){
    overlay.hidden = true;
  }
});

renderBoard();
