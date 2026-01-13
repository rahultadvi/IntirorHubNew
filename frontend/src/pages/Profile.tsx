import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Mail, Phone, Shield, Calendar, Edit2, Save, X } from "lucide-react";

const Profile = () => {
  const { user, updateProfile } = useAuth(); 
  // updateProfile tu AuthContext me banayega (API call ke liye)

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);

  if (!user) return <p>Loading...</p>;

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile({ name, phone });  // backend API hit karega
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex items-center gap-5">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
            alt="avatar"
            className="h-24 w-24 rounded-full border-2"
          />

          <div className="flex-1">
            {!isEditing ? (
              <>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </>
            ) : (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full mb-2"
                  placeholder="Enter your name"
                />
              </>
            )}

            <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-black text-white">
              {user.role}
            </span>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
            >
              <Edit2 size={16} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg"
              >
                <Save size={16} /> {loading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setName(user.name || "");
                  setPhone(user.phone || "");
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-400 text-white rounded-lg"
              >
                <X size={16} /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {/* Email (Readonly) */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Mail size={16} />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="font-semibold">{user.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Phone size={16} />
            <div className="w-full">
              <p className="text-xs text-gray-400">Phone</p>
              {!isEditing ? (
                <p className="font-semibold">
                  {user.phone || "Not Added"}
                </p>
              ) : (
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border rounded-lg px-2 py-1 w-full"
                  placeholder="Enter phone number"
                />
              )}
            </div>
          </div>

          {/* Created At */}
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
        </div>
      </div>
    </div>
  );
};

export default Profile;
