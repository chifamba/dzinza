import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { FamilyTree, TreeStats } from "../api/types";

interface TreeWithStats {
  tree: FamilyTree;
  stats: TreeStats | null;
}

export default function Dashboard() {
  const [trees, setTrees] = useState<TreeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.listTrees();
      const withStats = await Promise.all(
        list.map(async (tree) => {
          try {
            const stats = await api.treeStats(tree.id);
            return { tree, stats };
          } catch {
            return { tree, stats: null };
          }
        })
      );
      setTrees(withStats);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load trees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.createTree({
        name: name.trim(),
        description: description.trim() || undefined,
        privacy: "PRIVATE",
      });
      setName("");
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create tree.");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string, treeName: string) => {
    if (!window.confirm(`Delete "${treeName}" and everyone in it? This cannot be undone.`))
      return;
    try {
      await api.deleteTree(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete tree.");
    }
  };

  return (
    <div className="page">
      <h1>Family trees</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>New tree</h2>
        <form onSubmit={create}>
          <div className="form-grid">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gumbo clan"
              />
            </label>
            <label className="field">
              <span>Description (optional)</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this tree for?"
              />
            </label>
          </div>
          <button type="submit" disabled={creating || !name.trim()}>
            {creating ? "Creating…" : "Create tree"}
          </button>
        </form>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : trees.length === 0 ? (
        <div className="empty">
          No trees yet. Create one above to start recording your family history.
        </div>
      ) : (
        <div className="tree-grid">
          {trees.map(({ tree, stats }) => (
            <div className="card tree-card" key={tree.id}>
              <h3>
                <Link to={`/trees/${tree.id}`}>{tree.name}</Link>
              </h3>
              {tree.description && (
                <p className="muted small" style={{ margin: "0 0 4px" }}>
                  {tree.description}
                </p>
              )}
              <div className="stat-chips">
                <span className="chip">{stats?.persons ?? "–"} people</span>
                <span className="chip">{stats?.relationships ?? "–"} links</span>
                <span className="chip">{stats?.sources ?? "–"} sources</span>
              </div>
              <div className="row">
                <Link to={`/trees/${tree.id}`} className="btn small-btn ghost">
                  Open
                </Link>
                <Link
                  to={`/trees/${tree.id}/sources`}
                  className="btn small-btn ghost"
                >
                  Sources
                </Link>
                <button
                  className="danger small-btn"
                  onClick={() => remove(tree.id, tree.name)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
