import React, { useEffect, useState } from 'react';
import { Building2, Users, MapPin, Calendar, Phone, Mail, AlertCircle, X, Search, RefreshCw } from 'lucide-react';
import { adminApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Local DTO types
export interface CompanyUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  joinedAt?: string;
}

export interface SiteDto {
  id: string;
  name: string;
  description?: string;
  image?: string;
  createdAt: string;
  contractValue?: number;
}

interface CompanyRow {
  id: string;
  companyName: string;
  email: string;
  phone?: string;
  createdAt?: string;
  paymentDue?: boolean;
}

const Adminpanel: React.FC = () => {
  const { token, user, uploadCompanyLogo, loading } = useAuth();
  

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyRow[]>([]);
  // loading state removed
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<CompanyUserDto[] | null>(null);
  const [selectedSites, setSelectedSites] = useState<SiteDto[] | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCompanies = async () => {
    if (!token) return;
    // loading removed
    setError(null);
    try {
      const data = await adminApi.listCompanyAdmins(token);
      const companyData = (data.companies || []).map((c: any) => ({
        id: c.id,
        companyName: c.companyName,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt,
        paymentDue: Boolean(c.paymentDue),
      }));
      setCompanies(companyData);
      setFilteredCompanies(companyData);
    } catch (err) {
      setError('Failed to load companies. Please check your connection and try again.');
    } finally {
      // loading removed
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [token]);

  useEffect(() => {
    const filtered = companies.filter(c => 
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [searchTerm, companies]);

  const viewUsers = async (companyName: string) => {
    if (!token) return;
    setModalTitle(`Users — ${companyName}`);
    try {
      const res = await adminApi.getCompanyUsers(companyName, token);
      setSelectedUsers(res.users || []);
      setSelectedSites(null);
    } catch (e) {
      setError('Failed to load users.');
    }
  };

  const viewSites = async (companyName: string) => {
    if (!token) return;
    setModalTitle(`Sites — ${companyName}`);
    try {
      const res = await adminApi.getCompanySites(companyName, token);
      setSelectedSites(res.sites || []);
      setSelectedUsers(null);
    } catch (e) {
      setError('Failed to load sites.');
    }
  };

  const togglePayment = async (companyName: string, enabled: boolean) => {
    if (!token) return;
    try {
      await adminApi.togglePaymentDue(companyName, enabled, token);
      await fetchCompanies();
    } catch (e) {
      setError('Failed to update payment status.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
     <div className="bg-white border-b border-slate-200 shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <div className="flex items-center justify-between">

      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg shadow-md">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
          <p className="text-sm text-slate-500">Manage companies and access</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        {/* Company Logo */}
        <img
          src={user?.companyLogo || "/default-logo.png"}
          alt="Company Logo"
          className="w-10 h-10 rounded-full object-cover border border-slate-300"
        />

        {/* Change Logo Button (Only Admin) */}
        {user?.role === "ADMIN" && (
          <label className="cursor-pointer bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded text-sm">
            {loading ? "Uploading..." : "Change Logo"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await uploadCompanyLogo(file);
                alert("Company logo updated!");
              }}
            />
          </label>
        )}

        {/* Refresh Button */}
        <button 
          onClick={fetchCompanies}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>

      </div>
    </div>
  </div>
</div>



      

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Companies</p>
                <p className="text-2xl font-bold text-slate-800">{companies.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active</p>
                <p className="text-2xl font-bold text-slate-800">{companies.filter(c => !c.paymentDue).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Payment Due</p>
                <p className="text-2xl font-bold text-slate-800">{companies.filter(c => c.paymentDue).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Companies List */}
        {!error && filteredCompanies.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No companies found matching your search.</p>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg border border-slate-200">
          {(
            <>
              {/* Desktop Table */}
              {filteredCompanies.length > 0 && (
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm">
                                {c.companyName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800">{c.companyName}</div>
                                {c.paymentDue && (
                                  <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full mt-1">
                                    Payment Due
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="w-4 h-4 text-slate-400" />
                                {c.email}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="w-4 h-4 text-slate-400" />
                                {c.phone || '—'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <div className="relative">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={!!c.paymentDue} 
                                  onChange={(e) => togglePayment(c.companyName, e.target.checked)} 
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                              </div>
                              <span className="text-sm text-slate-600">{c.paymentDue ? 'Due' : 'Clear'}</span>
                            </label>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => viewUsers(c.companyName)} 
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                              >
                                <Users className="w-4 h-4" />
                                Users
                              </button>
                              <button 
                                onClick={() => viewSites(c.companyName)} 
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                              >
                                <MapPin className="w-4 h-4" />
                                Sites
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile Cards */}
              <div className="lg:hidden p-4 space-y-4">
                {filteredCompanies.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors border border-slate-200 rounded-lg shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg shadow-sm flex-shrink-0">
                        {c.companyName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 mb-1">{c.companyName}</div>
                        {c.paymentDue && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            Payment Due
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="break-all">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{c.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                      <span className="text-sm text-slate-600">Payment Status</span>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={!!c.paymentDue} 
                            onChange={(e) => togglePayment(c.companyName, e.target.checked)} 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </div>
                        <span className="text-sm text-slate-600">{c.paymentDue ? 'Due' : 'Clear'}</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => viewUsers(c.companyName)} 
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        <Users className="w-4 h-4" />
                        View Users
                      </button>
                      <button 
                        onClick={() => viewSites(c.companyName)} 
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        <MapPin className="w-4 h-4" />
                        View Sites
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {(selectedUsers || selectedSites) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xl font-semibold text-slate-800">{modalTitle}</h3>
              <button 
                onClick={() => { setSelectedUsers(null); setSelectedSites(null); }} 
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)]">
              {selectedUsers && (
                <div className="space-y-3">
                  {selectedUsers.map((u) => (
                    <div key={u.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                      <div className="relative flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-green-500 to-green-600 w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{u.name}</div>
                            <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                              <Mail className="w-3 h-3" />
                              {u.email}
                            </div>
                            <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              {u.role}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 absolute top-12 ">
                          <Calendar className="w-3 h-3" />
                          {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedSites && (
                <div className="space-y-3">
                  {selectedSites.map((s) => (
                    <div key={s.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                      <div className="flex items-start gap-3">
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{s.name}</div>
                          <div className="text-sm text-slate-600 mt-1">{s.description}</div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                            <span className="text-xs text-slate-500">Contract Value</span>
                            <span className="font-semibold text-slate-800">
                              {s.contractValue ? `$${s.contractValue.toLocaleString()}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Adminpanel;