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
  Calendar,
  PiggyBank,
  ShieldAlert,
  Lock,
  Unlock,
  DollarSign,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSite } from "../context/SiteContext";
import { expenseApi, siteApi } from "../services/api";
import AddExpenseModal from "../component/AddExpenseModal";

interface ExpenseItem {
  _id: string;
  title: string;
  category: string;
  location?: string;
  amount: number;
  dueDate: string;
  createdAt?: string;
  status: string;
  paymentStatus: string;
  paymentType?: 'Cash' | 'Bank Transfer' | 'UPI' | 'NEFT' | 'Cheque' | 'Credit Card' | null;
  vendorName?: string;
  invoice?: { path?: string | null; filename?: string | null } | null;
  createdBy?: { name?: string; role?: string; _id?: string };
}

const Expenses: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showAllocateBudgetModal, setShowAllocateBudgetModal] = useState(false);
  
  // Budget allocation states
  const [categoryBudgets, setCategoryBudgets] = useState({
    Material: 0,
    Labour: 0,
    Electrical: 0,
    Equipment: 0,
    Transport: 0,
    Miscellaneous: 0,
  });
  const [emergencyReserve, setEmergencyReserve] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [emergencyReserveLocked, setEmergencyReserveLocked] = useState(true);
  const [profitMarginLocked, setProfitMarginLocked] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetAllocation, setBudgetAllocation] = useState<{
    categories: { [key: string]: number };
    emergencyReserve: number;
    profitMargin: number;
  } | null>(null);

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
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
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
  }, [token, activeSite, selectedCategory, startDate, endDate]);

  // Calculate default budget allocation: 10% profit, 20% emergency, 70% divided equally among 6 categories
  const calculateDefaultAllocation = (budget: number) => {
    const profitPercent = 0.10; // 10%
    const emergencyPercent = 0.20; // 20%
    const categoriesPercent = 0.70; // 70%
    const numCategories = 6;
    
    const profit = Math.round(budget * profitPercent);
    const emergency = Math.round(budget * emergencyPercent);
    const categoriesTotal = Math.round(budget * categoriesPercent);
    const perCategory = Math.round(categoriesTotal / numCategories);
    
    return {
      categories: {
        Material: perCategory,
        Labour: perCategory,
        Electrical: perCategory,
        Equipment: perCategory,
        Transport: perCategory,
        Miscellaneous: perCategory,
      },
      emergencyReserve: emergency,
      profitMargin: profit,
      emergencyReserveLocked: true,
      profitMarginLocked: true,
    };
  };

  // Load budget allocation from backend
  const loadBudgetAllocation = async () => {
    if (!token || !activeSite?.id) return;
    
    try {
      setLoadingBudget(true);
      const response = await siteApi.getBudgetAllocation(activeSite.id, token);
      const { budgetAllocation } = response;
      
      // Check if allocation exists and has values
      const hasAllocation = budgetAllocation && (
        Object.values(budgetAllocation.categories).some(v => v > 0) ||
        budgetAllocation.emergencyReserve > 0 ||
        budgetAllocation.profitMargin > 0
      );
      
      if (hasAllocation) {
        setCategoryBudgets(budgetAllocation.categories);
        setEmergencyReserve(budgetAllocation.emergencyReserve);
        setProfitMargin(budgetAllocation.profitMargin);
        setEmergencyReserveLocked(budgetAllocation.emergencyReserveLocked !== false);
        setProfitMarginLocked(budgetAllocation.profitMarginLocked !== false);
        // Store budget allocation for validation
        setBudgetAllocation({
          categories: budgetAllocation.categories,
          emergencyReserve: budgetAllocation.emergencyReserve,
          profitMargin: budgetAllocation.profitMargin,
        });
      } else {
        // Use default allocation if no saved allocation exists
        const defaultAllocation = calculateDefaultAllocation(totalBudget);
        setCategoryBudgets(defaultAllocation.categories);
        setEmergencyReserve(defaultAllocation.emergencyReserve);
        setProfitMargin(defaultAllocation.profitMargin);
        setEmergencyReserveLocked(defaultAllocation.emergencyReserveLocked);
        setProfitMarginLocked(defaultAllocation.profitMarginLocked);
        // Store default allocation for validation
        setBudgetAllocation({
          categories: defaultAllocation.categories,
          emergencyReserve: defaultAllocation.emergencyReserve,
          profitMargin: defaultAllocation.profitMargin,
        });
      }
    } catch (error) {
      console.error('Failed to load budget allocation', error);
      // Use default allocation on error (only for admin users)
      const defaultAllocation = calculateDefaultAllocation(totalBudget);
      setCategoryBudgets(defaultAllocation.categories);
      setEmergencyReserve(defaultAllocation.emergencyReserve);
      setProfitMargin(defaultAllocation.profitMargin);
      setEmergencyReserveLocked(defaultAllocation.emergencyReserveLocked);
      setProfitMarginLocked(defaultAllocation.profitMarginLocked);
      // Store default allocation for validation
      setBudgetAllocation({
        categories: defaultAllocation.categories,
        emergencyReserve: defaultAllocation.emergencyReserve,
        profitMargin: defaultAllocation.profitMargin,
      });
    } finally {
      setLoadingBudget(false);
    }
  };

  // Save budget allocation to backend
  const saveBudgetAllocationToBackend = async () => {
    if (!token || !activeSite?.id) return;
    
    try {
      setSavingBudget(true);
      await siteApi.saveBudgetAllocation(
        activeSite.id,
        {
          categories: categoryBudgets,
          emergencyReserve,
          profitMargin,
          emergencyReserveLocked,
          profitMarginLocked,
        },
        token
      );
      setShowAllocateBudgetModal(false);
    } catch (error) {
      console.error('Failed to save budget allocation', error);
      alert('Failed to save budget allocation. Please try again.');
    } finally {
      setSavingBudget(false);
    }
  };

  // Load budget when modal opens or when site changes
  useEffect(() => {
    if (showAllocateBudgetModal && activeSite?.id) {
      loadBudgetAllocation();
    }
  }, [showAllocateBudgetModal, activeSite?.id, totalBudget]);

  // Load budget allocation on page load for validation
  useEffect(() => {
    if (activeSite?.id && token) {
      loadBudgetAllocation();
    }
  }, [activeSite?.id, token]);

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
    <div className="min-h-screen w-full overflow-x-hidden pb-6">
      {/* Header */}
      <div className="flex items-center justify-center mb-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800"> Expenses </h2>
          <p className="text-slate-500 text-sm">Track your expenses and manage your budget</p>
        </div>
      </div>
      <div className="border-b border-gray-200 mt-6 ">
        <div className="max-w-md mx-auto px-4 py-4">


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

          {/* Allocate Budget Button - Admin Only */}
          {isAdmin && (
            <button
              onClick={() => setShowAllocateBudgetModal(true)}
              className="w-full bg-black hover:bg-gray-900 text-white py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 mb-4 transition-colors shadow-sm"
            >
              <PiggyBank className="w-5 h-5" />
              Allocate Budget
            </button>
          )}

          {/* Search Bar with Filter Button */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search expenses or vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
              />
              {/* Filter Popup Button */}
              <button
                onClick={() => setShowFilterPopup(true)}
                className="relative p-2 rounded-lg hover:bg-slate-50 transition-colors"
                title="Filter expenses"
              >
                <Filter className={`w-5 h-5 ${(selectedCategory !== 'all' || startDate || endDate) ? 'text-indigo-600' : 'text-slate-400'}`} />
                {(selectedCategory !== 'all' || startDate || endDate) && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
                )}
              </button>
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

      {/* Filter Popup Modal */}
      {showFilterPopup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFilterPopup(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Filter Expenses</h3>
              <button
                onClick={() => setShowFilterPopup(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-slate-800 font-medium"
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

              {/* Date Filters */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date Range
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterPopup(false)}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pt-4">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(expense.category)}`}>
                          {expense.category.toUpperCase()}
                        </span>
                        {expense.vendorName && (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            Vendor: {expense.vendorName}
                          </span>
                        )}
                        {expense.paymentType && (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                            {expense.paymentType}
                          </span>
                        )}
                      </div>
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
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {expense.vendorName && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-600">Vendor:</span>
                          <span>{expense.vendorName}</span>
                        </div>
                      )}
                      {expense.paymentType && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-600">Payment:</span>
                          <span>{expense.paymentType}</span>
                        </div>
                      )}
                      {expense.createdBy?.name && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-600">Created by:</span>
                          <span>{expense.createdBy.name}</span>
                        </div>
                      )}
                      {expense.createdAt && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-semibold text-slate-600">Created:</span>
                          <span>{new Date(expense.createdAt).toLocaleDateString('en-IN', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}</span>
                        </div>
                      )}
                      {expense.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-semibold text-slate-600">Due:</span>
                          <span className={new Date(expense.dueDate) < new Date() && expense.paymentStatus === 'due' ? 'text-red-600 font-semibold' : ''}>
                            {new Date(expense.dueDate).toLocaleDateString('en-IN', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
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
        budgetAllocation={budgetAllocation}
        existingExpenses={items}
      />

      {/* Allocate Budget Modal */}
      {showAllocateBudgetModal && (
        <div 
          className="fixed inset-0 z-[250] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAllocateBudgetModal(false);
            }
          }}
        >
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Project Budget Allocation</h3>
                <p className="text-xs font-medium text-gray-500 mt-1">Distribute project budget across categories, reserve, and profit</p>
              </div>
              <button 
                onClick={() => setShowAllocateBudgetModal(false)}
                className="bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Total Project Budget Card */}
            {(() => {
              const totalAllocated = Object.values(categoryBudgets).reduce((sum, val) => sum + (val || 0), 0) + 
                                   (emergencyReserve || 0) + (profitMargin || 0);
              const remaining = Math.max(0, totalBudget - totalAllocated);
              const progressPercent = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
              
              return (
                <div className="rounded-2xl p-5 mb-6 border transition-colors bg-blue-50/50 border-blue-100">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 mb-1">Total Project Budget</p>
                      <p className="text-2xl font-bold text-slate-800">₹{totalBudget.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Allocated</p>
                      <p className="text-lg font-bold text-blue-600">₹{totalAllocated.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner border border-white p-0.5">
                      <div 
                        className="h-full rounded-full transition-all duration-500 bg-green-500" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <p className="text-xs font-medium text-gray-600">Progress</p>
                      <p className="text-xs font-semibold text-blue-600">₹{remaining.toLocaleString('en-IN')} Remaining</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Category-wise Budget */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-700 ml-1">Category-wise Budget</h4>
              <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                {Object.keys(categoryBudgets).map((category) => (
                  <div key={category} className="space-y-1.5 pb-4 border-b border-gray-100 last:border-none last:pb-0">
                    <label className="text-xs font-semibold text-slate-700 ml-1">{category}</label>
                    <div className="relative">
                      <input
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none pr-12 text-right focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        type="number"
                        value={categoryBudgets[category as keyof typeof categoryBudgets]}
                        onChange={(e) => setCategoryBudgets({
                          ...categoryBudgets,
                          [category]: parseFloat(e.target.value) || 0
                        })}
                        disabled={loadingBudget}
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Reserves */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-700 ml-1">Special Reserves</h4>
              
              {/* Emergency Reserve */}
              <div className="rounded-2xl p-5 border transition-all bg-orange-50/50 border-orange-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-100 text-orange-500">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800">Emergency Reserve</h5>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                        {emergencyReserveLocked ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmergencyReserveLocked(!emergencyReserveLocked)}
                    disabled={loadingBudget}
                    className={`w-12 h-6 rounded-full relative transition-all ${
                      emergencyReserveLocked ? 'bg-orange-400' : 'bg-green-400'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all flex items-center justify-center ${
                      emergencyReserveLocked ? 'left-1' : 'left-7'
                    }`}>
                      {emergencyReserveLocked ? (
                        <Lock className="w-2.5 h-2.5 text-orange-400" />
                      ) : (
                        <Unlock className="w-2.5 h-2.5 text-green-400" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="relative">
                  <input
                    disabled={emergencyReserveLocked || loadingBudget}
                    className={`w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none pr-12 text-right transition-all ${
                      emergencyReserveLocked || loadingBudget
                        ? 'bg-gray-100/50 border-transparent text-gray-400 cursor-not-allowed' 
                        : 'bg-white border-gray-200 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                    }`}
                    type="number"
                    value={emergencyReserve}
                    onChange={(e) => setEmergencyReserve(parseFloat(e.target.value) || 0)}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</div>
                </div>
                <p className="text-xs font-medium text-gray-500 mt-3 ml-1">Usable only when unlocked by admin. For critical budget overruns.</p>
              </div>

              {/* Profit Margin */}
              <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800">Profit Margin</h5>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                        {profitMarginLocked ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setProfitMarginLocked(!profitMarginLocked)}
                    disabled={loadingBudget}
                    className={`w-12 h-6 rounded-full relative transition-all ${
                      profitMarginLocked ? 'bg-purple-400' : 'bg-green-400'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all flex items-center justify-center ${
                      profitMarginLocked ? 'left-1' : 'left-7'
                    }`}>
                      {profitMarginLocked ? (
                        <Lock className="w-2.5 h-2.5 text-purple-400" />
                      ) : (
                        <Unlock className="w-2.5 h-2.5 text-green-400" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="relative">
                  <input
                    disabled={profitMarginLocked || loadingBudget}
                    className={`w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none pr-12 text-right transition-all ${
                      profitMarginLocked || loadingBudget
                        ? 'bg-gray-100/50 border-transparent text-gray-400 cursor-not-allowed' 
                        : 'bg-white border-gray-200 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                    }`}
                    type="number"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</div>
                </div>
                <p className="text-xs font-medium text-gray-500 mt-3 ml-1">Reserved project profit. Adjustable when unlocked.</p>
              </div>
            </div>

            {/* Final Breakdown */}
            {(() => {
              const categoryTotal = Object.values(categoryBudgets).reduce((sum, val) => sum + (val || 0), 0);
              const totalAllocated = categoryTotal + (emergencyReserve || 0) + (profitMargin || 0);
              const unallocated = Math.max(0, totalBudget - totalAllocated);
              
              return (
                <div className="bg-gray-50 rounded-2xl p-6 mb-6 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 text-center">Final Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-800">Total Budget</span>
                      <span className="text-sm font-bold text-slate-800">₹{totalBudget.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-600">Category Allocations</span>
                      <span className="text-sm font-semibold text-gray-700">₹{categoryTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-600">Emergency Fund</span>
                      <span className="text-sm font-semibold text-gray-700">₹{emergencyReserve.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-600">Profit Margin</span>
                      <span className="text-sm font-semibold text-gray-700">₹{profitMargin.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-px bg-gray-200 my-4"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-800">Unallocated Balance</span>
                      <span className={`text-lg font-bold ${unallocated === 0 ? 'text-green-600' : 'text-gray-600'}`}>₹{unallocated.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex gap-4 sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100 -mx-8 px-8">
              <button
                onClick={() => setShowAllocateBudgetModal(false)}
                disabled={savingBudget}
                className="flex-1 bg-gray-50 py-4 rounded-xl text-gray-600 font-semibold text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveBudgetAllocationToBackend}
                disabled={savingBudget || loadingBudget}
                className="flex-1 py-4 rounded-xl text-white font-semibold text-sm shadow-lg transition-all active:scale-95 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingBudget ? 'Saving...' : 'Save Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;