import React from "react";
import { Header, Footer } from "../components/layout"; // Adjust path as needed
import { Button } from "../components/ui"; // Adjust path as needed
import { Link } from "react-router-dom";

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="text-center py-12 md:py-20">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-6 transition-colors duration-200">
            Discover Your Ancestry with Dzinza
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto transition-colors duration-200">
            Build your family tree, connect with relatives, and explore your
            history through advanced DNA analysis and AI-powered insights.
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
          <h2 className="text-3xl font-semibold text-center text-gray-800 dark:text-white mb-10 transition-colors duration-200">
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3 transition-colors duration-200">
                Interactive Family Trees
              </h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                Easily build and visualize your family history.
              </p>
            </div>
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3 transition-colors duration-200">
                DNA Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                Upload and analyze your DNA data from major providers.
              </p>
            </div>
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3 transition-colors duration-200">
                AI Research Assistant
              </h3>
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
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
