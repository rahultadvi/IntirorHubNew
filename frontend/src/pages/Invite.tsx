import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi, ApiError, type UserRole, userApi } from "../services/api";
import {
  Mail,
  User,
  Phone,
  Shield,
  Loader2,
  Users,
  Building2,
  Plus,
  X,
  Trash2,
  Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSite } from "../context/SiteContext";

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  siteAccessCount?: number;
  siteAccess?: string[];
  allowedModules?: string[];
}

const roles: Array<{
  value: Exclude<UserRole, "ADMIN">;
  label: string;
  description: string;
}> = [
  { value: "MANAGER", label: "Manager", description: "Project management" },
  { value: "AGENT", label: "Agent", description: "Field execution" },
  { value: "CLIENT", label: "Client", description: "Project visibility" },
];

const Invite: React.FC = () => {
  const navigate = useNavigate();
  const { token, user, loading: authLoading } = useAuth();
  const { sites } = useSite();
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    role: roles[0].value,
  });
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>(['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projectUsers, setProjectUsers] = useState<CompanyUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
  }, [authLoading, navigate, token, user]);

  // Open add form when navigated with ?openAdd=1 — watch location.search so it works without remount
  const location = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || window.location.search);
      if (params.get("openAdd")) setShowAddForm(true);
    } catch (e) {}

    const handler = () => setShowAddForm(true);
    window.addEventListener('open-add-invite', handler as EventListener);
    return () => window.removeEventListener('open-add-invite', handler as EventListener);
  }, [location.search]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!token) {
        return;
      }

      setLoadingUsers(true);
      try {
        const response = await userApi.listUsers(token);
        const users: CompanyUser[] = response.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          avatar: u.avatar,
          siteAccessCount: (u as any).siteAccessCount ?? 0,
          siteAccess: (u as any).siteAccess ?? [],
          allowedModules: (u as any).allowedModules ?? allModules.map(m => m.value),
        }));
        setProjectUsers(users);
      } catch (err) {
        console.error("listUsers error", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [token]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSite = (siteId: string) => {
    setSelectedSites((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const toggleModule = (module: string) => {
    setSelectedModules((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module]
    );
  };

  const allModules = [
    { value: 'home', label: 'Home' },
    { value: 'payments', label: 'Payments' },
    { value: 'boq', label: 'BOQ' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'feed', label: 'Feed' },
    { value: 'invite', label: 'Invite' },
    { value: 'manage-sites', label: 'Manage Sites' },
    { value: 'users', label: 'Users' },
  ];

  // Admin: edit existing user's site access
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [editingSites, setEditingSites] = useState<string[]>([]);
  const [deletingUser, setDeletingUser] = useState<CompanyUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Admin: edit existing user's module permissions
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [editingModules, setEditingModules] = useState<string[]>([]);

  const openEditSites = (member: CompanyUser) => {
    setEditingUser(member);
    setEditingSites(member.siteAccess ? [...member.siteAccess] : []);
  };

  const toggleEditingSite = (siteId: string) => {
    setEditingSites((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const saveEditingSites = async () => {
    if (!editingUser || !token) return;
    try {
      await userApi.updateUserSiteAccess(
        editingUser.id,
        { siteIds: editingSites },
        token
      );
      setProjectUsers((prev) =>
        prev.map((p) =>
          p.id === editingUser.id
            ? {
                ...p,
                siteAccess: [...editingSites],
                siteAccessCount: editingSites.length,
              }
            : p
        )
      );
      setEditingUser(null);
      setEditingSites([]);
    } catch (err) {
      console.error("update user sites error", err);
      // optionally show error to user
    }
  };

  const openEditPermissions = (member: CompanyUser) => {
    setEditingPermissions(member.id);
    setEditingModules(member.allowedModules || allModules.map(m => m.value));
  };

  const toggleEditingModule = (module: string) => {
    setEditingModules((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module]
    );
  };

  const handleSavePermissions = async () => {
    if (!editingPermissions || !token) return;
    try {
      await userApi.updateUserPermissions(editingPermissions, { allowedModules: editingModules }, token);
      setProjectUsers((prev) =>
        prev.map((p) =>
          p.id === editingPermissions
            ? { ...p, allowedModules: [...editingModules] }
            : p
        )
      );
      setEditingPermissions(null);
      setEditingModules([]);
      setSuccess('Permissions updated successfully');
    } catch (err: any) {
      console.error("update permissions error", err);
      setError(err?.message || 'Failed to update permissions');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser || !token) return;
    
    setIsDeleting(true);
    try {
      await userApi.deleteUser(deletingUser.id, token);
      setProjectUsers((prev) => prev.filter((p) => p.id !== deletingUser.id));
      setSuccess(`User ${deletingUser.name} deleted successfully`);
      setDeletingUser(null);
    } catch (err) {
      console.error("delete user error", err);
      const message = err instanceof ApiError ? err.message : "Unable to delete user";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      setIsSubmitting(true);
      await authApi.inviteUser(
        {
          email: formData.email.trim(),
          name: formData.name.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          siteIds: selectedSites,
          allowedModules: selectedModules.length > 0 ? selectedModules : undefined,
        },
        token
      );

      setSuccess(
        "Invitation sent. The teammate receives a temporary password via email."
      );
      setFormData({ email: "", name: "", phone: "", role: roles[0].value });
      setSelectedSites([]);
      setSelectedModules(['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users']);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to send invite";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-16">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
            Invite team
          </p>
          <h1 className="text-3xl font-semibold text-black">
            Add a teammate to your workspace
          </h1>
          <p className="text-sm text-gray-500">
            Choose the right role and the system generates a secure password
            automatically. The invitee receives an email with the credentials
            and your company details.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
            {success}
          </div>
        )}

    
    
        {/* Project Team Section */}
        <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-gray-100">
            <Users className="h-6 w-6 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Project Team
              </h2>
              <p className="text-sm text-gray-500">
                {projectUsers.length}{" "}
                {projectUsers.length === 1 ? "Member" : "Members"}
              </p>
            </div>
          </div>

          <div className="p-6">
            {loadingUsers ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Loading team members...
              </div>
            ) : projectUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No team members found.
              </div>
            ) : (
             <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {projectUsers.map((member) => (
    <div
      key={member.id}
      className="flex flex-col rounded-xl border border-gray-100 bg-gray-50 p-4 h-full"
    >
      {/* Header with name and delete icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <img
            src={member.avatar}
            alt={member.name}
            className="h-12 w-12 flex-shrink-0 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p 
              className="text-sm font-semibold text-gray-900 cursor-default"
              title={member.name}
            >
              {member.name.length > 12 ? `${member.name.substring(0, 12)}...` : member.name}
            </p>
            {user?.role === "ADMIN" && (
              <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {member.siteAccessCount ?? 0} sites
              </span>
            )}
          </div>
        </div>
        {/* Delete icon in top right */}
        {user?.role === "ADMIN" && member.role !== "ADMIN" && (
          <button
            type="button"
            onClick={() => setDeletingUser(member)}
            className="rounded-full bg-red-50 p-2 hover:bg-red-100 transition-colors text-red-600"
            title="Delete user"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Email */}
      <p className="truncate text-xs text-gray-500 mb-3">
        {member.email}
      </p>

      {/* Role badge and Manage buttons row */}
      <div className="flex items-center justify-between mt-auto gap-2">
        <span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
          {member.role}
        </span>
        {user?.role === "ADMIN" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditPermissions(member)}
              className="rounded-md bg-white px-2 py-1 text-xs font-medium border border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-1"
              title="Edit permissions"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openEditSites(member)}
              className="rounded-md bg-white px-3 py-1 text-xs font-medium border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              Manage sites
            </button>
          </div>
        )}
      </div>
    </div>
  ))}
</div>
            )}
          </div>
        </div>
        {/* Edit Sites Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white p-6">
              <h3 className="text-lg font-semibold">
                Manage sites for {editingUser.name}
              </h3>
              <div className="mt-4 max-h-64 overflow-y-auto">
                {sites.length === 0 ? (
                  <p className="text-sm text-gray-500">No sites available.</p>
                ) : (
                  <div className="space-y-2">
                    {sites.map((s) => (
                      <label key={s.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={editingSites.includes(s.id)}
                          onChange={() => toggleEditingSite(s.id)}
                          className="h-4 w-4 rounded border-gray-300 text-black"
                        />
                        <div className="text-sm">{s.name}</div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setEditingSites([]);
                  }}
                  className="rounded-xl px-4 py-2 border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditingSites}
                  className="rounded-xl bg-black px-4 py-2 text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Permissions Modal */}
        {editingPermissions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Edit Module Permissions</h2>
                  <button
                    onClick={() => {
                      setEditingPermissions(null);
                      setEditingModules([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Select the modules this user can access:
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {allModules.map((module) => (
                      <label
                        key={module.value}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition"
                      >
                        <input
                          type="checkbox"
                          checked={editingModules.includes(module.value)}
                          onChange={() => toggleEditingModule(module.value)}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {module.label}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingPermissions(null);
                      setEditingModules([]);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Save Permissions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete User Confirmation Modal */}
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-red-100 p-3">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete User
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Are you sure you want to delete <strong>{deletingUser.name}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  disabled={isDeleting}
                  className="rounded-xl px-4 py-2 border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete User"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Invite template modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Invitation email preview</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-sm text-gray-700">
                <p>Hello {formData.name || "[Name]"},</p>

                <p>
                  You have been invited to join <strong>Your Company</strong> on
                  InteriorHub. Use the temporary password below to log in and set
                  your own password.
                </p>

                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Temporary password</p>
                  <p className="mt-1 font-mono text-sm">{"[temporary-password]"}</p>
                </div>

                <p>
                  Login link: <a className="text-blue-600">https://app.example.com/login</a>
                </p>

                <p className="text-xs text-gray-500">
                  Note: The system generates a secure password automatically. The
                  invitee should change it after first login.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="rounded-xl px-4 py-2 border"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invite;
