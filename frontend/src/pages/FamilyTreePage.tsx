// src/pages/FamilyTreePage.tsx
import React from "react";
import { Header, Footer } from "../components/layout"; // Adjust path as needed
import { EditableFamilyTreeDisplay } from "../components/family-tree"; // Use the editable canvas component

const FamilyTreePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {/* Full-height main content for the canvas */}
      <main className="flex-grow">
        <EditableFamilyTreeDisplay />
      </main>
      <Footer />
    </div>
  );
};

export default FamilyTreePage;
