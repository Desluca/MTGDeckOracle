# Deployment

Il sito pubblico e' un server Node: **Rating Lab** (confronti Elo) e **analisi mazzo** su `/analyze` (lista testuale, niente URL). La CLI `npm run analyze` resta disponibile.

MTG Deck Oracle puo' andare online come applicazione Node.js con PostgreSQL.

La prima versione pubblica espone:

- homepage su `/`;
- analisi mazzo su `/analyze` (GET form, POST lista);
- Rating Lab su `/rating-lab`;
- leaderboard carte su `/leaderboard`;
- grafico attivita' su `/graph`;
- API Rating Lab su `/api/rating-lab/match`, `/api/rating-lab/vote` e `/api/rating-lab/stats`;
- andamento voti su `/api/rating-lab/activity`;
- health check su `/health`.

## Requisiti

- Node.js 22;
- PostgreSQL;
- variabile `DATABASE_URL` in produzione;
- schema SQL in `database/rating-lab.sql`.

In locale, se `DATABASE_URL` non e' presente, il Rating Lab continua a usare `.cache/rating-lab-db.json`.

## Variabili Ambiente

Vedi `.env.example`.

```bash
PORT=5174
DATABASE_URL=postgres://user:password@host:5432/mtgdeckoracle
POSTGRES_SSL=true

# Skip Scryfall and Spellbook HTTP. Cards come only from .cache/scryfall-cards.json.
MTG_DECK_ORACLE_OFFLINE=0
```

`POSTGRES_SSL=true` e' il default corretto per la maggior parte dei provider gestiti. Per un PostgreSQL locale puoi usare `POSTGRES_SSL=false`.

## Database

Quando `DATABASE_URL` e' configurato, l'app inizializza automaticamente le tabelle PostgreSQL al primo accesso al Rating Lab.

Lo schema e' comunque disponibile per controllo o setup manuale:

```bash
psql "$DATABASE_URL" -f database/rating-lab.sql
```

Lo schema crea:

- `rating_cards`: carte viste, rating Elo, vittorie e sconfitte;
- `rating_comparisons`: storico dei confronti votati, timestamp e visitor id anonimo;
- indici per rating e storico.

## Deploy Su Render

Il file `render.yaml` e' gia' pronto per creare:

- un web service Node;
- un database PostgreSQL;
- `DATABASE_URL` collegata automaticamente al servizio.

Flusso consigliato:

1. carica il repository su GitHub;
2. crea un nuovo Blueprint su Render usando `render.yaml`;
3. apri l'URL generato da Render;
4. visita `/rating-lab` per inizializzare e usare il database.

Comandi usati da Render:

```bash
npm ci --include=dev && npm run build
npm start
```

## Dominio

Il dominio non e' obbligatorio per il primo deploy. Puoi usare l'URL gratuito del provider.

Quando vuoi un dominio vero, compra `mtgdeckoracle.com` o simile e punta il DNS al provider scelto. Il codice non cambia.

CI su GitHub Actions (`.github/workflows/ci.yml`) non fa il deploy: esegue `npm ci`, `npm test` e `npm run typecheck` su Node 22.
