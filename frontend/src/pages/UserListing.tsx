import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRelatedUsers } from "../component/useRelatedUsers";
import { Mail, User, Trash2, Settings } from "lucide-react";
import { userApi } from "../services/api";

const UserListing: React.FC = () => {
  const { token, user: currentUser, refresh } = useAuth();
  const { users, loading, error, refetch } = useRelatedUsers(token ?? undefined);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const isAdmin = currentUser?.role === "ADMIN";

  const allModules = [
    { value: 'home', label: 'Home' },
    { value: 'payments', label: 'Payments' },
    { value: 'boq', label: 'BOQ' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'feed', label: 'Feed' },
    // { value: 'invite', label: 'Invite' },
    { value: 'manage-sites', label: 'Manage Sites' },
    // { value: 'users', label: 'Users' },
  ];

  const openEditPermissions = (user: any) => {
  setEditingPermissions(user._id);   // ✅ sahi
  setSelectedModules(user.allowedModules || allModules.map(m => m.value));
};


  const toggleModule = (module: string) => {
    setSelectedModules((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module]
    );
  };

const handleSavePermissions = async (userId: string) => {
  if (!token) return;

  try {
    await userApi.updateUserPermissions(
      userId,
      { allowedModules: selectedModules },
      token
    );

    // list refresh
    await refetch();

    // agar current logged-in user ki permissions update hui ho
    if (currentUser?._id === userId) {
      await refresh();
    }

    setEditingPermissions(null);
    setSelectedModules([]);
    alert("Permissions updated successfully");
  } catch (err: any) {
    alert(err?.message || "Failed to update permissions");
  }
};




  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!token) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`);
    if (!confirmDelete) return;

    setDeletingUserId(userId);
    try {
      await userApi.deleteUser(userId, token);
      alert(`User ${userName} has been deleted successfully.`);
      refetch(); // Refresh the user list
    } catch (err: any) {
      alert(err?.message || "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-500">Loading team members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Team Members
          </h1>
          <p className="text-gray-600">
            All users in your company
          </p>
        </div>

        {/* User Cards Grid */}
        {users.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No team members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 relative"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-20 w-20 rounded-full mb-4"
                  />
                  
                  {/* Name */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {user.name}
                  </h3>
                  
                  {/* Email */}
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate max-w-full">{user.email}</span>
                  </div>
                  
                  {/* Role Badge */}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-900 text-white">
                    {user.role}
                  </span>
                  
                  {/* Joined Date */}
                  <p className="text-xs text-gray-400 mt-3">
                    Joined {new Date(user.joinedAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>

                  {/* Edit Permissions & Delete Button (Admin only) */}
                  {isAdmin && user.id !== currentUser?._id && (
                    <div className="mt-4 flex flex-col gap-2 w-full">
                      <button
                        onClick={() => openEditPermissions(user)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Edit Permissions
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={deletingUserId === user.id}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingUserId === user.id ? "Deleting..." : "Delete User"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                    setSelectedModules([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                        checked={selectedModules.includes(module.value)}
                        onChange={() => toggleModule(module.value)}
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
                    setSelectedModules([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSavePermissions(editingPermissions)}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListing;
