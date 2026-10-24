// ---- Hier die eigenen Kategorien & Fragen eintragen ----
// Optional pro Frage: img: 'bilder/datei.png' (eigene Datei im Repo) oder img: 'https://…' (Link) — wird im Frage-Fenster mit angezeigt.

// Runde 1 (normale Punkte)
const ROUND1_CATEGORIES = [
  {
    category: "Flaggen",
    questions: {
      100: { q: "Welches Land hat diese Flagge?", a: "Frankreich", img: "https://flagcdn.com/w640/fr.png" },
      200: { q: "Welches Land hat diese Flagge?", a: "Brasilien", img: "https://flagcdn.com/w640/br.png" },
      300: { q: "Welches Land hat diese Flagge?", a: "Südkorea", img: "https://flagcdn.com/w640/kr.png" },
      400: { q: "Welches Land hat diese Flagge?", a: "Bolivien", img: "https://flagcdn.com/w640/bo.png" },
      500: { q: "Welches Land hat diese Flagge?", a: "Tschad (sieht fast aus wie die Flagge von Rumänien)", img: "https://flagcdn.com/w640/td.png" }
    }
  },
  {
    category: "Sehenswürdigkeiten",
    questions: {
      100: { q: "Welche Sehenswürdigkeit ist das?", a: "Eiffelturm", img: "wiki:Eiffel_Tower" },
      200: { q: "Welche Sehenswürdigkeit ist das?", a: "Kolosseum", img: "wiki:Colosseum" },
      300: { q: "Welche Sehenswürdigkeit ist das?", a: "Taj Mahal", img: "wiki:Taj_Mahal" },
      400: { q: "Welche Sehenswürdigkeit ist das?", a: "Petra", img: "wiki:Petra" },
      500: { q: "Welche Sehenswürdigkeit ist das?", a: "Angkor Wat", img: "wiki:Angkor_Wat" }
    }
  },
  {
    category: "Minecraft",
    questions: {
      100: { q: "Welcher Block ist das? Er kommt im Nether vor, leuchtet gelb-orange und lässt beim Abbauen Staub fallen.", a: "Glowstone (Leuchtstein)" },
      200: { q: "Was wurde bei Minecraft Live angekündigt?", a: "das sift" },
      300: { q: "Welche drei Gegenstände brauchst du, um einen Enderkristall herzustellen?", a: "Glas, Enderauge, Ghast-Träne" },
      400: { q: "Wie viele Obsidianblöcke brauchst du mindestens für ein Netherportal, wenn du die Ecken weglässt?", a: "10 Obsidianblöcke" },
      500: { q: "Wie viele verschiedene Verzauberungen kann eine Armbrust in Minecraft gleichzeitig haben, wenn man inkompatible Verzauberungen ausschließt?", a: "3 Verzauberungen" }
    }
  },
  {
    category: "Von wem stammt der YouTube-Titel?",
    questions: {
      100: { q: "„Basti überrascht mich in Craft Attack!“", a: "PapaPlatte" },
      200: { q: "„BEST OF ZOOM TROLLING 😂“", a: "Gleggmire" },
      300: { q: "„Ich ROASTE eure PEINLICHEN Zimmer...“", a: "LetsHugo" },
      400: { q: "„Wir öffnen eine MYSTERIÖSE LAGERHALLE! HISTORISCHE FUNDE und UNGEÖFFNETE AMAZON PAKETE 📦“", a: "Zarbex" },
      500: { q: "„die ganze Base besteht aus Shade Lucky Blocks.. Minecraft LUCKY BLOCK BEDWARS“", a: "Alphastein" }
    }
  },
  {
    category: "Zahlen",
    questions: {
      100: { q: "Wie viele Sekunden hat eine Stunde?", a: "3600 Sekunden" },
      200: { q: "Ein Zug hat 8 Waggons. In jedem Waggon sitzen 24 Personen. Wie viele Personen sind es insgesamt?", a: "192 Personen" },
      300: { q: "Welche Zahl fehlt? 3, 8, 15, 24, 35, __ ?", a: "48" },
      400: { q: "Ein Vater ist 36 Jahre alt und sein Sohn 12 Jahre. In wie vielen Jahren ist der Vater doppelt so alt wie sein Sohn?", a: "12 Jahre" },
      500: { q: "Du hast 100 €. Du kaufst 3 Bücher für je 12 € und 2 Spiele für je 17 €. Wie viel Geld bleibt übrig?", a: "30 €" }
    }
  }
];

