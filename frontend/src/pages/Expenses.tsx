import React, { useEffect, useState, useRef } from "react";
import { useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  UploadCloud,
  X,
  Filter,
  MoreVertical,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSite } from "../context/SiteContext";
import { expenseApi } from "../services/api";
import AddExpenseModal from "../component/AddExpenseModal";

interface ExpenseItem {
  _id: string;
  title: string;
  category: string;
  location?: string;
  amount: number;
  dueDate: string;
  status: string;
  paymentStatus: string;
  invoice?: { path?: string | null; filename?: string | null } | null;
  createdBy?: { name?: string; role?: string; _id?: string };
}

const Expenses: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { token, user } = useAuth();
  const { activeSite } = useSite();

  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // FIXED: dynamic budget values
  const totalBudget = activeSite?.contractValue ?? 0;
  // Used Amount = Approved expenses that are paid
  const usedAmount = items
    .filter((e) => e.status === 'approved' && e.paymentStatus === 'paid')
    .reduce((s, it) => s + (it.amount || 0), 0);
  // Remaining Amount = Total budget - Used amount
  const remainingAmount = Math.max(0, totalBudget - usedAmount);
  // Due Amount = All due expenses (regardless of approval status)
  const dueAmount = items
    .filter((e) => e.paymentStatus === 'due')
    .reduce((s, it) => s + (it.amount || 0), 0);

  const buildParams = () => {
    const params: Record<string, string> = {};
    if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
    return params;
  };

  const isAdmin = (user?.role ?? '').toString().toUpperCase() === 'ADMIN';
  const [updatingExpenseId, setUpdatingExpenseId] = useState<string | null>(null);

  const handleDeleteExpense = async (expenseId: string) => {
    if (!token || !isAdmin) return;

    const ok = window.confirm("Are you sure you want to delete this expense?");
    if (!ok) return;

    try {
      setUpdatingExpenseId(expenseId);
      await expenseApi.deleteExpense(expenseId, token);
      await fetchExpenses();
      setOpenMenuId(null);
    } catch (err) {
      console.error("Failed to delete expense", err);
    } finally {
      setUpdatingExpenseId(null);
    }
  };


  const handleUpdateExpenseStatus = async (expenseId: string, status: 'pending' | 'approved' | 'rejected') => {
    if (!token) return;
    try {
      setUpdatingExpenseId(expenseId);
      await expenseApi.updateExpenseStatus(expenseId, status, token);
      await fetchExpenses();
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to update expense status', err);
    } finally {
      setUpdatingExpenseId(null);
    }
  };

  const handleUpdatePaymentStatus = async (expenseId: string, paymentStatus: 'paid' | 'due') => {
    if (!token) return;
    try {
      setUpdatingExpenseId(expenseId);
      // call new API method to update expense payment status
      await expenseApi.updatePaymentStatus(expenseId, paymentStatus, token);
      await fetchExpenses();
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to update payment status', err);
    } finally {
      setUpdatingExpenseId(null);
    }
  };



  const fetchExpenses = async () => {
    if (!token || !activeSite) return;
    try {
      const params = buildParams();
      const res = await expenseApi.getExpensesBySite(activeSite.id, token, params);
      setItems(res.expenses || []);
    } catch (err) {
      console.error('Unable to load expenses', err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [token, activeSite, selectedCategory]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('action') === 'add') {
        setIsModalOpen(true);
      }
    } catch (e) { }
  }, [location.search]);

  useEffect(() => {
    const handler = () => setIsModalOpen(true);
    window.addEventListener('open-add-expense', handler as EventListener);
    return () => window.removeEventListener('open-add-expense', handler as EventListener);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const filteredExpenses = items.filter((expense) => {
    const matchesSearch = expense.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    // Also filter by category on frontend as fallback (backend should handle this, but this ensures it works)
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 mt-16 ">
        <div className="w-full px-4 py-4">


          {/* Budget Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Total Budget */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-[10px] font-semibold tracking-wider text-blue-500 mb-1">Total Budget</p>
              <p className="text-xl font-bold text-slate-800">
                ₹{(totalBudget / 100000).toFixed(2)}L
              </p>
            </div>

            {/* Used Amount */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 mb-1">Used Amount</p>
              <p className="text-xl font-bold text-slate-800">
                ₹{(usedAmount / 100000).toFixed(2)}L
              </p>
            </div>

            {/* Remaining Amount */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-[10px] font-semibold tracking-wider text-emerald-500 mb-1">Remaining Amount</p>
              <p className="text-xl font-bold text-emerald-500">
                ₹{(remainingAmount / 100000).toFixed(2)}L
              </p>
            </div>

            {/* Due Amount */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-[10px] font-semibold tracking-wider text-rose-400 mb-1">Due Amount</p>
              <p className="text-xl font-bold text-rose-500">
                ₹{(dueAmount / 100000).toFixed(2)}L
              </p>
            </div>
          </div>

          {/* Period Tabs
          <div className="flex gap-2 mb-6">
            {['Day', 'Week', 'Month', 'Year'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${selectedPeriod === period
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                  }`}
              >
                {period}
              </button>
            ))}
          </div> */}

          {/* Search Bar with Category Filter */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses or vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
            />
            {/* Category Filter */}
            <div className="relative flex items-center cursor-pointer">
              <div className="relative">
                <Filter className={`w-5 h-5 ${selectedCategory !== 'all' ? 'text-indigo-600' : 'text-slate-400'}`} />
                {selectedCategory !== 'all' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
                )}
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title={selectedCategory === 'all' ? 'All Categories' : selectedCategory}
              >
                <option value="all">All Categories</option>
                <option value="Material">Material</option>
                <option value="Labour">Labour</option>
                <option value="Electrical">Electrical</option>
                <option value="Equipment">Equipment</option>
                <option value="Transport">Transport</option>
                <option value="Misc">Miscellaneous</option>
              </select>
            </div>
          </div>

          {/* Add Expense Button
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Add Expense
          </button> */}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 pt-4">
        {/* Results Count */}
        <p className="text-center text-sm font-semibold text-slate-400 mb-4 tracking-wider">
          {filteredExpenses.length} EXPENSE{filteredExpenses.length !== 1 ? 'S' : ''} FOUND
        </p>

        {/* Expense List */}
        <div className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-left border border-gray-200">
              <p className="text-gray-500 text-sm mb-2">No expenses found</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-gray-800 text-sm font-medium hover:underline"
              >
                Add your first expense
              </button>
            </div>
          ) : (
            filteredExpenses.map((expense) => {
              const getCategoryColor = (category: string) => {
                const cat = category.toLowerCase();
                if (cat.includes('misc')) return 'bg-purple-100 text-purple-600';
                if (cat.includes('transport')) return 'bg-amber-100 text-amber-600';
                if (cat.includes('material')) return 'bg-blue-100 text-blue-600';
                if (cat.includes('equipment')) return 'bg-emerald-100 text-emerald-600';
                if (cat.includes('electrical')) return 'bg-indigo-100 text-indigo-600';
                return 'bg-slate-100 text-slate-600';
              };

              return (
                <div key={expense._id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  {/* Header */}
                  <div className="flex items-start justify-start mb-3">
                    <div className="flex flex-col items-start text-left flex-1">
                      <h4 className="font-bold text-slate-800 text-lg mb-2 ml-[10px]">
                        {expense.title}
                      </h4>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(expense.category)}`}>
                        {expense.category.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-800">
                        ₹{expense.amount.toLocaleString('en-IN')}
                      </span>
                      {/* Three Dot Menu */}
                      <div className="relative" ref={openMenuId === expense._id ? menuRef : null}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === expense._id ? null : expense._id)}
                          className="text-slate-400 hover:text-slate-600"
                          disabled={updatingExpenseId === expense._id}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === expense._id && (
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                            {/* Status Section - Admin Only */}
                            {isAdmin && (
                              <div className="px-3 py-2 border-b border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Status</p>
                                <button
                                  onClick={() => handleUpdateExpenseStatus(expense._id, 'pending')}
                                  disabled={updatingExpenseId === expense._id}
                                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded flex items-center justify-between disabled:opacity-50"
                                >
                                  <span>Pending</span>
                                  {expense.status === 'pending' && <Check className="h-4 w-4 text-indigo-600" />}
                                </button>
                                <button
                                  onClick={() => handleUpdateExpenseStatus(expense._id, 'approved')}
                                  disabled={updatingExpenseId === expense._id}
                                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded flex items-center justify-between disabled:opacity-50"
                                >
                                  <span>Approved</span>
                                  {expense.status === 'approved' && <Check className="h-4 w-4 text-indigo-600" />}
                                </button>
                                <button
                                  onClick={() => handleUpdateExpenseStatus(expense._id, 'rejected')}
                                  disabled={updatingExpenseId === expense._id}
                                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded flex items-center justify-between disabled:opacity-50"
                                >
                                  <span>Rejected</span>
                                  {expense.status === 'rejected' && <Check className="h-4 w-4 text-indigo-600" />}
                                </button>
                              </div>
                            )}
                            {isAdmin && (
                              <div className="border-t border-gray-100 mt-1">
                                <button
                                  onClick={() => handleDeleteExpense(expense._id)}
                                  disabled={updatingExpenseId === expense._id}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                  Delete Expense
                                </button>
                              </div>
                            )}


                            {/* Payment Status Section - All Users */}
                            <div className={`px-3 py-2 ${isAdmin ? '' : 'border-b-0'}`}>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment</p>
                              <button
                                onClick={() => handleUpdatePaymentStatus(expense._id, 'paid')}
                                disabled={updatingExpenseId === expense._id}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded flex items-center justify-between disabled:opacity-50"
                              >
                                <span>Paid</span>
                                {expense.paymentStatus === 'paid' && <Check className="h-4 w-4 text-green-600" />}
                              </button>
                              <button
                                onClick={() => handleUpdatePaymentStatus(expense._id, 'due')}
                                disabled={updatingExpenseId === expense._id}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded flex items-center justify-between disabled:opacity-50"
                              >
                                <span>Due</span>
                                {expense.paymentStatus === 'due' && <Check className="h-4 w-4 text-orange-600" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges and Actions */}
                  <div className="flex items-center gap-2 mb-3">
                    {expense.paymentStatus === 'paid' && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-600">
                        Paid
                      </span>
                    )}
                    {expense.paymentStatus === 'due' && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-600">
                        Due
                      </span>
                    )}
                    {expense.status === 'approved' && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-500 border border-emerald-200">
                        Approved
                      </span>
                    )}
                    {expense.status === 'pending' && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-600">
                        Pending
                      </span>
                    )}
                    {expense.status === 'rejected' && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                        Rejected
                      </span>
                    )}

                    {expense.invoice?.path ? (
                      <a 
                        href={`${import.meta.env.VITE_BACKEND_URL}/${expense.invoice?.path}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 flex items-center gap-1 hover:bg-slate-200 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        View Invoice
                      </a>
                    ) : (
                      user && user.role !== 'CLIENT' && (
                        <label className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 flex items-center gap-1 hover:bg-slate-200 transition-colors cursor-pointer">
                          <UploadCloud className="w-3 h-3" />
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            onChange={async (ev) => {
                              const file = ev.target.files?.[0];
                              if (!file || !token) return;

                              try {
                                const formData = new FormData();
                                formData.append("invoice", file); // 👈 multer field name

                                await expenseApi.uploadInvoiceFormData(
                                  expense._id,
                                  formData,
                                  token
                                );

                                await fetchExpenses();
                              } catch (err) {
                                console.error("Upload failed", err);
                              }
                            }}
                          />

                        </label>
                      )
                    )}
                  </div>

                  {/* Footer */}
                  <p className="text-xs text-slate-400 font-medium tracking-wider">
                    {expense.createdBy?.name?.toUpperCase() || '—'}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Floating Add Expense Button */}
      {isAdmin && (
        <button
          onClick={() => setIsModalOpen(true)}
          title="Add Expense"
          className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg shadow-slate-300 flex items-center justify-center hover:bg-gray-900 transition-all hover:scale-105 z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}



      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => fetchExpenses()}
        token={token}
        siteId={activeSite?.id || ''}
      />
    </div>
  );
};

export default Expenses;