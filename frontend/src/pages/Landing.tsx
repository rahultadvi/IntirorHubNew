import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Users, FileText, TrendingUp, Star, Sparkles, Crown } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

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
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
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
      <section className="bg-gradient-to-b from-slate-50 to-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Select the perfect plan for your construction management needs
            </p>
          </div>

          {/* Pricing Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16">
            {/* Plan 1 - 3 Sites */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border-2 border-slate-200 hover:border-slate-900 transition-all transform hover:-translate-y-2">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
                <div className="mb-4">
                  <span className="text-4xl sm:text-5xl font-bold text-slate-900">₹800</span>
                  <span className="text-slate-600 text-lg">/month</span>
                </div>
                <p className="text-slate-600">Perfect for small teams</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">3 Construction Sites</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">Unlimited Team Members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">All Core Features</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">Email Support</span>
                </li>
              </ul>
              <button
                onClick={() => navigate('/signup')}
                className="w-full py-3 px-6 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
            </div>

            {/* Plan 2 - 5 Sites - Featured */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl border-2 border-slate-900 transform hover:-translate-y-2 transition-all relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                <div className="mb-4">
                  <span className="text-4xl sm:text-5xl font-bold text-white">₹1,500</span>
                  <span className="text-slate-300 text-lg">/month</span>
                </div>
                <p className="text-slate-300">Best for growing businesses</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-white">5 Construction Sites</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-white">Unlimited Team Members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-white">All Core Features</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-white">Priority Email Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-white">Advanced Analytics</span>
                </li>
              </ul>
              <button
                onClick={() => navigate('/signup')}
                className="w-full py-3 px-6 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
            </div>

            {/* Plan 3 - 10 Sites */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border-2 border-slate-200 hover:border-slate-900 transition-all transform hover:-translate-y-2">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
                <div className="mb-4">
                  <span className="text-4xl sm:text-5xl font-bold text-slate-900">₹2,500</span>
                  <span className="text-slate-600 text-lg">/month</span>
                </div>
                <p className="text-slate-600">For large operations</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">10 Construction Sites</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">Unlimited Team Members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">All Core Features</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">24/7 Priority Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">Advanced Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">Custom Integrations</span>
                </li>
              </ul>
              <button
                onClick={() => navigate('/signup')}
                className="w-full py-3 px-6 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Support Plans */}
          <div className="mt-16 sm:mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Support Plans
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Get additional support tailored to your needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Bronze Support */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-amber-200">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Bronze</h3>
                  <p className="text-slate-600">Essential Support</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span className="text-slate-700">Email Support (48h response)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span className="text-slate-700">Basic Documentation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span className="text-slate-700">Community Access</span>
                  </li>
                </ul>
              </div>

              {/* Silver Support */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-slate-300 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-slate-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Recommended
                  </span>
                </div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Silver</h3>
                  <p className="text-slate-600">Priority Support</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    <span className="text-slate-700">Email Support (24h response)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    <span className="text-slate-700">Priority Ticket Handling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    <span className="text-slate-700">Comprehensive Documentation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    <span className="text-slate-700">Video Tutorials Access</span>
                  </li>
                </ul>
              </div>

              {/* Gold Support */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-yellow-300">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Gold</h3>
                  <p className="text-slate-600">Premium Support</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <span className="text-slate-700">24/7 Priority Support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <span className="text-slate-700">Dedicated Account Manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <span className="text-slate-700">Custom Training Sessions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <span className="text-slate-700">Advanced Documentation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <span className="text-slate-700">Custom Integrations Support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Widget */}
      <a
        href="https://wa.me/917600425774"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 bg-[#25D366] hover:bg-[#20BA5A] rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 group"
        aria-label="Contact us on WhatsApp"
      >
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        <span className="absolute -top-12 right-0 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Chat with us
        </span>
      </a>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center text-slate-600 text-sm">
            <p>&copy; 2024 SiteZero. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
