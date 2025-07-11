import React from "react";
import { MergeSuggestionsList } from "../components/merge-suggestions/MergeSuggestionsList";

const MergeSuggestionsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1>Merge Suggestions</h1>
      <MergeSuggestionsList />
    </div>
  );
};

export default MergeSuggestionsPage;
