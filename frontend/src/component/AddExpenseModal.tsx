import React, { useState } from 'react';
import { X } from 'lucide-react';
import { expenseApi } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  token: string | null;
  siteId: string;
}

const categories = ['Material', 'Labour', 'Electrical', 'Equipment', 'Transport', 'Misc'];

const AddExpenseModal: React.FC<Props> = ({ isOpen, onClose, onCreated, token, siteId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return alert('Not authenticated');
    if (!title || amount === '' || !dueDate) return alert('Please fill title, amount and due date');
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

      const body: any = { title, description, category, amount: Number(amount), dueDate, siteId };
      if (invoiceBase64 && invoiceFilename) {
        body.invoiceBase64 = invoiceBase64;
        body.invoiceFilename = invoiceFilename;
      }

      await expenseApi.addExpense(body, token);
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        className="relative bg-white rounded-xl w-full max-w-md p-4 sm:p-6 shadow-lg overflow-auto max-h-[calc(100vh-8rem)]" 
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

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-600">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 p-2 border rounded" placeholder="e.g., Cement purchase" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-600">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 p-2 border rounded" rows={3} placeholder="Optional details" />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 p-2 border rounded">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600">Amount</label>
            <div className="mt-1 flex items-center">
              <input value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} type="number" className="w-full p-2 border rounded text-right text-lg font-semibold" placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Invoice (optional)</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" id="expense-invoice" />
              <label htmlFor="expense-invoice" className="inline-block px-3 py-2 rounded border text-sm cursor-pointer">Choose file</label>
              <span className="text-xs text-gray-500 truncate">{file ? file.name : 'No file selected'}</span>
            </div>
          </div>

          <div className="sm:col-span-2 flex flex-row items-center justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
