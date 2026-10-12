import { useState, type FormEvent } from "react";
import { Field } from "./Modal";
import type { Confidence, Fact, FactCreate, Source } from "../api/types";

// Confidence is deliberately optional and never nagged about. The empty
// option ("Not set") is a first-class, judgment-free choice.
const CONFIDENCE_OPTIONS: { value: Confidence | ""; label: string }[] = [
  { value: "", label: "Not set — fine to leave blank" },
  { value: "attested", label: "Attested — multiple sources agree" },
  { value: "single_source", label: "Single source" },
  { value: "inferred", label: "Inferred — deduced, not directly stated" },
];

export default function FactForm({
  sources,
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  sources: Source[];
  initial?: Fact;
  onSubmit: (data: FactCreate) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [type, setType] = useState(initial?.type ?? "");
  const [value, setValue] = useState(initial?.value ?? "");
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
    if (!type.trim() || !value.trim()) {
      setError("Type and value are required.");
      return;
    }
    try {
      await onSubmit({
        type: type.trim(),
        value: value.trim(),
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
        <Field label="Type (e.g. migration, occupation, title)">
          <input type="text" value={type} onChange={(e) => setType(e.target.value)} />
        </Field>
        <Field label="Confidence (optional)">
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as Confidence | "")}
          >
            {CONFIDENCE_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Value">
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
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
          {busy ? "Saving…" : initial ? "Save changes" : "Add fact"}
        </button>
      </div>
    </form>
  );
}
