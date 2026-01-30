import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { expenseApi } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  token: string | null;
  siteId: string;
  budgetAllocation?: {
    categories: { [key: string]: number };
    emergencyReserve: number;
    profitMargin: number;
  } | null;
  existingExpenses?: Array<{
    _id: string;
    category: string;
    amount: number;
    status: string;
    paymentStatus: string;
  }>;
}

const categories = ['Material', 'Labour', 'Electrical', 'Equipment', 'Transport', 'Misc'];

const AddExpenseModal: React.FC<Props> = ({ isOpen, onClose, onCreated, token, siteId, budgetAllocation, existingExpenses = [] }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [paymentType, setPaymentType] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'NEFT' | 'Cheque' | 'Credit Card' | ''>('');
  const [vendorName, setVendorName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [warningData, setWarningData] = useState<{
    show: boolean;
    category: string;
    categoryBudget: number;
    totalSpentInCategory: number;
    remaining: number;
    expenseAmount: number;
  } | null>(null);

  if (!isOpen) return null;

  const submitExpense = async (closeAfterSave: boolean) => {
    if (!token) return alert('Not authenticated');
    if (!title || amount === '' || !dueDate) return alert('Please fill title, amount and due date');
    
    // Validate budget allocation if budget is allocated
    if (budgetAllocation && budgetAllocation.categories) {
      const categoryBudget = budgetAllocation.categories[category] || 0;
      if (categoryBudget > 0) {
        const totalSpentInCategory = existingExpenses
          .filter(e => e.category === category && e.status === 'approved')
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        const newTotal = totalSpentInCategory + Number(amount);
        if (newTotal > categoryBudget) {
          const remaining = categoryBudget - totalSpentInCategory;
          setWarningData({
            show: true,
            category,
            categoryBudget,
            totalSpentInCategory,
            remaining,
            expenseAmount: Number(amount)
          });
          return;
        }
      }
    }
    
    setLoading(true);
    try {
      let invoiceBase64: string | undefined;
      let invoiceFilename: string | undefined;
      if (file) {
        const data = await new Promise<string | null>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(null);
          r.readAsDataURL(file);
        });
        if (data) {
          invoiceBase64 = data.split(',')[1];
          invoiceFilename = file.name;
        }
      }

      const body: any = { 
        title, 
        description, 
        category, 
        amount: Number(amount), 
        dueDate, 
        siteId,
        paymentType: paymentType || null,
        vendorName: vendorName || ''
      };
      if (invoiceBase64 && invoiceFilename) {
        body.invoiceBase64 = invoiceBase64;
        body.invoiceFilename = invoiceFilename;
      }

      await expenseApi.addExpense(body, token);
      setTitle('');
      setDescription('');
      setCategory(categories[0]);
      setAmount('');
      setDueDate('');
      setPaymentType('');
      setVendorName('');
      setFile(null);
      onCreated();
      if (closeAfterSave) {
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitExpense(true);
  };

  return (
    <>
      {/* Warning Popup */}
      {warningData && warningData.show && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setWarningData(null);
            }
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div 
            className="relative bg-white rounded-xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-black mb-1">Budget Exceeded</h3>
                <p className="text-sm text-black/80 mb-4">
                  Cannot add expense! This would exceed the allocated budget for <strong>{warningData.category}</strong>.
                </p>
              </div>
              <button 
                onClick={() => setWarningData(null)} 
                className="p-1 rounded-md hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>

            <div className="space-y-3 mb-6 border-t border-black/10 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-black/70">Allocated Budget:</span>
                <span className="text-sm font-semibold text-black">₹{warningData.categoryBudget.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black/70">Already Spent:</span>
                <span className="text-sm font-semibold text-black">₹{warningData.totalSpentInCategory.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black/70">Remaining:</span>
                <span className="text-sm font-semibold text-black">₹{Math.max(0, warningData.remaining).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center border-t border-black/10 pt-3">
                <span className="text-sm text-black/70">This Expense:</span>
                <span className="text-sm font-semibold text-black">₹{warningData.expenseAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p className="text-xs text-black/60 mb-4">
              Please reduce the amount or contact admin to increase the budget allocation.
            </p>

            <button
              onClick={() => setWarningData(null)}
              className="w-full px-4 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-black/90 transition-colors text-sm"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Main Expense Modal */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div 
          className="relative bg-white rounded-xl w-full max-w-md p-3 sm:p-6 shadow-lg overflow-auto max-h-[calc(100vh-4rem)]" 
          style={{ WebkitOverflowScrolling: 'touch' }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h3 className="text-base font-semibold">Add Expense</h3>
              <span className="text-xs text-gray-500">Quick transaction style entry</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2">
            <label className="block text-xs text-gray-600">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" placeholder="e.g., Cement purchase" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-600">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" rows={2} placeholder="Optional details" />
          </div>

          {/* Vendor Name and Category in one row */}
          <div>
            <label className="block text-xs text-gray-600">Vendor Name</label>
            <input 
              value={vendorName} 
              onChange={(e) => setVendorName(e.target.value)} 
              className="w-full mt-1 p-2 border rounded text-sm" 
              placeholder="Vendor name"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Amount and Due Date in one row */}
          <div>
            <label className="block text-xs text-gray-600">Amount</label>
            <input 
              value={amount} 
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} 
              type="number" 
              className="w-full mt-1 p-2 border rounded text-sm text-right font-semibold" 
              placeholder="0.00" 
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" />
          </div>

          {/* Payment Type and Invoice in one row */}
          <div>
            <label className="block text-xs text-gray-600">Payment Type</label>
            <select 
              value={paymentType} 
              onChange={(e) => setPaymentType(e.target.value as 'Cash' | 'Bank Transfer' | 'UPI' | 'NEFT' | 'Cheque' | 'Credit Card' | '')} 
              className="w-full mt-1 p-2 border rounded text-sm"
            >
              <option value="">Select</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="NEFT">NEFT</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600">Invoice (optional)</label>
            <div className="mt-1">
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" id="expense-invoice" />
              <label htmlFor="expense-invoice" className="inline-block w-full px-3 py-2 rounded border text-xs cursor-pointer text-center bg-gray-50 hover:bg-gray-100 truncate">
                {file ? file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name : 'Choose file'}
              </label>
            </div>
          </div>

          <div className="col-span-2 flex flex-row items-center justify-end gap-2 mt-2 flex-wrap">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Cancel</button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); submitExpense(false); }}
              disabled={loading}
              className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Saving...' : 'Save & Add Another'}
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

export default AddExpenseModal;
