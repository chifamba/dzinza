// src/pages/FamilyTreePage.tsx
import React from "react";
import { Header, Footer } from "../components/layout"; // Adjust path as needed
import { ModernFamilyTreeDisplay } from "../components/family-tree"; // Use the new modern component

const FamilyTreePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {/* Full-height main content for the modern family tree */}
      <main className="flex-grow">
        <ModernFamilyTreeDisplay />
      </main>
      <Footer />
    </div>
  );
};

export default FamilyTreePage;
