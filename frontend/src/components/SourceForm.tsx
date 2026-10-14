import { useState, type FormEvent } from "react";
import { Field } from "./Modal";
import type { Source, SourceCreate, SourceType } from "../api/types";

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "oral_testimony", label: "Oral testimony" },
  { value: "document", label: "Document" },
  { value: "book", label: "Book" },
  { value: "archive", label: "Archive record" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

export default function SourceForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Source;
  onSubmit: (data: SourceCreate) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<SourceType>(initial?.type ?? "other");
  const [teller, setTeller] = useState(initial?.teller ?? "");
  const [dateRecorded, setDateRecorded] = useState(initial?.date_recorded ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      await onSubmit({
        title: title.trim(),
        type,
        teller: teller.trim() || undefined,
        date_recorded: dateRecorded.trim() || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <Field label="Title">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Interview with Gogo, 2024-03-15"
        />
      </Field>
      <div className="form-grid">
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as SourceType)}>
            {SOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Teller (for oral testimony)">
          <input type="text" value={teller} onChange={(e) => setTeller(e.target.value)} />
        </Field>
        <Field label="Date recorded">
          <input
            type="text"
            value={dateRecorded}
            onChange={(e) => setDateRecorded(e.target.value)}
            placeholder="e.g. 2024-03-15"
          />
        </Field>
        <Field label="Reference (archive ref, page, URL)">
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Add source"}
        </button>
      </div>
    </form>
  );
}
