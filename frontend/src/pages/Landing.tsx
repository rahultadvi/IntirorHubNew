import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Users, FileText, TrendingUp, Check, Phone, Mail, MessageCircle, X } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-2">
              <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900" />
              <span className="text-xl sm:text-2xl font-bold text-slate-900">
                SiteZero
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-3 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-3 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-12 sm:pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
            Manage Your
            <span className="text-slate-900">
              {' '}Construction Sites{' '}
            </span>
            Effortlessly
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 mb-8 sm:mb-12 leading-relaxed px-4">
            The all-in-one platform for contractors, site managers, and teams to collaborate, track progress, and deliver projects on time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-2xl transition-all transform hover:scale-105"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-slate-900 bg-white hover:bg-slate-50 rounded-xl shadow-xl transition-all border border-slate-900"
            >
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-slate-200">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Task Management</h3>
            <p className="text-slate-600 text-sm">
              Track tasks, assign responsibilities, and monitor progress in real-time.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-slate-200">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Team Collaboration</h3>
            <p className="text-slate-600 text-sm">
              Invite team members, share updates, and communicate seamlessly.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-slate-200">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">BOQ Management</h3>
            <p className="text-slate-600 text-sm">
              Create detailed bills of quantities and manage expenses efficiently.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-slate-200">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Progress Tracking</h3>
            <p className="text-slate-600 text-sm">
              Visualize project progress with intuitive dashboards and reports.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 sm:mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg sm:text-xl text-slate-600">
            One simple plan with everything you need to manage your construction sites.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-900 p-8 sm:p-10 hover:shadow-3xl transition-all">
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl sm:text-6xl font-bold text-slate-900">₹699</span>
                <span className="text-lg sm:text-xl text-slate-600">per site</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Billed per site</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">Unlimited construction sites</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">Unlimited team members</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">All features included</span>
              </li>
            </ul>

            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3 sm:py-4 text-base sm:text-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 mt-12 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            {/* Company Info */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900" />
                <span className="text-xl sm:text-2xl font-bold text-slate-900">
                  SiteZero
                </span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                The all-in-one platform for managing construction sites, tracking progress, and collaborating with your team.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => navigate('/signup')}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Get Started
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Login
                  </button>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                    Features
                  </a>
                </li>
              </ul>
            </div>

            {/* Features Links */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Features</h3>
              <ul className="space-y-3">
                <li>
                  <span className="text-sm text-slate-600">Task Management</span>
                </li>
                <li>
                  <span className="text-sm text-slate-600">Team Collaboration</span>
                </li>
                <li>
                  <span className="text-sm text-slate-600">BOQ Management</span>
                </li>
                <li>
                  <span className="text-sm text-slate-600">Progress Tracking</span>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Contact Us</h3>
              <ul className="space-y-4">
                <li>
                  <a
                    href="tel:+919876543210"
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors group"
                  >
                    <Phone className="w-5 h-5 text-slate-700 group-hover:text-slate-900" />
                    <span>+91 98765 43210</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:support@sitezero.com"
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors group"
                  >
                    <Mail className="w-5 h-5 text-slate-700 group-hover:text-slate-900" />
                    <span>support@sitezero.com</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/919876543210"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors group"
                  >
                    <MessageCircle className="w-5 h-5 text-green-600 group-hover:text-green-700" />
                    <span>WhatsApp Us</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-200 pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                &copy; 2024 SiteZero. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setShowPrivacyPolicy(true)}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => setShowTerms(true)}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Terms of Service
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Widget */}
      <a
        href="https://wa.me/919876543210"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20BA5A] text-white p-4 rounded-full shadow-2xl hover:shadow-green-500/50 transition-all transform hover:scale-110 animate-bounce hover:animate-none group"
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          Chat with us on WhatsApp
        </span>
      </a>

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowPrivacyPolicy(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Privacy Policy</h2>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6 sm:p-8">
              <div className="space-y-6 text-slate-700">
                <div>
                  <p className="text-sm text-slate-600 mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">1. Information We Collect</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    We collect information that you provide directly to us, including but not limited to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                    <li>Name, email address, phone number, and other contact information</li>
                    <li>Account credentials and profile information</li>
                    <li>Payment information and billing details</li>
                    <li>Construction site data, project information, and related content</li>
                    <li>Communication records and support requests</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">2. How We Use Your Information</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process transactions and send related information</li>
                    <li>Send technical notices, updates, and support messages</li>
                    <li>Respond to your comments, questions, and requests</li>
                    <li>Monitor and analyze trends and usage patterns</li>
                    <li>Detect, prevent, and address technical issues</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">3. Information Sharing</h3>
                  <p className="text-sm leading-relaxed">
                    We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4 mt-3">
                    <li>With your explicit consent</li>
                    <li>To comply with legal obligations</li>
                    <li>To protect our rights and safety</li>
                    <li>With service providers who assist in operating our platform</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">4. Data Security</h3>
                  <p className="text-sm leading-relaxed">
                    We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">5. Your Rights</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    You have the right to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                    <li>Access and receive a copy of your personal data</li>
                    <li>Request correction of inaccurate information</li>
                    <li>Request deletion of your personal data</li>
                    <li>Object to processing of your personal data</li>
                    <li>Withdraw consent at any time</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">6. Cookies and Tracking</h3>
                  <p className="text-sm leading-relaxed">
                    We use cookies and similar tracking technologies to track activity on our platform and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">7. Changes to This Policy</h3>
                  <p className="text-sm leading-relaxed">
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">8. Contact Us</h3>
                  <p className="text-sm leading-relaxed">
                    If you have any questions about this Privacy Policy, please contact us at support@sitezero.com or through the contact information provided on our website.
                  </p>
                </section>
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-slate-200 p-6">
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowTerms(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Terms of Service</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6 sm:p-8">
              <div className="space-y-6 text-slate-700">
                <div>
                  <p className="text-sm text-slate-600 mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h3>
                  <p className="text-sm leading-relaxed">
                    By accessing and using SiteZero ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, you should not use our Service.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">2. Description of Service</h3>
                  <p className="text-sm leading-relaxed">
                    SiteZero is a construction site management platform that provides tools for task management, team collaboration, BOQ management, progress tracking, and related features for managing construction projects.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">3. User Accounts</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    To use our Service, you must:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                    <li>Create an account with accurate and complete information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Be responsible for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized use</li>
                    <li>Be at least 18 years old or have parental consent</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">4. Payment Terms</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    Our Service is available at ₹699 per site. Payment terms include:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                    <li>Billing occurs per construction site added to your account</li>
                    <li>All fees are non-refundable unless otherwise stated</li>
                    <li>Prices may change with 30 days notice</li>
                    <li>You are responsible for any applicable taxes</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">5. User Responsibilities</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    You agree to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                    <li>Use the Service only for lawful purposes</li>
                    <li>Not violate any laws or regulations</li>
                    <li>Not infringe on intellectual property rights</li>
                    <li>Not transmit harmful code or malicious software</li>
                    <li>Not interfere with the Service's operation</li>
                    <li>Respect other users' rights and privacy</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">6. Intellectual Property</h3>
                  <p className="text-sm leading-relaxed">
                    All content, features, and functionality of the Service are owned by SiteZero and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">7. Data and Content</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    You retain ownership of any data or content you submit through the Service. By using the Service, you grant us a license to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                    <li>Store, process, and display your content</li>
                    <li>Use your content to provide and improve our Service</li>
                    <li>Create backups and ensure data security</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">8. Service Availability</h3>
                  <p className="text-sm leading-relaxed">
                    We strive to provide reliable service but do not guarantee uninterrupted or error-free operation. We reserve the right to modify, suspend, or discontinue the Service at any time with or without notice.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">9. Limitation of Liability</h3>
                  <p className="text-sm leading-relaxed">
                    To the maximum extent permitted by law, SiteZero shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">10. Termination</h3>
                  <p className="text-sm leading-relaxed">
                    We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service will immediately cease.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">11. Changes to Terms</h3>
                  <p className="text-sm leading-relaxed">
                    We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the new Terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">12. Governing Law</h3>
                  <p className="text-sm leading-relaxed">
                    These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in India.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">13. Contact Information</h3>
                  <p className="text-sm leading-relaxed">
                    If you have any questions about these Terms of Service, please contact us at support@sitezero.com or through the contact information provided on our website.
                  </p>
                </section>
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-slate-200 p-6">
              <button
                onClick={() => setShowTerms(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
