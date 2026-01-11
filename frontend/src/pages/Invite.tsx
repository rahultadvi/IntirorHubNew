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

  // Admin: edit existing user's site access
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [editingSites, setEditingSites] = useState<string[]>([]);
  const [deletingUser, setDeletingUser] = useState<CompanyUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        },
        token
      );

      setSuccess(
        "Invitation sent. The teammate receives a temporary password via email."
      );
      setFormData({ email: "", name: "", phone: "", role: roles[0].value });
      setSelectedSites([]);
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

        {user?.role === "ADMIN" && (
          <>
            <div className="absolute bottom-0 right-0 mb-6 flex items-center justify-between">
              <button
                onClick={() => setShowAddForm((s) => !s)}
                title="Invite Teammate"
                className={`fixed bottom-24 right-5 z-50 p-4 bg-gray-800 text-white rounded-full shadow-xl transition active:scale-95`}
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm"
              >
            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Teammate name
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Hasnen Agent"
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                Phone (optional)
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="1234567890"
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Work email
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="hasnen+agent@gmail.com"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Role access
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {`${role.label} – ${role.description}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Site Access (Select one or more)
              <div className="rounded-xl border border-gray-200 bg-white p-4 max-h-48 overflow-y-auto">
                {sites.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No sites available. Create a site first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sites.map((site) => (
                      <label
                        key={site.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSites.includes(site.id)}
                          onChange={() => toggleSite(site.id)}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">
                              {site.name}
                            </div>
                          </div>
                          {site.description && (
                            <div className="text-xs text-gray-500">
                              {site.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <Shield className="mt-0.5 h-4 w-4 text-black" />
              <p>
                The invitee receives a secure, auto-generated password. Ask them
                to log in and change it after the first access for maximum
                safety.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Preview invite template
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-black py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/40 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending invite
                  </>
                ) : (
                  "Send invite"
                )}
              </button>
            </div>
              </form>
            )}
          </>
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
            <p className="truncate text-sm font-semibold text-gray-900">
              {member.name}
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

      {/* Role badge and Manage button row */}
      <div className="flex items-center justify-between mt-auto">
        <span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
          {member.role}
        </span>
        {user?.role === "ADMIN" && (
          <button
            type="button"
            onClick={() => openEditSites(member)}
            className="rounded-md bg-white px-3 py-1 text-xs font-medium border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            Manage sites
          </button>
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
