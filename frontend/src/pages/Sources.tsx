import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { FamilyTree, Source, SourceCreate } from "../api/types";
import { Modal } from "../components/Modal";
import SourceForm from "../components/SourceForm";

const TYPE_LABELS: Record<string, string> = {
  oral_testimony: "Oral testimony",
  document: "Document",
  book: "Book",
  archive: "Archive record",
  website: "Website",
  other: "Other",
};

export default function Sources() {
  const { treeId } = useParams<{ treeId: string }>();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);

  const load = useCallback(async () => {
    if (!treeId) return;
    setLoading(true);
    setError("");
    try {
      const [t, ss] = await Promise.all([
        api.getTree(treeId),
        api.listSources(treeId),
      ]);
      setTree(t);
      setSources(ss);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load sources.");
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (data: SourceCreate) => {
    if (!treeId) return;
    setBusy(true);
    try {
      if (editing) {
        await api.updateSource(editing.id, data);
      } else {
        await api.createSource(treeId, data);
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: Source) => {
    if (!window.confirm(`Delete source "${s.title}"? Facts linked to it will keep their text but lose the link.`))
      return;
    try {
      await api.deleteSource(s.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  };

  if (loading) return <div className="page muted">Loading…</div>;

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12 }}>
        <Link to={`/trees/${treeId}`} className="muted small">
          ← Back to tree
        </Link>
        <h1 style={{ margin: 0 }}>Sources{tree ? ` — ${tree.name}` : ""}</h1>
        <div className="spacer" style={{ flex: 1 }} />
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          Add source
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      {sources.length === 0 ? (
        <div className="empty">
          No sources yet. Sources are the evidence behind your facts — interviews,
          documents, archive records.
        </div>
      ) : (
        <div className="card">
          {sources.map((s) => (
            <div className="source-item" key={s.id}>
              <div>
                <strong>{s.title}</strong>{" "}
                <span className="chip">{TYPE_LABELS[s.type] ?? s.type}</span>
              </div>
              <div className="small muted">
                {[
                  s.teller && `Told by ${s.teller}`,
                  s.date_recorded && `recorded ${s.date_recorded}`,
                  s.reference,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {s.notes && <div className="small">{s.notes}</div>}
              <div className="row" style={{ marginTop: 6 }}>
                <button
                  className="ghost small-btn"
                  onClick={() => {
                    setEditing(s);
                    setShowForm(true);
                  }}
                >
                  Edit
                </button>
                <button className="danger small-btn" onClick={() => remove(s)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? "Edit source" : "Add source"}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <SourceForm
            initial={editing ?? undefined}
            onSubmit={save}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            busy={busy}
          />
        </Modal>
      )}
    </div>
  );
}
