#!/usr/bin/env bash
# Dzinza v2 backup: dumps Neo4j + media volume into a timestamped archive.
# Usage: ./scripts/backup.sh [output-dir]
# Restore: stop the stack, then
#   docker compose down
#   docker run --rm -v dzinza_neo4j-data:/data -v "$PWD/<backup>:/backup" \
#       neo4j:5.26 neo4j-admin database load --from-path=/backup neo4j
set -euo pipefail

OUT_DIR="${1:-$HOME/dzinza-backups}"
STAMP="$(date +%Y-%m-%d-%H%M%S)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$OUT_DIR"

echo "→ Dumping Neo4j..."
docker compose exec -T neo4j neo4j-admin database dump neo4j \
    --to-path=/tmp 2>/dev/null
docker compose cp neo4j:/tmp/neo4j.dump "$WORK/neo4j.dump"
docker compose exec -T neo4j rm /tmp/neo4j.dump

echo "→ Archiving media..."
docker run --rm -v dzinza_dzinza-media:/media -v "$WORK:/backup" \
    alpine tar czf /backup/media.tar.gz -C /media .

echo "→ Writing archive..."
tar czf "$OUT_DIR/dzinza-backup-$STAMP.tar.gz" -C "$WORK" neo4j.dump media.tar.gz

echo "✓ Backup written to $OUT_DIR/dzinza-backup-$STAMP.tar.gz"
