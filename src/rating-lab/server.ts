import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import {
  ANALYZE_PATH,
  MAX_ANALYZE_BODY_BYTES,
  analyzeDeckToHtml,
  extractDecklistFromRequestBody,
  renderAnalyzeFormPage,
} from "../deck-report/index.js";
import { createAnalyzeRuntime, type AnalyzeRuntime } from "../pipeline/index.js";
import { applyConfiguredRatingSeeds } from "./bestCardSeed.js";
import { summarizeRatingActivity } from "./activitySummary.js";
import { createCardMatch } from "./matchmaker.js";
import { enrichLeaderboardCards } from "./leaderboardEnrichment.js";
import { createRatingStore } from "./ratingStoreFactory.js";
import { ScryfallRatingCardDetailsSource } from "./scryfallRatingCardDetailsSource.js";
import { ScryfallRandomCardSource } from "./scryfallRandomCardSource.js";
import type { FirstCardRatingPool } from "./matchmaker.js";
import type { MatchStrategy } from "./ratingTypes.js";

const DEFAULT_PORT = 5174;

let analyzeRuntimePromise: Promise<AnalyzeRuntime> | undefined;

const store = createRatingStore();
const randomCardSource = new ScryfallRandomCardSource();
const ratingCardDetailsSource = new ScryfallRatingCardDetailsSource();
const seedResults = await applyConfiguredRatingSeeds(store);

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
  for (const seedResult of seedResults) {
    if (seedResult.cards > 0) {
      console.log(`${seedResult.seedName} rating seed ${seedResult.applied ? "applied" : "already applied"} for ${seedResult.cards} cards.`);
    }
  }
});

