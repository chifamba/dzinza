import React, { useEffect, useState } from "react";
import {
  mergeSuggestionService,
  MergeSuggestion,
} from "../../services/api/mergeSuggestionService";

export const MergeSuggestionsList: React.FC = () => {
  const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    mergeSuggestionService
      .listMergeSuggestions()
      .then(setSuggestions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await mergeSuggestionService.acceptMergeSuggestion(id);
      setSuggestions((s) => s.filter((sug) => sug._id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: string) => {
    setActionLoading(id);
    try {
      await mergeSuggestionService.declineMergeSuggestion(id);
      setSuggestions((s) => s.filter((sug) => sug._id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Loading merge suggestions...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (suggestions.length === 0)
    return <div>No merge suggestions at this time.</div>;

  return (
    <div>
      <h2>Merge Suggestions</h2>
      <ul>
        {suggestions.map((sug) => (
          <li
            key={sug._id}
            style={{ border: "1px solid #ccc", margin: 8, padding: 8 }}
          >
            <div>
              <b>Confidence:</b> {(sug.confidence * 100).toFixed(1)}%
            </div>
            <div>
              <b>Status:</b> {sug.status}
            </div>
            <div>
              <b>Preview Tree:</b>
              <pre
                style={{
                  background: "#f8f8f8",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(sug.previewTree, null, 2)}
              </pre>
            </div>
            <button
              disabled={actionLoading === sug._id}
              onClick={() => handleAccept(sug._id)}
            >
              Accept & Merge
            </button>
            <button
              disabled={actionLoading === sug._id}
              onClick={() => handleDecline(sug._id)}
              style={{ marginLeft: 8 }}
            >
              Decline
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
