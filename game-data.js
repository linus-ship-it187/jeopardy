// ---- Hier die eigenen Kategorien & Fragen eintragen ----
export const DATA = [
  {
    category: "Zurück in die Schule",
    questions: {
      100: { q: "In welchem Fach dreht sich alles um Zahlen und Gleichungen?", a: "Mathematik" },
      200: { q: "Wie heißt das Gebäude, in dem der Unterricht stattfindet?", a: "Schule" },
      300: { q: "Wie nennt man die Pause zwischen den Schulstunden?", a: "Hofpause" },
      400: { q: "Wie heißt das Zeugnis am Ende eines Schuljahres?", a: "Abschlusszeugnis" },
      500: { q: "Wie nennt man den ersten Schultag nach den Sommerferien?", a: "Einschulung / Schulstart" }
    }
  },
  {
    category: "Da fragt man sich...",
    questions: {
      100: { q: "Warum ist der Himmel blau?", a: "Rayleigh-Streuung des Sonnenlichts" },
      200: { q: "Warum gähnen wir, wenn andere gähnen?", a: "Ansteckendes Gähnen / Empathie" },
      300: { q: "Warum schmecken manche Dinge nach dem Zähneputzen komisch?", a: "Natriumlaurylsulfat in Zahnpasta" },
      400: { q: "Warum knackt man mit den Fingern?", a: "Gasblasen im Gelenk platzen" },
      500: { q: "Warum bekommt man manchmal ein Déjà-vu?", a: "Kurzschluss der Gedächtnisverarbeitung im Gehirn" }
    }
  },
  {
    category: "Von wem stammt der YouTube-Titel?",
    questions: {
      100: { q: "'Mein erster Tag als...'", a: "Beispiel-Creator eintragen" },
      200: { q: "'Ich habe 24 Stunden lang...'", a: "Beispiel-Creator eintragen" },
      300: { q: "'Was passiert wenn...'", a: "Beispiel-Creator eintragen" },
      400: { q: "'Der teuerste...'", a: "Beispiel-Creator eintragen" },
      500: { q: "'Wir haben es endlich geschafft'", a: "Beispiel-Creator eintragen" }
    }
  },
  {
    category: "Vom Lyrics zum Songtitel",
    questions: {
      100: { q: "'Atemlos durch die Nacht'", a: "Atemlos" },
      200: { q: "'Ein Kompliment'", a: "Ein Kompliment" },
      300: { q: "'99 Luftballons'", a: "99 Luftballons" },
      400: { q: "'Er gehört zu mir'", a: "Er gehört zu mir" },
      500: { q: "'Auf uns'", a: "Auf uns" }
    }
  },
  {
    category: "Wofür steht die Abkürzung?",
    questions: {
      100: { q: "LOL", a: "Laughing Out Loud" },
      200: { q: "AFK", a: "Away From Keyboard" },
      300: { q: "GG", a: "Good Game" },
      400: { q: "NPC", a: "Non-Player Character" },
      500: { q: "IRL", a: "In Real Life" }
    }
  }
];

export const VALUES = [100, 200, 300, 400, 500];

// Ausgangs-Spielerliste. Wird nur EINMALIG in die Datenbank geschrieben,
// falls dort noch keine Spieler existieren (siehe sync.js: seedPlayersIfEmpty).
// Danach ist die Datenbank die "Wahrheit" — Namen/Punkte änderst du auf host.html.
export let PLAYERS = [
  { id: 1, name: 'Niek', score: 0 },
  { id: 2, name: 'Basti', score: 0 },
  { id: 3, name: 'Kevin', score: 0 }
];