async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/") {
    sendHtml(response, renderLandingPage());
    return;
  }

  if (request.method === "GET" && url.pathname === ANALYZE_PATH) {
    sendHtml(response, renderAnalyzeFormPage());
    return;
  }

  if (request.method === "POST" && url.pathname === ANALYZE_PATH) {
    await handleAnalyzeDeck(request, response);
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

  if (request.method === "GET" && url.pathname === "/leaderboard") {
    sendHtml(response, renderLeaderboardPage());
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && isApiPath(url.pathname, "match")) {
    const match = await createCardMatch(store, randomCardSource, {
      firstCardRatingPool: parseFirstCardRatingPool(url.searchParams.get("firstPool")),
    });
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

  if (request.method === "GET" && isApiPath(url.pathname, "leaderboard")) {
    const page = parsePositiveInteger(url.searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInteger(url.searchParams.get("pageSize"), 100), 100);
    const leaderboard = await store.findLeaderboardCards(page, pageSize);
    sendJson(response, 200, {
      ...leaderboard,
      cards: await enrichLeaderboardCards(store, ratingCardDetailsSource, leaderboard.cards),
    });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

function isApiPath(pathname: string, endpoint: "activity" | "leaderboard" | "match" | "stats" | "vote"): boolean {
  return pathname === `/api/rating-lab/${endpoint}` || pathname === `/api/${endpoint}`;
}

function sanitizeVisitorId(visitorId: string | undefined): string | undefined {
  if (!visitorId) {
    return undefined;
  }

  const trimmedVisitorId = visitorId.trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(trimmedVisitorId) ? trimmedVisitorId : undefined;
}

function parseFirstCardRatingPool(value: string | null): FirstCardRatingPool {
  return value === "weak" || value === "medium" || value === "strong" ? value : "all";
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendHtml(response: ServerResponse, body: string, statusCode = 200): void {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(body);
}

async function handleAnalyzeDeck(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readLimitedBody(request, MAX_ANALYZE_BODY_BYTES);

  if (!body.ok) {
    sendHtml(response, renderAnalyzeFormPage("La lista e' troppo lunga."), 413);
    return;
  }

  let decklist: string;

  try {
    decklist = extractDecklistFromRequestBody(request.headers["content-type"], body.text);
  } catch {
    sendHtml(response, renderAnalyzeFormPage("Il corpo della richiesta non e' valido."), 400);
    return;
  }

  const runtime = await getAnalyzeRuntime();
  const result = await analyzeDeckToHtml(decklist, runtime);
  sendHtml(response, result.html, result.statusCode);
}

async function getAnalyzeRuntime(): Promise<AnalyzeRuntime> {
  if (!analyzeRuntimePromise) {
    analyzeRuntimePromise = createAnalyzeRuntime({
      offline: process.env.MTG_DECK_ORACLE_OFFLINE === "1",
      cardRatings: "auto",
    });
  }

  return analyzeRuntimePromise;
}

async function readLimitedBody(
  request: IncomingMessage,
  maxBytes: number,
): Promise<{ readonly ok: true; readonly text: string } | { readonly ok: false }> {
  const chunks: Buffer[] = [];
  let size = 0;
  let tooLarge = false;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > maxBytes) {
      tooLarge = true;
      continue;
    }

    chunks.push(buffer);
  }

  if (tooLarge) {
    return { ok: false };
  }

  return { ok: true, text: Buffer.concat(chunks).toString("utf8") };
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
      <a href="/analyze">Analizza un mazzo</a>
      <a class="secondary" href="/rating-lab">Apri Rating Lab</a>
      <a class="secondary" href="/graph">Vedi Grafico</a>
      <a class="secondary" href="/leaderboard">Leaderboard Carte</a>
    </section>
    <section class="grid">
      <article class="card"><h2>Analisi mazzo</h2><p>Incolla una lista testuale: legalita', curva, combo e voto 0-100 nello stesso report. Non si importano URL.</p></article>
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
    <p><a href="/">Home</a> · <a href="/analyze">Analizza</a> · <a href="/rating-lab">Rating Lab</a></p>
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

function renderLeaderboardPage(): string {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MTG Deck Oracle Card Leaderboard</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px; }
    a { color: #93c5fd; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
    button, .button { border: 0; border-radius: 12px; padding: 10px 14px; cursor: pointer; font-weight: 800; text-decoration: none; background: #60a5fa; color: #082f49; }
    button:disabled { cursor: default; filter: grayscale(0.7) brightness(0.75); opacity: 0.65; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 12px; }
    .card img { width: 100%; border-radius: 12px; background: #111827; aspect-ratio: 488 / 680; object-fit: cover; }
    .card h2 { font-size: 1rem; margin: 10px 0 6px; }
    .rating { color: #facc15; font-weight: 900; }
    .status { color: #cbd5e1; }
  </style>
</head>
<body>
  <main>
    <p><a href="/">Home</a> · <a href="/analyze">Analizza</a> · <a href="/rating-lab">Rating Lab</a> · <a href="/graph">Grafico</a></p>
    <h1>Leaderboard Carte</h1>
    <p class="status">Mostra 100 carte per pagina per caricare velocemente le immagini.</p>
    <div class="actions">
      <a class="button" href="/rating-lab">Torna al Rating Lab</a>
      <button class="previous" onclick="changePage(-1)">Pagina precedente</button>
      <button class="next-page" onclick="changePage(1)">Pagina successiva</button>
    </div>
    <p id="pageInfo" class="status">Caricamento...</p>
    <section id="leaderboard" class="grid"></section>
    <div class="actions">
      <a class="button" href="/rating-lab">Torna al Rating Lab</a>
      <button class="previous" onclick="changePage(-1)">Pagina precedente</button>
      <button class="next-page" onclick="changePage(1)">Pagina successiva</button>
    </div>
  </main>
  <script>
    const pageSize = 100;
    let currentPage = Number.parseInt(new URLSearchParams(window.location.search).get('page') || '1', 10);
    let totalPages = 1;

    async function loadLeaderboard() {
      const leaderboard = await fetch('/api/rating-lab/leaderboard?page=' + currentPage + '&pageSize=' + pageSize).then((response) => response.json());
      currentPage = leaderboard.page;
      totalPages = leaderboard.totalPages;
      document.getElementById('pageInfo').textContent = 'Pagina ' + leaderboard.page + ' di ' + leaderboard.totalPages + ' | Carte totali: ' + leaderboard.totalCards;
      document.querySelectorAll('.previous').forEach((button) => { button.disabled = leaderboard.page <= 1; });
      document.querySelectorAll('.next-page').forEach((button) => { button.disabled = leaderboard.page >= leaderboard.totalPages; });
      renderCards(leaderboard.cards);
      history.replaceState(null, '', '/leaderboard?page=' + leaderboard.page);
    }

    function changePage(delta) {
      currentPage = Math.min(Math.max(currentPage + delta, 1), totalPages);
      loadLeaderboard();
    }

    function renderCards(cards) {
      const container = document.getElementById('leaderboard');
      container.innerHTML = cards.map((card, index) => {
        const rank = (currentPage - 1) * pageSize + index + 1;
        const image = card.imageUrl ? '<img loading="lazy" src="' + card.imageUrl + '" alt="' + escapeHtml(card.name) + '">' : '<div class="status">Nessuna immagine</div>';
        return '<article class="card">' +
          image +
          '<h2>#' + rank + ' ' + escapeHtml(card.name) + '</h2>' +
          '<p class="rating">Rating: ' + card.rating + '</p>' +
          '</article>';
      }).join('');
    }

    function escapeHtml(value) {
      return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
    }

    loadLeaderboard();
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
    button:disabled { cursor: default; filter: grayscale(0.7) brightness(0.75); opacity: 0.65; }
    .nav-button { display: inline-block; background: #60a5fa; color: #082f49; padding: 10px 14px; border-radius: 12px; font-weight: 800; text-decoration: none; }
    .vote { background: #22c55e; color: #052e16; }
    .next { width: auto; background: #60a5fa; color: #082f49; margin-top: 16px; }
    .filters { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    .filter { width: auto; background: #334155; color: #f8fafc; }
    .filter.active { background: #facc15; color: #422006; }
    .status { color: #9ca3af; margin-top: 16px; }
    @media (max-width: 760px) { .cards { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>MTG Deck Oracle Rating Lab</h1>
    <p>Scegli quale carta ritieni piu' forte. Ogni voto aggiorna un rating Elo salvato nel database.</p>
    <p><a class="nav-button" href="/analyze">Analizza un mazzo</a> <a class="nav-button" href="/leaderboard">Vai alla Leaderboard</a></p>
    <p id="strategy" class="status">Caricamento...</p>
    <div class="filters" aria-label="Filtro rating prima carta">
      <button class="filter" data-pool="weak" onclick="setFirstPool('weak')">scarse</button>
      <button class="filter" data-pool="medium" onclick="setFirstPool('medium')">meh</button>
      <button class="filter" data-pool="strong" onclick="setFirstPool('strong')">forti</button>
      <button class="filter active" data-pool="all" onclick="setFirstPool('all')" disabled>tutte</button>
    </div>
    <section class="cards">
      <article class="card" id="left"></article>
      <article class="card" id="right"></article>
    </section>
    <button class="next" onclick="loadMatch()">Salta confronto</button>
    <p id="stats" class="status"></p>
  </main>
  <script>
    const visitorId = getOrCreateVisitorId();
    let currentFirstPool = 'all';
    let currentMatch = null;

    async function loadMatch() {
      document.getElementById('strategy').textContent = 'Caricamento...';
      currentMatch = await fetch('/api/rating-lab/match?firstPool=' + encodeURIComponent(currentFirstPool)).then((response) => response.json());
      document.getElementById('strategy').textContent = 'Strategia match: ' + currentMatch.strategy;
      renderCard('left', currentMatch.left, currentMatch.right);
      renderCard('right', currentMatch.right, currentMatch.left);
      loadStats();
    }

    function setFirstPool(firstPool) {
      currentFirstPool = firstPool;
      updateFilterButtons();
      loadMatch();
    }

    function updateFilterButtons() {
      document.querySelectorAll('.filter').forEach((button) => {
        const isActive = button.dataset.pool === currentFirstPool;
        button.classList.toggle('active', isActive);
        button.disabled = isActive;
      });
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
