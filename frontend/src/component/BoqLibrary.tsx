import React from "react";

const BoqLibrary: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        BOQ Library
      </h2>

      <p className="text-sm text-slate-500 mb-6">
        Pre-built items for faster estimation
      </p>

      {/* Search */}
      <input
        type="text"
        placeholder="Search items, brands..."
        className="w-full border border-slate-200 rounded-xl px-4 py-2 mb-4"
      />

      {/* Categories */}
      <div className="flex gap-2 mb-6">
        {["All", "Furniture", "Finishes", "Hardware", "Electrical"].map(
          (cat) => (
            <button
              key={cat}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              {cat}
            </button>
          )
        )}
      </div>

      {/* Empty State */}
      <div className="text-center py-16 text-slate-400">
        Library items will appear here
      </div>
    </div>
  );
};

export default BoqLibrary;
