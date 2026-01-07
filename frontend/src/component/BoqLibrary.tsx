import React, { useMemo, useState } from "react";

const CATEGORIES = ["All", "Furniture", "Finishes", "Hardware", "Electrical"];

const BoqLibrary: React.FC = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  // Placeholder items: replace with real API data
  const items = useMemo(
    () => [
      /* Example shape: { id: '1', name: 'Oak Door', category: 'Furniture', brand: 'Acme' } */
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it: any) => {
      if (category !== "All" && it.category !== category) return false;
      if (!q) return true;
      return (
        String(it.name).toLowerCase().includes(q) ||
        String(it.brand || "").toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  return (
    <div className="w-full bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-1 sm:mb-2">
          BOQ Library
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Pre-built items for faster estimation
        </p>
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="text"
        placeholder="Search items, brands..."
        className="w-full border border-slate-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 mb-3 sm:mb-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-300"
      />

      {/* Categories - Horizontal scroll on mobile */}
      <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 sm:pb-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 hover:scale-105 ${
              category === cat
                ? "bg-slate-800 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 sm:py-16 md:py-20 text-slate-400">
          <p className="text-sm sm:text-base">Library items will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          {filtered.map((it: any) => (
            <div
              key={it.id}
              className="p-3 sm:p-4 border border-slate-200 rounded-lg hover:border-slate-400 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="font-semibold text-sm sm:text-base text-slate-800 truncate">
                {it.name}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-1">
                {it.brand} • {it.category}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BoqLibrary;
