import React, { useEffect, useState } from "react";
import {
  mergeSuggestionService,
  PersonHistoryEntry,
} from "../../services/api/mergeSuggestionService";

export const PersonHistoryViewer: React.FC<{ personId: string }> = ({
  personId,
}) => {
  const [history, setHistory] = useState<PersonHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState<number | null>(null);

  useEffect(() => {
    mergeSuggestionService
      .getPersonHistory(personId)
      .then(setHistory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [personId]);

  const handleRevert = async (version: number) => {
    setReverting(version);
    try {
      await mergeSuggestionService.revertPerson(personId, version);
      alert("Person reverted to selected version.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReverting(null);
    }
  };

  if (loading) return <div>Loading history...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (history.length === 0) return <div>No history found for this person.</div>;

  return (
    <div>
      <h3>Change History</h3>
      <ul>
        {history.map((entry) => (
          <li
            key={entry._id}
            style={{ border: "1px solid #eee", margin: 8, padding: 8 }}
          >
            <div>
              <b>Version:</b> {entry.version}
            </div>
            <div>
              <b>Change Type:</b> {entry.changeType}
            </div>
            <div>
              <b>Changed By:</b> {entry.changedBy}
            </div>
            <div>
              <b>Date:</b> {new Date(entry.createdAt).toLocaleString()}
            </div>
            <pre
              style={{
                background: "#f8f8f8",
                maxHeight: 150,
                overflow: "auto",
              }}
            >
              {JSON.stringify(entry.data, null, 2)}
            </pre>
            <button
              disabled={reverting === entry.version}
              onClick={() => handleRevert(entry.version)}
            >
              Revert to this version
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
