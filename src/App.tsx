import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import FamilyTree from './pages/FamilyTree';
import DNAMatching from './pages/DNAMatching';
import HistoricalRecords from './pages/HistoricalRecords';
import PhotoEnhancement from './pages/PhotoEnhancement';
import Dashboard from './pages/Dashboard';
import { initializeLanguage } from './i18n/utils/languagePersistence';
import './i18n';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    initializeLanguage(i18n);
  }, [i18n]);

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