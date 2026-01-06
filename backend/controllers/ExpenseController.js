import Expense from '../models/expenseModel.js';
import Site from '../models/siteModel.js';
import User from '../models/userModel.js';
import fs from 'fs';
import path from 'path';

const INVOICE_FOLDER = path.join(process.cwd(), 'uploads', 'invoices');

// Ensure folder exists
try { fs.mkdirSync(INVOICE_FOLDER, { recursive: true }); } catch (e) {}

export const addExpense = async (req, res) => {
  try {
    const { title, description, category, amount, dueDate, siteId, invoiceBase64, invoiceFilename } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
                      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === siteId));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    const expense = new Expense({
      title,
      description,
      category,
      amount,
      dueDate,
      siteId,
      createdBy: req.user._id,
      companyName: req.user.companyName
    });

    // Auto-approve if admin
    if (req.user.role === 'ADMIN') {
      expense.status = 'approved';
    } else {
      expense.status = 'pending';
    }

    // Save invoice if provided as base64
    if (invoiceBase64 && invoiceFilename) {
      const buffer = Buffer.from(invoiceBase64, 'base64');
      const safeName = `${Date.now()}-${invoiceFilename}`.replace(/\s+/g, '_');
      const filePath = path.join(INVOICE_FOLDER, safeName);
      fs.writeFileSync(filePath, buffer);
      expense.invoice = { path: `/api/expenses/invoice-file/${safeName}`, filename: invoiceFilename };
    }

    await expense.save();

    res.status(201).json({ message: 'Expense added', expense });
  } catch (error) {
    console.error('Error adding expense', error);
    res.status(500).json({ message: 'Error adding expense', error: error.message });
  }
};

export const getExpensesBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
                      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === siteId));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    let query = { siteId };

    // allow filters via query params (status, category, minAmount, maxAmount, startDate, endDate)
    if (req.query.status) query.status = req.query.status;
    if (req.query.category) query.category = req.query.category;
    if (req.query.minAmount || req.query.maxAmount) {
      query.amount = {};
      if (req.query.minAmount) query.amount.$gte = Number(req.query.minAmount);
      if (req.query.maxAmount) query.amount.$lte = Number(req.query.maxAmount);
    }
    if (req.query.startDate || req.query.endDate) {
      query.dueDate = {};
      if (req.query.startDate) query.dueDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.dueDate.$lte = new Date(req.query.endDate);
    }

    const expenses = await Expense.find(query).populate('createdBy', 'name email role').sort({ dueDate: -1 });
    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses', error);
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
};

export const uploadInvoice = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { invoiceBase64, invoiceFilename } = req.body;

    if (!invoiceBase64 || !invoiceFilename) return res.status(400).json({ message: 'Missing invoice data' });

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    // Only allow users who have access to the site or admins to upload
    const site = await Site.findById(expense.siteId);
    const hasAccess = site.companyName === req.user.companyName ||
                      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === expense.siteId.toString()));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    const buffer = Buffer.from(invoiceBase64, 'base64');
    const safeName = `${Date.now()}-${invoiceFilename}`.replace(/\s+/g, '_');
    const filePath = path.join(INVOICE_FOLDER, safeName);
    fs.writeFileSync(filePath, buffer);
    expense.invoice = { path: `/api/expenses/invoice-file/${safeName}`, filename: invoiceFilename };

    await expense.save();
    res.json({ message: 'Invoice uploaded', expense });
  } catch (error) {
    console.error('Error uploading invoice', error);
    res.status(500).json({ message: 'Error uploading invoice', error: error.message });
  }
};

export const approveExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Only admin can approve/reject' });

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (action === 'approve') {
      expense.status = 'approved';
    } else if (action === 'reject') {
      expense.status = 'rejected';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await expense.save();
    res.json({ message: `Expense ${action}d`, expense });
  } catch (error) {
    console.error('Error approving expense', error);
    res.status(500).json({ message: 'Error approving expense', error: error.message });
  }
};

// Update expense status (admin only) - set to pending/approved/rejected
export const updateExpenseStatus = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { status } = req.body; // 'pending' | 'approved' | 'rejected'

    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Only admin can update expense status' });

    const allowed = ['pending', 'approved', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (expense.companyName !== req.user.companyName) return res.status(403).json({ message: 'Expense does not belong to your company' });

    expense.status = status;
    await expense.save();

    res.json({ message: 'Expense status updated', expense });
  } catch (error) {
    console.error('Error updating expense status', error);
    res.status(500).json({ message: 'Error updating expense status', error: error.message });
  }
};

// Update expense payment status (admin only)
export const updateExpensePaymentStatus = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { paymentStatus } = req.body; // 'paid' | 'due'

    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Only admin can update payment status' });

    const allowed = ['paid', 'due'];
    if (!allowed.includes(paymentStatus)) return res.status(400).json({ message: 'Invalid payment status' });

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (expense.companyName !== req.user.companyName) return res.status(403).json({ message: 'Expense does not belong to your company' });

    expense.paymentStatus = paymentStatus;
    if (paymentStatus === 'paid') expense.paidDate = new Date();
    else expense.paidDate = undefined;

    await expense.save();
    res.json({ message: 'Expense payment status updated', expense });
  } catch (error) {
    console.error('Error updating expense payment status', error);
    res.status(500).json({ message: 'Error updating expense payment status', error: error.message });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findById(expenseId).populate('siteId');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    // Clients can only download if expense approved
    if (req.user.role === 'CLIENT') {
      if (expense.status !== 'approved' || !expense.invoice || !expense.invoice.path) {
        return res.status(403).json({ message: 'Invoice not available' });
      }
    } else {
      // For non-clients, ensure company matches
      if (expense.companyName !== req.user.companyName) return res.status(403).json({ message: 'Expense does not belong to your company' });
    }

    // Serve the file from uploads folder
    if (!expense.invoice || !expense.invoice.path) return res.status(404).json({ message: 'Invoice not uploaded' });

    const parts = expense.invoice.path.split('/').pop();
    const filePath = path.join(INVOICE_FOLDER, parts);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

    res.download(filePath, expense.invoice.filename || 'invoice');
  } catch (error) {
    console.error('Error downloading invoice', error);
    res.status(500).json({ message: 'Error downloading invoice', error: error.message });
  }
};

// Endpoint to serve raw invoice files (internal use)
export const serveInvoiceFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(INVOICE_FOLDER, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving invoice file', error);
    res.status(500).json({ message: 'Error serving invoice file', error: error.message });
  }
};

// Delete an expense (admin only)
export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Only admin can delete expenses' });

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (expense.companyName !== req.user.companyName) return res.status(403).json({ message: 'Expense does not belong to your company' });

    // Remove invoice file from disk if present
    if (expense.invoice && expense.invoice.path) {
      try {
        const parts = expense.invoice.path.split('/').pop();
        const filePath = path.join(INVOICE_FOLDER, parts);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn('Failed to delete invoice file:', e.message);
        // continue with deletion of DB record
      }
    }

    await Expense.deleteOne({ _id: expenseId });

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Error deleting expense', error);
    res.status(500).json({ message: 'Error deleting expense', error: error.message });
  }
};

export default {
  addExpense,
  getExpensesBySite,
  uploadInvoice,
  approveExpense,
  downloadInvoice,
  serveInvoiceFile,
  deleteExpense
};
