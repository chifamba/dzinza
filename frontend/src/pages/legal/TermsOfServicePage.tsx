import React from "react";
import { Header, Footer } from "../../components/layout";

const TermsOfServicePage: React.FC = () => {
  const lastUpdated = "June 2025";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700 p-8 transition-colors duration-200">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-200">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 transition-colors duration-200">
            Last updated: {lastUpdated}
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Agreement to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                By accessing and using Dzinza ("the Service"), you agree to be
                bound by these Terms of Service ("Terms"). If you do not agree
                to these Terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Description of Service
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                Dzinza is a genealogy platform that allows users to create,
                manage, and share family trees and genealogical information. We
                provide tools for family history research, collaboration, and
                data management.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                User Accounts and Responsibilities
              </h2>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-200 dark:text-gray-300 leading-relaxed mb-4 transition-colors duration-200">
                To use certain features of our Service, you must create an
                account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 transition-colors duration-200 dark:text-gray-300 space-y-1 transition-colors duration-200">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>
                  Accept responsibility for all activities under your account
                </li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Use the Service in compliance with all applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Acceptable Use
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200 mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 transition-colors duration-200 dark:text-gray-300 space-y-1 transition-colors duration-200">
                <li>Upload false, misleading, or inappropriate content</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Upload malicious code or conduct security testing</li>
                <li>Use the Service for illegal activities</li>
                <li>Interfere with the proper functioning of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Content and Intellectual Property
              </h2>

              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                Your Content
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200 mb-4">
                You retain ownership of content you upload to the Service. By
                uploading content, you grant us a worldwide, royalty-free,
                perpetual, and transferable license to use, store, display,
                reproduce, modify, and distribute your content in connection
                with providing the Service.
              </p>

              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                Our Content
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                The Service and its original content, features, and
                functionality are owned by Dzinza and are protected by
                international copyright, trademark, and other intellectual
                property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Privacy and Data Use
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                Your privacy is important to us. By using the Service, you
                consent to the collection, use, and sharing of your information
                as described in our Privacy Policy. You acknowledge that we may
                use your data for improving our services, analytics, and
                marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Service Modifications
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                We reserve the right to modify, suspend, or discontinue any
                aspect of the Service at any time without notice. We may also
                impose limits on certain features or restrict access to parts of
                the Service without liability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Termination
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                We may terminate or suspend your account and access to the
                Service immediately, without prior notice, for any reason,
                including breach of these Terms. Upon termination, your right to
                use the Service ceases, but these Terms shall remain in effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Disclaimers
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR
                IMPLIED, INCLUDING:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 transition-colors duration-200 dark:text-gray-300 space-y-1 transition-colors duration-200">
                <li>Merchantability and fitness for a particular purpose</li>
                <li>Accuracy, reliability, or completeness of information</li>
                <li>Uninterrupted or error-free operation</li>
                <li>Security of data transmission or storage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Limitation of Liability
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DZINZA SHALL NOT BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA, ARISING FROM
                YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE
                POSSIBILITY OF SUCH DAMAGES.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Indemnification
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                You agree to indemnify and hold harmless Dzinza and its
                officers, directors, employees, and agents from any claims,
                damages, losses, or expenses arising from your use of the
                Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Governing Law
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                These Terms shall be governed by and construed in accordance
                with applicable laws, without regard to conflict of law
                principles. Any disputes shall be resolved through binding
                arbitration or in courts of competent jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Changes to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                We reserve the right to modify these Terms at any time. We will
                notify users of material changes by posting updated Terms on our
                website. Your continued use of the Service after changes become
                effective constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Contact Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                If you have questions about these Terms, please contact us at{" "}
                <a
                  href="mailto:legal@dzinza.com"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  legal@dzinza.org
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-200">
                Severability
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions will continue to be valid and
                enforceable to the fullest extent permitted by law.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfServicePage;
