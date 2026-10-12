import { useState, type FormEvent } from "react";
import { Field } from "./Modal";
import type { Gender, Person, PersonCreate } from "../api/types";

const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER", "UNKNOWN"];

export default function PersonForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Person;
  onSubmit: (data: PersonCreate) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [givenName, setGivenName] = useState(initial?.primary_name.given_name ?? "");
  const [surname, setSurname] = useState(initial?.primary_name.surname ?? "");
  const [nickname, setNickname] = useState(initial?.primary_name.nickname ?? "");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "UNKNOWN");
  const [clan, setClan] = useState(initial?.clan ?? "");
  const [tribe, setTribe] = useState(initial?.tribe ?? "");
  const [titles, setTitles] = useState((initial?.traditional_titles ?? []).join(", "));
  const [birthStr, setBirthStr] = useState(initial?.birth_date_string ?? "");
  const [birthEst, setBirthEst] = useState(initial?.is_birth_date_estimated ?? false);
  const [birthPlace, setBirthPlace] = useState(initial?.birth_place ?? "");
  const [deathStr, setDeathStr] = useState(initial?.death_date_string ?? "");
  const [deathEst, setDeathEst] = useState(initial?.is_death_date_estimated ?? false);
  const [deathPlace, setDeathPlace] = useState(initial?.death_place ?? "");
  const [isLiving, setIsLiving] = useState(initial?.is_living ?? true);
  const [biography, setBiography] = useState(initial?.biography ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!givenName.trim() && !surname.trim()) {
      setError("Give the person at least a given name or a surname.");
      return;
    }
    try {
      await onSubmit({
        primary_name: {
          given_name: givenName.trim(),
          surname: surname.trim(),
          nickname: nickname.trim() || undefined,
        },
        gender,
        clan: clan.trim() || undefined,
        tribe: tribe.trim() || undefined,
        traditional_titles: titles
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        birth_date_string: birthStr.trim() || undefined,
        is_birth_date_estimated: birthEst,
        birth_place: birthPlace.trim() || undefined,
        death_date_string: !isLiving && deathStr.trim() ? deathStr.trim() : undefined,
        is_death_date_estimated: deathEst,
        death_place: !isLiving && deathPlace.trim() ? deathPlace.trim() : undefined,
        is_living: isLiving,
        biography: biography.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="form-grid">
        <Field label="Given name">
          <input type="text" value={givenName} onChange={(e) => setGivenName(e.target.value)} />
        </Field>
        <Field label="Surname">
          <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} />
        </Field>
        <Field label="Nickname / praise name">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Madyirapazhe"
          />
        </Field>
        <Field label="Gender">
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Clan">
          <input type="text" value={clan} onChange={(e) => setClan(e.target.value)} placeholder="e.g. Gumbo" />
        </Field>
        <Field label="Tribe">
          <input type="text" value={tribe} onChange={(e) => setTribe(e.target.value)} placeholder="e.g. Karanga" />
        </Field>
        <Field label="Traditional titles (comma-separated)">
          <input type="text" value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="e.g. Chief, Headman" />
        </Field>
        <Field label="Birth (free text)">
          <input
            type="text"
            value={birthStr}
            onChange={(e) => setBirthStr(e.target.value)}
            placeholder="e.g. early 1900s, 1943-06-12"
          />
        </Field>
        <Field label="Birth place">
          <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
        </Field>
        <Field label="Death (free text)">
          <input type="text" value={deathStr} onChange={(e) => setDeathStr(e.target.value)} disabled={isLiving} />
        </Field>
        <Field label="Death place">
          <input type="text" value={deathPlace} onChange={(e) => setDeathPlace(e.target.value)} disabled={isLiving} />
        </Field>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <label className="small">
          <input type="checkbox" checked={birthEst} onChange={(e) => setBirthEst(e.target.checked)} />
          Birth date is estimated
        </label>
        <label className="small">
          <input type="checkbox" checked={deathEst} onChange={(e) => setDeathEst(e.target.checked)} />
          Death date is estimated
        </label>
        <label className="small">
          <input type="checkbox" checked={isLiving} onChange={(e) => setIsLiving(e.target.checked)} />
          Living
        </label>
      </div>
      <Field label="Biography">
        <textarea value={biography} onChange={(e) => setBiography(e.target.value)} />
      </Field>
      <Field label="Research notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Add person"}
        </button>
      </div>
    </form>
  );
}
