import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { summarizeRatingActivity } from "./activitySummary.js";
import { createCardMatch } from "./matchmaker.js";
import { createRatingStore } from "./ratingStoreFactory.js";
import { ScryfallRandomCardSource } from "./scryfallRandomCardSource.js";
import type { MatchStrategy } from "./ratingTypes.js";

const DEFAULT_PORT = 5174;

const store = createRatingStore();
const randomCardSource = new ScryfallRandomCardSource();

const server = createServer(async (request, response) => {
  try {
    await routeRequest(request, response);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
server.listen(port, () => {
  console.log(`MTG Deck Oracle running at http://localhost:${port}`);
});

async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/") {
    sendHtml(response, renderLandingPage());
    return;
  }

  if (request.method === "GET" && url.pathname === "/rating-lab") {
    sendHtml(response, renderHomePage());
    return;
  }

  if (request.method === "GET" && url.pathname === "/graph") {
    sendHtml(response, renderGraphPage());
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && isApiPath(url.pathname, "match")) {
    const match = await createCardMatch(store, randomCardSource);
    sendJson(response, 200, match);
    return;
  }

  if (request.method === "POST" && isApiPath(url.pathname, "vote")) {
    const body = await readJsonBody<{ winnerCardId?: string; loserCardId?: string; strategy?: MatchStrategy; visitorId?: string }>(request);

    if (!body.winnerCardId || !body.loserCardId || !body.strategy) {
      sendJson(response, 400, { error: "winnerCardId, loserCardId and strategy are required." });
      return;
    }

    const comparison = await store.recordVote(body.winnerCardId, body.loserCardId, body.strategy, sanitizeVisitorId(body.visitorId));
    sendJson(response, 200, comparison);
    return;
  }

  if (request.method === "GET" && isApiPath(url.pathname, "stats")) {
    const database = await store.getDatabase();
    const uniqueVisitors = new Set(database.comparisons.flatMap((comparison) => (comparison.visitorId ? [comparison.visitorId] : [])));
    sendJson(response, 200, {
      cards: Object.keys(database.cards).length,
      comparisons: database.comparisons.length,
      uniqueVisitors: uniqueVisitors.size,
    });
    return;
  }

  if (request.method === "GET" && isApiPath(url.pathname, "activity")) {
    const database = await store.getDatabase();
    sendJson(response, 200, summarizeRatingActivity(database.comparisons));
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

function isApiPath(pathname: string, endpoint: "activity" | "match" | "stats" | "vote"): boolean {
  return pathname === `/api/rating-lab/${endpoint}` || pathname === `/api/${endpoint}`;
}

function sanitizeVisitorId(visitorId: string | undefined): string | undefined {
  if (!visitorId) {
    return undefined;
  }

  const trimmedVisitorId = visitorId.trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(trimmedVisitorId) ? trimmedVisitorId : undefined;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendHtml(response: ServerResponse, body: string): void {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(body);
}

function renderLandingPage(): string {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MTG Deck Oracle</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
    main { max-width: 960px; margin: 0 auto; padding: 56px 32px; }
    .hero { background: linear-gradient(135deg, #1e293b, #312e81); border: 1px solid #334155; border-radius: 24px; padding: 40px; }
    h1 { font-size: clamp(2.25rem, 6vw, 4.5rem); margin: 0 0 16px; }
    p { color: #cbd5e1; font-size: 1.1rem; line-height: 1.7; }
    a { display: inline-block; margin-top: 20px; background: #22c55e; color: #052e16; padding: 12px 18px; border-radius: 12px; font-weight: 800; text-decoration: none; }
    a.secondary { background: #60a5fa; color: #082f49; margin-left: 10px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 18px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>MTG Deck Oracle</h1>
      <p>Analisi Commander pensata per valutare forza, consistenza, curva, combo e piano di gioco di un mazzo con un punteggio leggibile da 0 a 100.</p>
      <a href="/rating-lab">Apri Rating Lab</a>
      <a class="secondary" href="/graph">Vedi Grafico</a>
    </section>
    <section class="grid">
      <article class="card"><h2>Deck Analysis</h2><p>Import decklist, validazione Commander e scoring sono il cuore del prodotto.</p></article>
      <article class="card"><h2>Combo & Curve</h2><p>Il motore considera combo, costo di mana, velocita' e probabilita' di trovare i pezzi.</p></article>
      <article class="card"><h2>Rating Lab</h2><p>La raccolta dati aiuta a raffinare il valore base delle singole carte.</p></article>
    </section>
  </main>
</body>
</html>`;
}

function renderGraphPage(): string {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MTG Deck Oracle Activity Graph</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px; }
    a { color: #93c5fd; }
    .panel { background: #1e293b; border: 1px solid #334155; border-radius: 18px; padding: 20px; margin-top: 20px; }
    .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .stat { background: #111827; border-radius: 14px; padding: 16px; }
    .stat strong { display: block; font-size: 2rem; }
    .chart { display: flex; align-items: end; gap: 10px; height: 320px; padding-top: 24px; overflow-x: auto; }
    .bar-wrapper { min-width: 56px; text-align: center; color: #cbd5e1; }
    .bar { width: 100%; min-height: 2px; border-radius: 10px 10px 0 0; background: linear-gradient(180deg, #22c55e, #16a34a); }
    .label { font-size: 0.78rem; margin-top: 8px; }
    .empty { color: #cbd5e1; }
    @media (max-width: 760px) { .stats { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <p><a href="/">Home</a> · <a href="/rating-lab">Rating Lab</a></p>
    <h1>Andamento Valutazioni</h1>
    <p>Grafico dei voti raccolti nel tempo. Gli utenti sono conteggiati tramite visitor id anonimo salvato nel browser.</p>
    <section class="stats">
      <article class="stat"><span>Voti totali</span><strong id="totalComparisons">-</strong></article>
      <article class="stat"><span>Visitatori distinti</span><strong id="uniqueVisitors">-</strong></article>
    </section>
    <section class="panel">
      <h2>Voti per giorno</h2>
      <div id="chart" class="chart"><p class="empty">Caricamento...</p></div>
    </section>
  </main>
  <script>
    async function loadActivity() {
      const activity = await fetch('/api/rating-lab/activity').then((response) => response.json());
      document.getElementById('totalComparisons').textContent = activity.totalComparisons;
      document.getElementById('uniqueVisitors').textContent = activity.uniqueVisitors;
      renderChart(activity.dailyComparisons);
    }

    function renderChart(days) {
      const chart = document.getElementById('chart');

      if (!days.length) {
        chart.innerHTML = '<p class="empty">Nessuna valutazione registrata.</p>';
        return;
      }

      const maxComparisons = Math.max(...days.map((day) => day.comparisons));
      chart.innerHTML = days.map((day) => {
        const height = Math.max(2, Math.round((day.comparisons / maxComparisons) * 260));
        return '<div class="bar-wrapper" title="' + day.comparisons + ' voti, ' + day.uniqueVisitors + ' visitatori">' +
          '<div class="bar" style="height:' + height + 'px"></div>' +
          '<div class="label">' + escapeHtml(day.date.slice(5)) + '<br>' + day.comparisons + '</div>' +
          '</div>';
      }).join('');
    }

    function escapeHtml(value) {
      return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
    }

    loadActivity();
  </script>
</body>
</html>`;
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function renderHomePage(): string {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MTG Deck Oracle Rating Lab</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #111827; color: #f9fafb; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px; }
    .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-top: 24px; }
    .card { background: #1f2937; border: 1px solid #374151; border-radius: 16px; padding: 16px; }
    .card img { width: 100%; border-radius: 12px; background: #111827; }
    .meta { color: #d1d5db; min-height: 48px; }
    button { width: 100%; padding: 12px 16px; border: 0; border-radius: 12px; cursor: pointer; font-weight: 700; }
    button:hover { filter: brightness(1.1); }
    .vote { background: #22c55e; color: #052e16; }
    .next { width: auto; background: #60a5fa; color: #082f49; margin-top: 16px; }
    .status { color: #9ca3af; margin-top: 16px; }
    @media (max-width: 760px) { .cards { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>MTG Deck Oracle Rating Lab</h1>
    <p>Scegli quale carta ritieni piu' forte. Ogni voto aggiorna un rating Elo salvato nel database.</p>
    <p id="strategy" class="status">Caricamento...</p>
    <section class="cards">
      <article class="card" id="left"></article>
      <article class="card" id="right"></article>
    </section>
    <button class="next" onclick="loadMatch()">Salta confronto</button>
    <p id="stats" class="status"></p>
  </main>
  <script>
    const visitorId = getOrCreateVisitorId();
    let currentMatch = null;

    async function loadMatch() {
      document.getElementById('strategy').textContent = 'Caricamento...';
      currentMatch = await fetch('/api/rating-lab/match').then((response) => response.json());
      document.getElementById('strategy').textContent = 'Strategia match: ' + currentMatch.strategy;
      renderCard('left', currentMatch.left, currentMatch.right);
      renderCard('right', currentMatch.right, currentMatch.left);
      loadStats();
    }

    function renderCard(elementId, card, opponent) {
      const image = card.imageUrl ? '<img src="' + card.imageUrl + '" alt="' + escapeHtml(card.name) + '">' : '<div class="meta">Nessuna immagine disponibile</div>';
      document.getElementById(elementId).innerHTML =
        image +
        '<h2>' + escapeHtml(card.name) + '</h2>' +
        '<p class="meta">' + escapeHtml(card.typeLine) + '<br>Rating: ' + card.rating + ' | W: ' + card.wins + ' L: ' + card.losses + '</p>' +
        '<button class="vote" onclick="vote(\\'' + card.id + '\\', \\'' + opponent.id + '\\')">Questa e piu forte</button>';
    }

    async function vote(winnerCardId, loserCardId) {
      await fetch('/api/rating-lab/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerCardId, loserCardId, strategy: currentMatch.strategy, visitorId })
      });
      await loadMatch();
    }

    async function loadStats() {
      const stats = await fetch('/api/rating-lab/stats').then((response) => response.json());
      document.getElementById('stats').textContent = 'Carte valutate: ' + stats.cards + ' | Confronti: ' + stats.comparisons;
    }

    function escapeHtml(value) {
      return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
    }

    function getOrCreateVisitorId() {
      const storageKey = 'mtgDeckOracleVisitorId';
      const existingVisitorId = localStorage.getItem(storageKey);

      if (existingVisitorId) {
        return existingVisitorId;
      }

      const generatedVisitorId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem(storageKey, generatedVisitorId);
      return generatedVisitorId;
    }

    loadMatch();
  </script>
</body>
</html>`;
}
