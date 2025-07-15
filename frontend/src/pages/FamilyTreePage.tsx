// src/pages/FamilyTreePage.tsx
import React from "react";
import { Header, Footer } from "../components/layout"; // Adjust path as needed
import { ModernFamilyTreeDisplay } from "../components/family-tree"; // Use the new modern component

const FamilyTreePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <Header />
      {/* Full-height main content for the modern family tree */}
      <main className="flex-grow bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <ModernFamilyTreeDisplay />
      </main>
      <Footer />
    </div>
  );
};

export default FamilyTreePage;
