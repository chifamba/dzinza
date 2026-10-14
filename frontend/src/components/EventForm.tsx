import { useState, type FormEvent } from "react";
import { Field } from "./Modal";
import type { Confidence, LifeEvent, LifeEventCreate, Source } from "../api/types";

const EVENT_TYPES = [
  "birth",
  "death",
  "marriage",
  "divorce",
  "migration",
  "title_succession",
  "burial",
  "other",
];

export default function EventForm({
  sources,
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  sources: Source[];
  initial?: LifeEvent;
  onSubmit: (data: LifeEventCreate) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [eventType, setEventType] = useState(initial?.event_type ?? "other");
  const [customType, setCustomType] = useState(
    initial && !EVENT_TYPES.includes(initial.event_type) ? initial.event_type : ""
  );
  const [dateStr, setDateStr] = useState(initial?.date_string ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [confidence, setConfidence] = useState<Confidence | "">(
    initial?.confidence ?? ""
  );
  const [sourceIds, setSourceIds] = useState<string[]>(initial?.source_ids ?? []);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const finalType = eventType === "other" && customType.trim() ? customType.trim() : eventType;
    try {
      await onSubmit({
        event_type: finalType,
        date_string: dateStr.trim() || undefined,
        place: place.trim() || undefined,
        description: description.trim() || undefined,
        confidence: confidence || null,
        source_ids: sourceIds,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="form-grid">
        <Field label="Event type">
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Confidence (optional)">
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as Confidence | "")}
          >
            <option value="">Not set — fine to leave blank</option>
            <option value="attested">Attested</option>
            <option value="single_source">Single source</option>
            <option value="inferred">Inferred</option>
          </select>
        </Field>
      </div>
      {eventType === "other" && (
        <Field label="Custom event type">
          <input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="e.g. initiation, lobola"
          />
        </Field>
      )}
      <div className="form-grid">
        <Field label="Date (optional)">
          <input type="text" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
        </Field>
        <Field label="Place (optional)">
          <input type="text" value={place} onChange={(e) => setPlace(e.target.value)} />
        </Field>
      </div>
      <Field label="Description (optional)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {sources.length > 0 && (
        <Field label="Linked sources (optional)">
          <select
            multiple
            value={sourceIds}
            onChange={(e) =>
              setSourceIds(
                Array.from(
                  e.target.selectedOptions,
                  (o: HTMLOptionElement) => o.value
                )
              )
            }
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Add event"}
        </button>
      </div>
    </form>
  );
}
