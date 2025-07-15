import React from "react";
import { Header, Footer } from "../../components/layout";

const PrivacyPolicyPage: React.FC = () => {
  const lastUpdated = "June 2025";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700 p-8 transition-colors duration-200">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-200">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 transition-colors duration-200">
            Last updated: {lastUpdated}
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Introduction
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                Welcome to Dzinza ("we," "our," or "us"). We are committed to
                protecting your privacy and ensuring you have a positive
                experience on our genealogy platform. This Privacy Policy
                explains how we collect, use, and protect your information when
                you use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Information We Collect
              </h2>

              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                Personal Information
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 transition-colors duration-200">
                We may collect personal information that you voluntarily
                provide, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1 mb-4 transition-colors duration-200">
                <li>Name, email address, and contact information</li>
                <li>Profile information and family tree data</li>
                <li>Photos, documents, and other genealogical materials</li>
                <li>Account preferences and settings</li>
                <li>Other useful personal information</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                Automatically Collected Information
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 transition-colors duration-200">
                We automatically collect certain information about your device
                and usage:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1 transition-colors duration-200">
                <li>Device information, IP address, and browser type</li>
                <li>Usage patterns, features accessed, and time spent</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Analytics data to improve our services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                How We Use Your Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 transition-colors duration-200">
                We use your information for various purposes, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1 transition-colors duration-200">
                <li>
                  Providing, maintaining, and improving our genealogy services
                </li>
                <li>
                  Processing your requests and facilitating family tree creation
                </li>
                <li>
                  Communicating with you about your account and our services
                </li>
                <li>
                  Personalizing your experience and showing relevant content
                </li>
                <li>Analyzing usage patterns to enhance functionality</li>
                <li>
                  Marketing our services and showing relevant advertisements
                </li>
                <li>Ensuring security and preventing fraud</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Information Sharing
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 transition-colors duration-200">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1 transition-colors duration-200">
                <li>With family members or collaborators on the platforms</li>
                <li>With service providers who assist in our operations</li>
                <li>
                  For advertising and marketing purposes through third-party
                  platforms
                </li>
                <li>When required by law or to protect our rights</li>
                <li>In connection with business transfers or acquisitions</li>
                <li>With your explicit consent for other purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Advertising and Analytics
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                We may use third-party advertising services and analytics tools
                to better understand our users and improve our services. These
                partners may collect information about your activities on our
                platform and other websites to provide relevant advertisements
                and insights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Data Security
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                We implement appropriate technical and organizational measures
                to protect your personal information. However, no method of
                transmission over the internet is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Your Rights
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 transition-colors duration-200">
                Depending on your location, you may have certain rights
                regarding your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1 transition-colors duration-200">
                <li>Access to your personal information</li>
                <li>Correction of inaccurate information</li>
                <li>
                  Deletion of your information (subject to legal requirements)
                </li>
                <li>Portability of your data</li>
                <li>Opting out of certain communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                International Data Transfers
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                Your information may be transferred to and processed in
                countries other than your own. We ensure appropriate safeguards
                are in place for such transfers in accordance with applicable
                laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Changes to This Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by posting the new policy on
                our website and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Contact Us
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                If you have questions about this Privacy Policy or our privacy
                practices, please contact us at{" "}
                <a
                  href="mailto:privacy@dzinza.com"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  privacy@dzinza.org
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
