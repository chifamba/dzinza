import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import FamilyTree from './pages/FamilyTree';
import DNAMatching from './pages/DNAMatching';
import HistoricalRecords from './pages/HistoricalRecords';
import PhotoEnhancement from './pages/PhotoEnhancement';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-body">
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/family-tree" element={<FamilyTree />} />
            <Route path="/dna-matching" element={<DNAMatching />} />
            <Route path="/records" element={<HistoricalRecords />} />
            <Route path="/photos" element={<PhotoEnhancement />} />
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;