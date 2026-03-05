import React, { useState, useEffect } from "react";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { Plus, Building2, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { siteApi } from "../services/api";

const ManageSites: React.FC = () => {
  const { sites, activeSite, setActiveSite, refreshSites } = useSite();
  const { user, token } = useAuth();
  const [editingSite, setEditingSite] = useState<any | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [createProjectForm, setCreateProjectForm] = useState({
    projectName: '',
    projectType: 'Residential',
    projectLocation: '',
    startDate: '',
    expectedCompletionDate: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    totalProjectValue: '',
  });
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to manage sites.</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-7 w-7 text-gray-900" />
                Manage Sites
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Create, switch, and organize your workspace sites
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCreateProjectModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold shadow-sm transition-all"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Site</span>
            </button>
          </div>
        </div>


        {/* Sites Grid */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Sites</h2>
          
              {sites.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">No sites yet. Create your first site to get started.</p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCreateProjectModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Site
              </button>
            </div>
              ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site) => {
                const isCurrent = activeSite?.id === site.id;
                return (
                  <div
                    key={site.id}
                    className={`relative group rounded-xl p-6 transition-all border-2 ${
                      isCurrent
                        ? "bg-gray-50 border-gray-900 shadow-md"
                        : "bg-white border-gray-200 hover:border-gray-400 hover:shadow-sm"
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute top-1 right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-600 text-white text-xs font-semibold">
                          <Check className="h-3 w-3" />
                          Active
                        </span>
                      </div>
                    )}

                    {/* Site Icon */}
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`flex-shrink-0 h-16 w-16 rounded-xl flex items-center justify-center ${
                          isCurrent ? "bg-gray-900" : "bg-gradient-to-br from-gray-700 to-gray-900"
                        }`}
                      >
                        <span className="text-xl font-bold text-white">
                          {site.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 mt-2">
                        <h3
                          className={`font-semibold text-lg truncate ${
                            isCurrent ? "text-gray-900" : "text-gray-900"
                          }`}
                        >
                          {site.name}
                        </h3>
                        {site.description && (
                          <p
                            className={`text-sm mt-1 line-clamp-2 ${
                              isCurrent ? "text-gray-600" : "text-gray-500"
                            }`}
                          >
                            {site.description}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-2">Contract: <span className="font-semibold">₹{(site.contractValue ?? 0).toLocaleString("en-IN")}</span></p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-row gap-2">
                      {isCurrent ? (
                        <div className="flex-1 text-center py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg">
                          Currently Active
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveSite(site.id)}
                          className="flex-1 px-2 py-2 bg-black hover:bg-gray-400 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Switch Site
                        </button>
                      )}
                      <button 
                        onClick={() => setEditingSite(site)} 
                        className="flex-1 px-2 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-all"
                      >
                        Edit Site
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {showCreateProjectModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateProjectModal(false);
            }
          }}
        >
          <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 opacity-100" />
          <div 
            className="relative bg-white rounded-xl w-full max-w-lg p-4 sm:p-6 shadow-lg
        overflow-auto max-h-[calc(100vh-8rem)]
        transform transition-all duration-300
        scale-100 translate-y-0 opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col">
                <h3 className="text-base font-semibold">Create New Site/ Project</h3>
                <span className="text-xs text-gray-500">Add a new project to manage BOQ and site details</span>
              </div>
              <button onClick={() => setShowCreateProjectModal(false)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault();
              try {
                if (!token) throw new Error('No auth token');
                const payload = {
                  name: createProjectForm.projectName,
                  description: createProjectForm.projectLocation || undefined,
                  contractValue: Number(createProjectForm.totalProjectValue || 0),
                  clientEmail: createProjectForm.clientEmail || undefined,
                  clientPhone: createProjectForm.clientPhone || undefined,
                  startDate: createProjectForm.startDate || undefined,
                };
                await siteApi.createSite(payload, token);
                await refreshSites();
                // Persist timeline metadata locally so Home can show start/target dates
                try {
                  const metaKey = `site-meta:${createProjectForm.projectName}`;
                  const meta = {
                    startDate: createProjectForm.startDate || undefined,
                    expectedCompletionDate: createProjectForm.expectedCompletionDate || undefined,
                  };
                  localStorage.setItem(metaKey, JSON.stringify(meta));
                } catch (err) {
                  // ignore localStorage errors
                }
                setShowCreateProjectModal(false);
                setCreateProjectForm({
                  projectName: '', projectType: 'Residential', projectLocation: '', startDate: '', expectedCompletionDate: '', clientName: '', clientPhone: '', clientEmail: '', totalProjectValue: ''
                });
              } catch (err) {
                console.error('Create site failed', err);
              }
            }} className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Project Name *</label>
                <input
                  required
                  className="w-full mt-1 p-2 border rounded"
                  value={createProjectForm.projectName}
                  onChange={(e) => setCreateProjectForm({...createProjectForm, projectName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Project Type *</label>
                <select
                  required
                  className="w-full mt-1 p-2 border rounded"
                  value={createProjectForm.projectType}
                  onChange={(e) => setCreateProjectForm({...createProjectForm, projectType: e.target.value})}
                >
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Office</option>
                  <option>Retail</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Project Location *</label>
                <input
                  required
                  className="w-full mt-1 p-2 border rounded"
                  value={createProjectForm.projectLocation}
                  onChange={(e) => setCreateProjectForm({...createProjectForm, projectLocation: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600">Start Date *</label>
                  <input
                    required
                    type="date"
                    className="w-full mt-1 p-2 border rounded"
                    value={createProjectForm.startDate}
                    onChange={(e) => setCreateProjectForm({...createProjectForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Expected Completion Date *</label>
                  <input
                    required
                    type="date"
                    className="w-full mt-1 p-2 border rounded"
                    value={createProjectForm.expectedCompletionDate}
                    onChange={(e) => setCreateProjectForm({...createProjectForm, expectedCompletionDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Client Name *</label>
                <input
                  required
                  className="w-full mt-1 p-2 border rounded"
                  value={createProjectForm.clientName}
                  onChange={(e) => setCreateProjectForm({...createProjectForm, clientName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600">Client Phone Number</label>
                  <input
                    type="tel"
                    className="w-full mt-1 p-2 border rounded"
                    value={createProjectForm.clientPhone}
                    onChange={(e) => setCreateProjectForm({...createProjectForm, clientPhone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Client Email</label>
                  <input
                    type="email"
                    className="w-full mt-1 p-2 border rounded"
                    value={createProjectForm.clientEmail}
                    onChange={(e) => setCreateProjectForm({...createProjectForm, clientEmail: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Total Project Value (₹) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  className="w-full mt-1 p-2 border rounded"
                  value={createProjectForm.totalProjectValue}
                  onChange={(e) => setCreateProjectForm({...createProjectForm, totalProjectValue: e.target.value})}
                />
              </div>
              <div className="flex flex-row items-center justify-end gap-2 mt-2">
                <button type="button" onClick={() => { setShowCreateProjectModal(false); }} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSite && <EditSiteModal site={editingSite} onClose={() => setEditingSite(null)} />}
    </div>
  );
};

export default ManageSites;
 
// Edit Site Modal (renders when `editingSite` is set)

const EditSiteModal: React.FC<{
  site: any | null;
  onClose: () => void;
}> = ({ site, onClose }) => {
  const { token, user } = useAuth();
  const { refreshSites } = useSite();
  const [name, setName] = useState(site?.name || "");
  const [description, setDescription] = useState(site?.description || "");
  const [contractValue, setContractValue] = useState<string>(site ? String(site.contractValue ?? 0) : "");
  const [clientEmail, setClientEmail] = useState(site?.clientEmail || "");
  const [clientPhone, setClientPhone] = useState(site?.clientPhone || "");
  const [startDate, setStartDate] = useState(site?.startDate ? site.startDate.slice(0, 10) : "");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(site?.expectedCompletionDate ? site.expectedCompletionDate.slice(0, 10) : "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(site?.name || "");
    setDescription(site?.description || "");
    setContractValue(site ? String(site.contractValue ?? 0) : "");
    setClientEmail(site?.clientEmail || "");
    setClientPhone(site?.clientPhone || "");
    setStartDate(site?.startDate ? site.startDate.slice(0, 10) : "");
    setExpectedCompletionDate(site?.expectedCompletionDate ? site.expectedCompletionDate.slice(0, 10) : "");
  }, [site]);

  if (!site) return null;

  const isAdmin = user?.role === "ADMIN";
  if (!isAdmin) return null;

  const save = async () => {
    if (!token) return;
    try {
      setLoading(true);
      await siteApi.updateSite(
        site.id,
        {
          name,
          description,
          contractValue: Number(String(contractValue).replace(/,/g, "") || 0),
          clientEmail,
          clientPhone,
          startDate: startDate || undefined,
          expectedCompletionDate: expectedCompletionDate || undefined,
        },
        token
      );
      await refreshSites();
      onClose();
    } catch (err) {
      console.error("Failed to update site", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit site</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
           <div className="flex-1 overflow-y-auto pr-2">
        <label className="block mb-3 text-sm">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block mb-3 text-sm">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} />
        </label>
        <label className="block mb-3 text-sm">
          Contract Value
          <input value={contractValue} onChange={(e) => setContractValue(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block mb-3 text-sm">
          Client Email
          <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block mb-3 text-sm">
          Client Phone
          <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block mb-4 text-sm">
          Start Date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block mb-4 text-sm">
          Expected Completion Date
          <input type="date" value={expectedCompletionDate} onChange={(e) => setExpectedCompletionDate(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <div className="flex flex-row items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={save} disabled={loading} className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Saving' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
