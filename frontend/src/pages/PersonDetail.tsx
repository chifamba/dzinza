import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { displayName, lifeDates } from "../api/types";
import type {
  Confidence,
  Fact,
  FactCreate,
  LifeEvent,
  LifeEventCreate,
  Person,
  PersonCreate,
  PersonDetail as PersonDetailType,
  Source,
} from "../api/types";
import { Modal } from "../components/Modal";
import PersonForm from "../components/PersonForm";
import FactForm from "../components/FactForm";
import EventForm from "../components/EventForm";
import RelationshipForm from "../components/RelationshipForm";
import type { RelationshipCreate } from "../api/types";

const CONF_LABEL: Record<Confidence, string> = {
  attested: "attested",
  single_source: "single source",
  inferred: "inferred",
};

function ConfidenceBadge({ value }: { value?: Confidence | null }) {
  // Never shown when unset — no nagging.
  if (!value) return null;
  return <span className={`conf-badge conf-${value}`}>{CONF_LABEL[value]}</span>;
}

function sourceTitle(id: string, sources: Source[]): string {
  return sources.find((s) => s.id === id)?.title ?? "unknown source";
}

export default function PersonDetail() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();

  const [person, setPerson] = useState<PersonDetailType | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showFact, setShowFact] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [showRel, setShowRel] = useState(false);
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);
  const [linkPersons, setLinkPersons] = useState<Person[]>([]);

  const openLinkModal = async () => {
    if (treeId) {
      try {
        setLinkPersons(await api.listPersons(treeId));
      } catch {
        setLinkPersons([]);
      }
    }
    setShowRel(true);
  };

  const load = useCallback(async () => {
    if (!personId) return;
    setLoading(true);
    setError("");
    try {
      const p = await api.getPerson(personId);
      setPerson(p);
      const [fs, es] = await Promise.all([
        api.listFacts(personId),
        api.listEvents(personId),
      ]);
      setFacts(fs);
      setEvents(es);
      const treeId = p.tree_ids[0];
      if (treeId) setSources(await api.listSources(treeId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load person.");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  const treeId = person?.tree_ids[0];

  const saveEdit = async (data: PersonCreate) => {
    if (!personId) return;
    setBusy(true);
    try {
      await api.updatePerson(personId, data);
      setShowEdit(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removePerson = async () => {
    if (!person || !personId) return;
    if (
      !window.confirm(
        `Delete ${displayName(person)}? Their facts, events and links will go too.`
      )
    )
      return;
    try {
      await api.deletePerson(personId);
      navigate(treeId ? `/trees/${treeId}` : "/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  };

  const saveFact = async (data: FactCreate) => {
    if (!personId) return;
    setBusy(true);
    try {
      if (editingFact) {
        await api.updateFact(personId, editingFact.id, data);
      } else {
        await api.createFact(personId, data);
      }
      setShowFact(false);
      setEditingFact(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeFact = async (id: string) => {
    if (!personId || !window.confirm("Delete this fact?")) return;
    await api.deleteFact(personId, id);
    await load();
  };

  const saveEvent = async (data: LifeEventCreate) => {
    if (!personId) return;
    setBusy(true);
    try {
      if (editingEvent) {
        await api.updateEvent(editingEvent.id, data);
      } else {
        await api.createEvent(personId, data);
      }
      setShowEvent(false);
      setEditingEvent(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeEvent = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    await api.deleteEvent(id);
    await load();
  };

  const saveRel = async (data: RelationshipCreate) => {
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

  if (loading) return <div className="page muted">Loading…</div>;
  if (!person) return <div className="page">{error && <div className="error">{error}</div>}</div>;

  const altNames = [
    ...person.alternate_names,
    ...(person.primary_name.nickname
      ? [{ given_name: person.primary_name.nickname, surname: "" }]
      : []),
  ];

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12 }}>
        {treeId && (
          <Link to={`/trees/${treeId}`} className="muted small">
            ← Back to tree
          </Link>
        )}
        <div className="spacer" style={{ flex: 1 }} />
        <button className="ghost small-btn" onClick={() => setShowEdit(true)}>
          Edit
        </button>
        <button className="danger small-btn" onClick={removePerson}>
          Delete
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="card person-head">
        <h1>{displayName(person)}</h1>
        {lifeDates(person) && <p className="muted" style={{ margin: "2px 0" }}>{lifeDates(person)}</p>}
        {altNames.length > 0 && (
          <p className="small muted" style={{ margin: "4px 0" }}>
            Also known as: {altNames.map((n) => [n.given_name, n.surname].filter(Boolean).join(" ")).join("; ")}
          </p>
        )}
        <dl className="kv">
          {person.clan && (
            <>
              <dt>Clan</dt>
              <dd>{person.clan}</dd>
            </>
          )}
          {person.tribe && (
            <>
              <dt>Tribe</dt>
              <dd>{person.tribe}</dd>
            </>
          )}
          {person.traditional_titles.length > 0 && (
            <>
              <dt>Titles</dt>
              <dd>{person.traditional_titles.join(", ")}</dd>
            </>
          )}
          {person.birth_place && (
            <>
              <dt>Born</dt>
              <dd>
                {person.birth_place}
                {person.birth_date_string ? ` · ${person.birth_date_string}` : ""}
                {person.is_birth_date_estimated ? " (estimated)" : ""}
              </dd>
            </>
          )}
          {!person.is_living && (person.death_place || person.death_date_string) && (
            <>
              <dt>Died</dt>
              <dd>
                {[person.death_place, person.death_date_string].filter(Boolean).join(" · ")}
                {person.is_death_date_estimated ? " (estimated)" : ""}
              </dd>
            </>
          )}
        </dl>
        {person.biography && (
          <>
            <h3>Biography</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{person.biography}</p>
          </>
        )}
        {person.notes && (
          <>
            <h3>Research notes</h3>
            <p className="muted small" style={{ whiteSpace: "pre-wrap" }}>{person.notes}</p>
          </>
        )}
      </div>

      <div className="card">
        <div className="section-head">
          <h2>Relationships</h2>
          <button className="ghost small-btn" onClick={openLinkModal}>
            Link someone
          </button>
        </div>
        {person.relationships.length === 0 ? (
          <p className="muted small">No linked relationships yet.</p>
        ) : (
          person.relationships.map((r) => (
            <div className="rel-item" key={r.id ?? r.other_person_id}>
              <Link to={`/persons/${r.other_person_id}`}>{r.other_person_name}</Link>
              <span className="muted small"> — {r.type.toLowerCase().replace("_", " ")}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="section-head">
          <h2>Facts</h2>
          <button
            className="ghost small-btn"
            onClick={() => {
              setEditingFact(null);
              setShowFact(true);
            }}
          >
            Add fact
          </button>
        </div>
        {facts.length === 0 ? (
          <p className="muted small">No facts recorded yet.</p>
        ) : (
          facts.map((f) => (
            <div className="fact-item" key={f.id}>
              <div>
                <strong>{f.type}:</strong> {f.value}
                <ConfidenceBadge value={f.confidence} />
              </div>
              {(f.date_string || f.place) && (
                <div className="small muted">
                  {[f.date_string, f.place].filter(Boolean).join(" · ")}
                </div>
              )}
              {f.description && <div className="small">{f.description}</div>}
              {f.source_ids.length > 0 && (
                <div className="small muted">
                  Sources: {f.source_ids.map((id) => sourceTitle(id, sources)).join("; ")}
                </div>
              )}
              <div className="row" style={{ marginTop: 6 }}>
                <button
                  className="ghost small-btn"
                  onClick={() => {
                    setEditingFact(f);
                    setShowFact(true);
                  }}
                >
                  Edit
                </button>
                <button className="danger small-btn" onClick={() => removeFact(f.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="section-head">
          <h2>Life events</h2>
          <button
            className="ghost small-btn"
            onClick={() => {
              setEditingEvent(null);
              setShowEvent(true);
            }}
          >
            Add event
          </button>
        </div>
        {events.length === 0 ? (
          <p className="muted small">No events recorded yet.</p>
        ) : (
          events.map((ev) => (
            <div className="event-item" key={ev.id}>
              <div>
                <strong>{ev.event_type.replace("_", " ")}</strong>
                {ev.date_string && <span> · {ev.date_string}</span>}
                {ev.place && <span> · {ev.place}</span>}
                <ConfidenceBadge value={ev.confidence} />
              </div>
              {ev.description && <div className="small">{ev.description}</div>}
              {ev.source_ids.length > 0 && (
                <div className="small muted">
                  Sources: {ev.source_ids.map((id) => sourceTitle(id, sources)).join("; ")}
                </div>
              )}
              <div className="row" style={{ marginTop: 6 }}>
                <button
                  className="ghost small-btn"
                  onClick={() => {
                    setEditingEvent(ev);
                    setShowEvent(true);
                  }}
                >
                  Edit
                </button>
                <button className="danger small-btn" onClick={() => removeEvent(ev.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showEdit && (
        <Modal title={`Edit ${displayName(person)}`} onClose={() => setShowEdit(false)}>
          <PersonForm
            initial={person}
            onSubmit={saveEdit}
            onCancel={() => setShowEdit(false)}
            busy={busy}
          />
        </Modal>
      )}
      {showFact && (
        <Modal
          title={editingFact ? "Edit fact" : "Add fact"}
          onClose={() => {
            setShowFact(false);
            setEditingFact(null);
          }}
        >
          <FactForm
            sources={sources}
            initial={editingFact ?? undefined}
            onSubmit={saveFact}
            onCancel={() => {
              setShowFact(false);
              setEditingFact(null);
            }}
            busy={busy}
          />
        </Modal>
      )}
      {showEvent && (
        <Modal
          title={editingEvent ? "Edit event" : "Add event"}
          onClose={() => {
            setShowEvent(false);
            setEditingEvent(null);
          }}
        >
          <EventForm
            sources={sources}
            initial={editingEvent ?? undefined}
            onSubmit={saveEvent}
            onCancel={() => {
              setShowEvent(false);
              setEditingEvent(null);
            }}
            busy={busy}
          />
        </Modal>
      )}
      {showRel && treeId && (
        <Modal title="Link relationship" onClose={() => setShowRel(false)}>
          <RelationshipForm
            persons={linkPersons}
            presetPersonId={personId}
            onSubmit={saveRel}
            onCancel={() => setShowRel(false)}
            busy={busy}
          />
        </Modal>
      )}
    </div>
  );
}
