# Dzinza

**Dzinza** (Shona: *lineage, ancestry*) — a private genealogy research tool.
Track people, relationships, life events, sources, and how confident you are
in every claim. Runs on your own machine with Docker. Your data never leaves it.

This is a personal tool, not a platform. There are no accounts, no sharing,
no cloud. One user, one family graph, full control.

## Run it

```sh
# First run: set a password (or DZINZA_DEV=1 to use the dev password)
ADMIN_PASSWORD=your-secret-password docker compose up -d --build

# Open http://localhost:3000 and log in.
# Stop: docker compose down (data persists in Docker volumes)
```

## Back up

```sh
./scripts/backup.sh            # → ~/dzinza-backups/dzinza-backup-<date>.tar.gz
```

Back up before big research sessions. Your research is irreplaceable; the app is not.

## What it does

- **Family trees** — create and manage multiple trees
- **People** — names (including alternate/praise names), clan, tribe, traditional titles, flexible dates ("early 1900s" is fine), biography, notes
- **Relationships** — parent/child, spouses, siblings, adoptive, step
- **Facts** — individual claims with optional confidence (attested / single-source / inferred) and links to sources. Confidence is *optional* — facts without sources are fully accepted, never nagged about
- **Sources** — first-class entities: oral testimony (with teller + date recorded), documents, books, archives, websites
- **Life events** — migrations, title successions, or anything dated
- **GEDCOM** — import and export standard genealogy files
- **Media** — attach photos and scanned documents (stored locally)

## Import the Gumbo research

```sh
python scripts/import-gumbo.py --password "$ADMIN_PASSWORD" \
    --markdown path/to/gumbo-clan-genealogy.md
```

Parses the clan genealogy document into a tree: persons with confidence-tagged
facts, explicit parent-child links only (nothing guessed), key sources.

## Architecture

Two containers: **Neo4j** (the family graph) + **API** (Python/FastAPI, serves the
React frontend). Single-user password auth. Nothing else — no Elasticsearch,
no MongoDB, no Redis, no microservices.

```
api/            FastAPI app (routers per domain, pytest suite)
frontend/       React 18 + TypeScript (react-d3-tree visualization)
scripts/        backup.sh, import-gumbo.py
docker-compose.yml
```

## Honest status

This is v2, rebuilt 2026-10 from the original Dzinza prototype. What's here works;
what's listed below doesn't exist yet and isn't promised on any timeline:

- Community features: trust scoring, multi-party verification, collaboration
- Full-text search across trees (name search works)
- Mobile apps, DNA integrations, public hosting

## License

See LICENSE.
