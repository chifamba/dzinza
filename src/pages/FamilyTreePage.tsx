// src/pages/FamilyTreePage.tsx
import React from 'react';
import { Header, Footer } from '../components/layout'; // Adjust path as needed
import { FamilyTreeDisplay } from '../components/family-tree'; // Adjust path as needed

const FamilyTreePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Family Tree
        </h1>
        <FamilyTreeDisplay />
      </main>
      <Footer />
    </div>
  );
};

export default FamilyTreePage;
