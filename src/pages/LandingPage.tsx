import React from 'react';
import { Header, Footer } from '../components/layout'; // Adjust path as needed
import { Button } from '../components/ui'; // Adjust path as needed
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="text-center py-12 md:py-20">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Discover Your Ancestry with Dzinza
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Build your family tree, connect with relatives, and explore your history
            through advanced DNA analysis and AI-powered insights.
          </p>
          <div className="space-x-4">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Get Started
              </Button>
            </Link>
            <Link to="/features">
              <Button variant="secondary" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <h2 className="text-3xl font-semibold text-center text-gray-800 mb-10">
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Interactive Family Trees</h3>
              <p className="text-gray-600">
                Easily build and visualize your family history.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">DNA Analysis</h3>
              <p className="text-gray-600">
                Upload and analyze your DNA data from major providers.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">AI Research Assistant</h3>
              <p className="text-gray-600">
                Get smart suggestions and record matching.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;