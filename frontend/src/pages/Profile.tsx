import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Mail,
  Phone,
  Shield,
  Calendar,
  Edit2,
  Save,
  X,
  Building2,
} from "lucide-react";

const Profile = () => {
  const { user, updateProfile, uploadCompanyLogo } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  if (!user) {
    return <p className="text-center py-10">Loading profile...</p>;
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({ name, phone });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      {/* ================= Header Card ================= */}
      <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">

          {/* Logo */}
          <div className="relative w-24 h-24">
            <img
              src={
                user.companyLogo
                  ? `${import.meta.env.VITE_BACKEND_URL}${user.companyLogo}`
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      user.email
                    )}`
              }
              alt="Company Logo"
              className="w-24 h-24 rounded-full border-2 object-cover"
            />
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left">
            {!isEditing ? (
              <>
                <h2 className="text-xl sm:text-2xl font-bold">
                  {user.name || "No Name"}
                </h2>
                <p className="text-sm text-gray-500 break-all">{user.email}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">
                  {user.companyName || "No Company"}
                </p>
              </>
            ) : (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter your name"
              />
            )}

            <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-black text-white">
              {user.role}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="w-full sm:w-auto">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg"
              >
                <Edit2 size={16} /> Edit
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex justify-center items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(user.name || "");
                    setPhone(user.phone || "");
                  }}
                  className="flex justify-center items-center gap-2 px-4 py-2 text-sm bg-gray-400 text-white rounded-lg"
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= Details Card ================= */}
      <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">

          {/* Email */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Mail size={16} />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="font-semibold break-all">{user.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Phone size={16} />
            <div className="w-full">
              <p className="text-xs text-gray-400">Phone</p>
              {!isEditing ? (
                <p className="font-semibold">{user.phone || "Not Added"}</p>
              ) : (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border rounded-lg px-2 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter phone number"
                />
              )}
            </div>
          </div>

          {/* Company */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Building2 size={16} />
            <div>
              <p className="text-xs text-gray-400">Company</p>
              <p className="font-semibold">{user.companyName || "Not Available"}</p>
            </div>
          </div>

          {/* Account Created */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Calendar size={16} />
            <div>
              <p className="text-xs text-gray-400">Account Created</p>
              <p className="font-semibold">
                {user.createdAt
                  ? new Date(user.createdAt).toDateString()
                  : "Not Available"}
              </p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Shield size={16} />
            <div>
              <p className="text-xs text-gray-400">Role</p>
              <p className="font-semibold">{user.role}</p>
            </div>
          </div>

          {/* Upload Company Logo (Right Side Last Box) */}
          {user.role === "ADMIN" && (
            <div className="flex items-center justify-center p-3 bg-gray-50 rounded-xl border-2 border-dashed border-blue-400">
              <label className="flex items-center gap-2 text-sm text-blue-600 font-semibold cursor-pointer hover:text-blue-800">
                + Upload Company Logo
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;
