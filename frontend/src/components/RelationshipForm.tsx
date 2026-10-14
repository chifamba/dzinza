import { useState, type FormEvent } from "react";
import { Field } from "./Modal";
import { displayName } from "../api/types";
import type { Person, RelationshipCreate, RelationshipType, SpousalStatus } from "../api/types";

const TYPES: { value: RelationshipType; label: string }[] = [
  { value: "PARENT_CHILD", label: "Parent → child" },
  { value: "SPOUSE", label: "Spouses" },
  { value: "SIBLING", label: "Siblings" },
  { value: "ADOPTIVE", label: "Adoptive parent → child" },
  { value: "STEP_PARENT_CHILD", label: "Step-parent → child" },
  { value: "OTHER", label: "Other" },
];

export default function RelationshipForm({
  persons,
  presetPersonId,
  onSubmit,
  onCancel,
  busy,
}: {
  persons: Person[];
  presetPersonId?: string;
  onSubmit: (data: RelationshipCreate) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [type, setType] = useState<RelationshipType>("PARENT_CHILD");
  const [p1, setP1] = useState(presetPersonId ?? "");
  const [p2, setP2] = useState("");
  const [spousal, setSpousal] = useState<SpousalStatus | "">("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!p1 || !p2) {
      setError("Pick both people.");
      return;
    }
    if (p1 === p2) {
      setError("A person cannot be linked to themselves.");
      return;
    }
    try {
      await onSubmit({
        person1_id: p1,
        person2_id: p2,
        relationship_type: type,
        spousal_status: spousal ? (spousal as SpousalStatus) : undefined,
        place: place.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  };

  const firstLabel =
    type === "SPOUSE" ? "First spouse" : type === "SIBLING" || type === "OTHER" ? "First person" : "Parent";
  const secondLabel =
    type === "SPOUSE" ? "Second spouse" : type === "SIBLING" || type === "OTHER" ? "Second person" : "Child";

  const options = (selected: string, setter: (v: string) => void) => (
    <select value={selected} onChange={(e) => setter(e.target.value)}>
      <option value="">— pick a person —</option>
      {persons.map((p) => (
        <option key={p.id} value={p.id}>
          {displayName(p)}
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <Field label="Relationship type">
        <select value={type} onChange={(e) => setType(e.target.value as RelationshipType)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={firstLabel}>{options(p1, setP1)}</Field>
      <Field label={secondLabel}>{options(p2, setP2)}</Field>
      {type === "SPOUSE" && (
        <Field label="Marital status (optional)">
          <select value={spousal} onChange={(e) => setSpousal(e.target.value as SpousalStatus | "")}>
            <option value="">—</option>
            <option value="MARRIED">Married</option>
            <option value="DIVORCED">Divorced</option>
            <option value="WIDOWED">Widowed</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </Field>
      )}
      <Field label="Place (optional)">
        <input type="text" value={place} onChange={(e) => setPlace(e.target.value)} />
      </Field>
      <Field label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={busy}>
          {busy ? "Linking…" : "Link people"}
        </button>
      </div>
    </form>
  );
}
