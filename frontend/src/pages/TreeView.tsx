import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Tree from "react-d3-tree";
import type { RawNodeDatum } from "react-d3-tree";
import { api, ApiError } from "../api/client";
import { displayName, lifeDates } from "../api/types";
import type {
  FamilyTree,
  Person,
  PersonCreate,
  RelationshipCreate,
  RelationshipDetail,
} from "../api/types";
import { Modal } from "../components/Modal";
import PersonForm from "../components/PersonForm";
import RelationshipForm from "../components/RelationshipForm";

interface DzinzaNode extends RawNodeDatum {
  personId: string;
  dates: string;
  spouses: string[];
}

// Build a forest from persons + PARENT_CHILD edges.
// Convention: for PARENT_CHILD, person1 is the parent, person2 the child.
// Cycle-guarded; a person reachable twice renders once (under first root).
function buildForest(
  persons: Person[],
  rels: RelationshipDetail[]
): DzinzaNode[] {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();
  const spousesOf = new Map<string, string[]>();

  const pushTo = (m: Map<string, string[]>, k: string, v: string) => {
    const arr = m.get(k);
    if (arr) {
      if (!arr.includes(v)) arr.push(v);
    } else m.set(k, [v]);
  };

  for (const r of rels) {
    if (!byId.has(r.person1_id) || !byId.has(r.person2_id)) continue;
    if (r.relationship_type === "PARENT_CHILD") {
      pushTo(childrenOf, r.person1_id, r.person2_id);
      hasParent.add(r.person2_id);
    } else if (r.relationship_type === "SPOUSE") {
      const n1 = r.person1_name || displayName(byId.get(r.person1_id)!);
      const n2 = r.person2_name || displayName(byId.get(r.person2_id)!);
      pushTo(spousesOf, r.person1_id, n2);
      pushTo(spousesOf, r.person2_id, n1);
    }
  }

  const visited = new Set<string>();
  const build = (id: string): DzinzaNode | null => {
    if (visited.has(id)) return null;
    visited.add(id);
    const p = byId.get(id);
    if (!p) return null;
    const kids = (childrenOf.get(id) ?? [])
      .map(build)
      .filter((k): k is DzinzaNode => k !== null);
    return {
      name: displayName(p),
      personId: id,
      dates: lifeDates(p),
      spouses: spousesOf.get(id) ?? [],
      children: kids.length > 0 ? kids : undefined,
    };
  };

  return persons
    .filter((p) => !hasParent.has(p.id))
    .map((p) => build(p.id))
    .filter((n): n is DzinzaNode => n !== null);
}

export default function TreeView() {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [rels, setRels] = useState<RelationshipDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [translate, setTranslate] = useState({ x: 400, y: 60 });
  const [query, setQuery] = useState("");
  const [showPerson, setShowPerson] = useState(false);
  const [showRel, setShowRel] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!treeId) return;
    setLoading(true);
    setError("");
    try {
      const [t, ps, rs] = await Promise.all([
        api.getTree(treeId),
        api.listPersons(treeId),
        api.listRelationships(treeId),
      ]);
      setTree(t);
      setPersons(ps);
      setRels(rs);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load tree.");
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const el = wrapRef.current;
    if (el) setTranslate({ x: el.clientWidth / 2, y: 70 });
  }, [loading]);

  const forest = buildForest(persons, rels);

  const searchResults =
    query.trim().length >= 2
      ? persons.filter((p) =>
          displayName(p).toLowerCase().includes(query.trim().toLowerCase())
        ).slice(0, 8)
      : [];

  const createPerson = async (data: PersonCreate) => {
    if (!treeId) return;
    setBusy(true);
    try {
      await api.createPerson(treeId, data);
      setShowPerson(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const createRel = async (data: RelationshipCreate) => {
    if (!treeId) return;
    setBusy(true);
    try {
      await api.createRelationship(treeId, data);
      setShowRel(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const renderNode = ({ nodeDatum }: { nodeDatum: RawNodeDatum }) => {
    const n = nodeDatum as DzinzaNode;
    return (
      <g
        className="tree-node"
        onClick={() => navigate(`/persons/${n.personId}`)}
      >
        <rect x={-75} y={-30} width={150} height={60} rx={6} />
        <text x={0} y={-8} textAnchor="middle" fontSize={13} fontWeight={600}>
          {n.name.length > 20 ? n.name.slice(0, 19) + "…" : n.name}
        </text>
        {n.dates && (
          <text x={0} y={8} textAnchor="middle" fontSize={11} className="muted">
            {n.dates}
          </text>
        )}
        {n.spouses.length > 0 && (
          <text x={0} y={23} textAnchor="middle" fontSize={10} fill="#7aa2f7">
            ⚭{" "}
            {n.spouses[0].length > 22
              ? n.spouses[0].slice(0, 21) + "…"
              : n.spouses[0]}
            {n.spouses.length > 1 ? ` +${n.spouses.length - 1}` : ""}
          </text>
        )}
      </g>
    );
  };

  if (loading) return <div className="page muted">Loading tree…</div>;

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link to="/" className="muted small">
          ← Trees
        </Link>
        <h1 style={{ margin: 0 }}>{tree?.name ?? "Tree"}</h1>
        <div className="spacer" style={{ flex: 1 }} />
        <Link to={`/trees/${treeId}/sources`} className="btn ghost small-btn">
          Sources
        </Link>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="tree-toolbar">
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 220 }}
          />
          {searchResults.length > 0 && (
            <div
              className="card"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                zIndex: 20,
                width: 260,
                padding: 8,
                marginTop: 4,
              }}
            >
              {searchResults.map((p) => (
                <div key={p.id} style={{ padding: "4px 6px" }}>
                  <Link to={`/persons/${p.id}`}>{displayName(p)}</Link>
                  <span className="muted small"> · {lifeDates(p)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setShowPerson(true)}>Add person</button>
        <button
          className="ghost"
          onClick={() => setShowRel(true)}
          disabled={persons.length < 2}
        >
          Link relationship
        </button>
        <span className="legend">
          <span>
            <span className="swatch" style={{ background: "#4a6db3" }} />
            click a person to open their profile
          </span>
        </span>
      </div>

      {forest.length === 0 ? (
        <div className="empty">
          This tree is empty. Add your first person to start building.
        </div>
      ) : (
        <div className="treeview-wrap" ref={wrapRef}>
          <Tree
            data={forest}
            orientation="vertical"
            translate={translate}
            nodeSize={{ x: 180, y: 120 }}
            separation={{ siblings: 1, nonSiblings: 1.4 }}
            zoomable
            renderCustomNodeElement={renderNode}
            pathFunc="step"
          />
        </div>
      )}

      {showPerson && (
        <Modal title="Add person" onClose={() => setShowPerson(false)}>
          <PersonForm
            onSubmit={createPerson}
            onCancel={() => setShowPerson(false)}
            busy={busy}
          />
        </Modal>
      )}
      {showRel && (
        <Modal title="Link relationship" onClose={() => setShowRel(false)}>
          <RelationshipForm
            persons={persons}
            onSubmit={createRel}
            onCancel={() => setShowRel(false)}
            busy={busy}
          />
        </Modal>
      )}
    </div>
  );
}
