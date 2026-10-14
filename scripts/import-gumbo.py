#!/usr/bin/env python3
"""Import the Gumbo clan genealogy from the research markdown into Dzinza.

Parses the ancestor table in gumbo-clan-genealogy.md and creates:
  - a "Gumbo — Madyirapazhe" family tree
  - Person nodes (names, alternate names, clan, generation, confidence-tagged facts)
  - PARENT_CHILD relationships where the text states them explicitly
  - Source nodes for the key references

Usage:
    python scripts/import-gumbo.py --api http://localhost:3000 \
        --password "$ADMIN_PASSWORD" \
        --markdown path/to/gumbo-clan-genealogy.md

Only creates explicit relationships ("son of X", "X's sons"). Everything else
Robert links in the UI — no guessed parentage.
"""

import argparse
import re
import sys

import requests

CONFIDENCE_MAP = {
    "attested": "attested",
    "single-source": "single_source",
    "single source": "single_source",
    "inferred": "inferred",
}

# Explicit parentage statements found in the ancestor table notes.
# (child name fragment -> parent name fragment)
EXPLICIT_PARENTS = [
    ("Chisvino", "Musana"),
    ("Mahwazhe", "Musana"),
    ("Nemashakwe", "Musana"),
    ("Munyikwa", "Musana"),
    ("Nendanga", "Musana"),
    ("Diza", None),          # origin figure; parent of Musana per one account
    ("Musana", "Diza"),      # "father of Musana" (alternative account)
    ("Rwodzi", "Chaurura"),
    ("Denhere", "Chaurura"),
    ("Makuvaza", "Chaurura"),
]


def parse_ancestor_rows(markdown: str):
    """Extract rows from the '| # | Name(s) | Role / note | Confidence |' table."""
    rows = []
    in_table = False
    for line in markdown.splitlines():
        if re.match(r"^\|\s*#\s*\|\s*Name\(s\)", line):
            in_table = True
            continue
        if in_table:
            if not line.startswith("|"):
                break
            if re.match(r"^\|[\s\-:|]+\|$", line):
                continue  # separator row
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) >= 4:
                rows.append({
                    "generation": cells[0],
                    "names": cells[1],
                    "note": cells[2],
                    "confidence": cells[3],
                })
    return rows


def extract_names(names_cell: str):
    """Parse the names cell into a list of (primary, [alternates]) tuples.

    - "**Diza**, also known as **Binda**" -> [("Diza", ["Binda"])]
    - "**Rwodzi**, **Denhere**" (no 'also') -> [("Rwodzi", []), ("Denhere", [])]
    """
    low = names_cell.lower()
    has_also = "also known as" in low or re.search(r"—\s*also\b", names_cell)

    bolds = re.findall(r"\*\*(.+?)\*\*", names_cell)
    clean = [re.sub(r"\s*\(.*?\)\s*", "", b).strip(" —–-,") for b in bolds]
    # Drop non-name bolds: quoted nicknames kept, but skip bracket markers
    clean = [c for c in clean if c and not c.startswith("[")]
    # Drop pure-gloss entries like '"Gutu"' (quoted colonial corruption)
    clean = [c for c in clean if not (c.startswith('"') and c.endswith('"'))]

    if not clean:
        return []

    if has_also:
        return [(clean[0], clean[1:])]

    # No "also": comma-separated bolds are separate people sharing the row.
    return [(c, []) for c in clean]


def map_confidence(conf_cell: str):
    low = conf_cell.lower()
    for key, val in CONFIDENCE_MAP.items():
        if key in low:
            return val
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="http://localhost:3000")
    ap.add_argument("--password", required=True)
    ap.add_argument("--markdown", required=True)
    ap.add_argument("--dry-run", action="store_true",
                    help="parse and print, don't call the API")
    args = ap.parse_args()

    with open(args.markdown) as f:
        markdown = f.read()

    rows = parse_ancestor_rows(markdown)
    print(f"Parsed {len(rows)} ancestor rows", file=sys.stderr)
    if not rows:
        sys.exit("No ancestor rows found — check the markdown format.")

    people = []
    for row in rows:
        for primary, alternates in extract_names(row["names"]):
            people.append({
                "primary": primary,
                "alternates": alternates,
                "generation": row["generation"],
                "note": re.sub(r"\*\*", "", row["note"]),
                "confidence": map_confidence(row["confidence"]),
            })
    if not people:
        print(f"  SKIP row (no names): {row['names'][:60]}", file=sys.stderr)

    if args.dry_run:
        for p in people:
            alts = f" aka {', '.join(p['alternates'])}" if p['alternates'] else ""
            print(f"[{p['generation']}] {p['primary']}{alts} ({p['confidence']})")
        return

    s = requests.Session()
    base = args.api.rstrip("/")

    # Login
    r = s.post(f"{base}/auth/login", json={"password": args.password})
    r.raise_for_status()
    print("Logged in", file=sys.stderr)

    # Tree
    r = s.post(f"{base}/api/trees", json={
        "name": "Gumbo — Madyirapazhe",
        "description": "Gumbo clan dynasty research. Imported from gumbo-clan-genealogy.md (2026-09-25).",
    })
    r.raise_for_status()
    tree_id = r.json()["id"]
    print(f"Tree: {tree_id}", file=sys.stderr)

    # Key sources
    source_ids = {}
    for title, stype in [
        ("D.N. Beach — pre-1900 dynasties", "book"),
        ("Tarugarira 2017", "book"),
        ("Kenny 1903 (NVG2/1/3)", "archive"),
        ("Chief Gutu 2013", "oral_testimony"),
    ]:
        r = s.post(f"{base}/api/trees/{tree_id}/sources", json={
            "title": title, "type": stype,
        })
        r.raise_for_status()
        source_ids[title] = r.json()["id"]

    # Persons
    person_ids = {}
    for p in people:
        body = {
            "primary_name": {"given_name": p["primary"],
                             "surname": ""},
            "alternate_names": [{"given_name": a, "surname": ""}
                                for a in p["alternates"]],
            "clan": "Gumbo",
            "biography": p["note"][:2000],
            "facts": [],
        }
        if p["confidence"]:
            body["facts"].append({
                "type": "dynasty_role",
                "value": p["note"][:500],
                "confidence": p["confidence"],
            })
        r = s.post(f"{base}/api/trees/{tree_id}/persons", json=body)
        r.raise_for_status()
        pid = r.json()["id"]
        person_ids[p["primary"].lower()] = pid
        print(f"  + {p['primary']}", file=sys.stderr)

    # Explicit relationships only
    linked = 0
    for child_frag, parent_frag in EXPLICIT_PARENTS:
        if parent_frag is None:
            continue
        child_id = person_ids.get(child_frag.lower())
        parent_id = person_ids.get(parent_frag.lower())
        if child_id and parent_id:
            r = s.post(f"{base}/api/trees/{tree_id}/relationships", json={
                "person1_id": parent_id,
                "person2_id": child_id,
                "relationship_type": "PARENT_CHILD",
                "notes": "Imported from genealogy document (explicit statement).",
            })
            if r.status_code == 201:
                linked += 1
                print(f"  link: {parent_frag} -> {child_frag}", file=sys.stderr)

    print(f"\nDone: {len(person_ids)} persons, {linked} relationships, "
          f"{len(source_ids)} sources in tree {tree_id}")


if __name__ == "__main__":
    main()
