// ---- Team-Blasen: 3 farbige Kreise, je 2 Personen, sichtbar wenn Team-Modus an ist ----

const teamBubblesRow = document.getElementById('team-bubbles');
const bubbleRefs = {}; // teamName -> { bubble, nameList, scoreEl }

function buildBubble(teamDef){
  const bubble = document.createElement('div');
  bubble.className = 'team-bubble';
  bubble.style.background = teamDef.color;

  const title = document.createElement('div');
  title.className = 'team-bubble-title';
  title.textContent = teamDef.name;

  const nameList = document.createElement('div');
  nameList.className = 'team-bubble-names';

  const scoreEl = document.createElement('div');
  scoreEl.className = 'team-bubble-score';

  bubble.appendChild(title);
  bubble.appendChild(nameList);
  bubble.appendChild(scoreEl);

  return { bubble, nameList, scoreEl };
}

function renderTeamBubbles(players){
  if (!teamBubblesRow) return;

  TEAM_DEFS.forEach(teamDef => {
    if (!bubbleRefs[teamDef.name]) {
      bubbleRefs[teamDef.name] = buildBubble(teamDef);
      teamBubblesRow.appendChild(bubbleRefs[teamDef.name].bubble);
    }
    const members = players.filter(p => p.team === teamDef.name);
    const ref = bubbleRefs[teamDef.name];
    ref.nameList.textContent = members.length
      ? members.map(m => m.name).join(' & ')
      : '(noch niemand)';
    ref.scoreEl.textContent = members.length ? members[0].score : 0;
  });
}

function showTeamBubbles(show){
  if (teamBubblesRow) teamBubblesRow.style.display = show ? 'flex' : 'none';
}