// Runde 2 (x2 — doppelte Punkte)
const ROUND2_CATEGORIES = [
  {
    category: "Promis",
    questions: {
      200: { q: "Wie alt ist Taylor Swift?", a: "36 Jahre" },
      400: { q: "Wie viele Mitglieder hat die K-Pop-Gruppe BTS?", a: "7 Mitglieder" },
      600: { q: "In welchem Jahr wurde Cristiano Ronaldo geboren?", a: "1985" },
      800: { q: "Wie viele Oscars hat Leonardo DiCaprio bisher gewonnen?", a: "1 Oscar" },
      1000: { q: "In welchem Jahr wurde Michael Jackson geboren?", a: "1958" }
    }
  },
  {
    category: "Twitch Emotes",
    questions: {
      200: { q: "Wie heißt dieses 7TV-Emote?", a: "catJAM", img: "catjam.gif" },
      400: { q: "Wie heißt dieses 7TV-Emote?", a: "Clueless", img: "clueless.png" },
      600: { q: "Wie heißt dieses 7TV-Emote?", a: "peepoBye", img: "peepobye.gif" },
      800: { q: "Wie heißt dieses 7TV-Emote?", a: "danse", img: "danse.gif" },
      1000: { q: "Wie heißt dieses 7TV-Emote?", a: "Listening", img: "listening.gif" }
    }
  },
  {
    category: "Deutschland",
    questions: {
      200: { q: "Wie viele Bundesländer hat Deutschland?", a: "16" },
      400: { q: "In welchem Jahr fiel die Berliner Mauer?", a: "1989" },
      600: { q: "Wie viele Einwohner hat Deutschland ungefähr? (in Millionen)", a: "84 Millionen" },
      800: { q: "In welchem Jahr wurde Deutschland Fußball-Weltmeister bei der Männer-WM in Brasilien?", a: "2014" },
      1000: { q: "Wie viele Stufen hat die Treppe zum Deutschen Bundestag im Reichstagsgebäude?", a: "230 Stufen" }
    }
  },
  {
    category: "Abkürzungen",
    questions: {
      200: { q: "Wofür steht GmbH?", a: "Gesellschaft mit beschränkter Haftung" },
      400: { q: "Wofür steht BIP?", a: "Bruttoinlandsprodukt" },
      600: { q: "Wofür steht NATO?", a: "North Atlantic Treaty Organization" },
      800: { q: "Wofür steht HTTP?", a: "Hypertext Transfer Protocol" },
      1000: { q: "Wofür steht DNA?", a: "Desoxyribonukleinsäure" }
    }
  },
  {
    category: "Flixo",
    questions: {
      200: { q: "Wie heißt Flixo?", a: "Felix" },
      400: { q: "Nenn 1 VIP auf Flixos Channel (kein Streamer).", a: "Eine davon reicht: alwk_magda, ani__2007, bannanen_peter, borniop, dystopiaflame, emma_16_cl, erbauer95, gamerdon2, gwalextv, helotelo16, kailikesc00kies, lea_keinbock, leo_mxxm, lisadiesock, mama_flixo, proxer109, snayxxxx, texmex2363, veifex, vibezznyn, wh0s_henri, zpexpe, zpudd1ng" },
      600: { q: "Wann hat Flixo angefangen zu streamen? (Monat)", a: "März 2025" },
      800: { q: "Wann hat Flixo Geburtstag?", a: "9. November 2010" },
      1000: { q: "Wie heißt Flixos Schwester?", a: "Ronja" }
    }
  }
];

const BOARDS = [
  { name: 'Runde 1', values: [100, 200, 300, 400, 500], categories: ROUND1_CATEGORIES },
  { name: 'Runde 2 (x2)', values: [200, 400, 600, 800, 1000], categories: ROUND2_CATEGORIES }
];

// Ausgangs-Spielerliste. Wird nur EINMALIG in die Datenbank geschrieben,
// falls dort noch keine Spieler existieren (siehe sync.js: seedPlayersIfEmpty).
// Danach ist die Datenbank die "Wahrheit" — Namen/Punkte änderst du auf host.html.
// Feste Teams für den Team-Modus (3 Teams à 2 Personen, farblich unterschieden).
const TEAM_DEFS = [
  { name: 'Team Rot', color: '#e63946' },
  { name: 'Team Blau', color: '#3a86ff' },
  { name: 'Team Lila', color: '#8e44ad' }
];

let PLAYERS = [
  { id: 1, name: 'Niek', score: 0, team: '' },
  { id: 2, name: 'Basti', score: 0, team: '' },
  { id: 3, name: 'Kevin', score: 0, team: '' }
];
