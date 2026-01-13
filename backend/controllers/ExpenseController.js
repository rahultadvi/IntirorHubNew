import Expense from '../models/expenseModel.js';
import Site from '../models/siteModel.js';
import User from '../models/userModel.js';
import fs from 'fs';
import path from 'path';

const INVOICE_FOLDER = path.join(process.cwd(), 'uploads', 'invoices');

// Ensure folder exists
try {
  fs.mkdirSync(INVOICE_FOLDER, { recursive: true });
} catch (e) {}

/* ================= ADD EXPENSE ================= */

export const addExpense = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      amount,
      dueDate,
      siteId,
      invoiceBase64,
      invoiceFilename
    } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess =
      site.companyName === req.user.companyName ||
      (req.user.siteAccess &&
        req.user.siteAccess.some(id => id.toString() === siteId));

    if (!hasAccess)
      return res.status(403).json({ message: 'You do not have access to this site' });

    const expense = new Expense({
      title,
      description,
      category,
      amount,
      dueDate,
      siteId,
      createdBy: req.user._id,
      companyName: req.user.companyName,
      status: req.user.role === 'ADMIN' ? 'approved' : 'pending'
    });

    /* ========= MULTER FILE (PRIORITY) ========= */
    if (req.file) {
      const safeName = `${Date.now()}-${req.file.originalname}`.replace(/\s+/g, '_');
      const filePath = path.join(INVOICE_FOLDER, safeName);

      fs.copyFileSync(req.file.path, filePath);

      expense.invoice = {
        path: `uploads/invoices/${safeName}`,
        filename: req.file.originalname
      };
    }

    /* ========= BASE64 (FALLBACK – OLD LOGIC) ========= */
    else if (invoiceBase64 && invoiceFilename) {
      const buffer = Buffer.from(invoiceBase64, 'base64');
      const safeName = `${Date.now()}-${invoiceFilename}`.replace(/\s+/g, '_');
      const filePath = path.join(INVOICE_FOLDER, safeName);

      fs.writeFileSync(filePath, buffer);

      expense.invoice = {
        path: `uploads/invoices/${safeName}`,
        filename: invoiceFilename
      };
    }

    await expense.save();

    res.status(201).json({ message: 'Expense added', expense });
  } catch (error) {
    console.error('Error adding expense', error);
    res.status(500).json({
      message: 'Error adding expense',
      error: error.message
    });
  }
};

/* ================= GET EXPENSES ================= */

export const getExpensesBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { category, status, minAmount, maxAmount, startDate, endDate } = req.query;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess =
      site.companyName === req.user.companyName ||
      (req.user.siteAccess &&
        req.user.siteAccess.some(id => id.toString() === siteId));

    if (!hasAccess)
      return res.status(403).json({ message: 'You do not have access to this site' });

    // Build query filter
    const query = { siteId };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) {
        query.amount.$gte = Number(minAmount);
      }
      if (maxAmount) {
        query.amount.$lte = Number(maxAmount);
      }
    }
    
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) {
        query.dueDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.dueDate.$lte = new Date(endDate);
      }
    }

    const expenses = await Expense.find(query)
      .populate('createdBy', 'name email role')
      .sort({ dueDate: -1 });

    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses', error);
    res.status(500).json({
      message: 'Error fetching expenses',
      error: error.message
    });
  }
};

/* ================= UPLOAD INVOICE ================= */

export const uploadInvoice = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const site = await Site.findById(expense.siteId);
    const hasAccess =
      site.companyName === req.user.companyName ||
      (req.user.siteAccess &&
        req.user.siteAccess.some(id => id.toString() === expense.siteId.toString()));

    if (!hasAccess)
      return res.status(403).json({ message: 'You do not have access to this site' });

    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded' });

    const safeName = `${Date.now()}-${req.file.originalname}`.replace(/\s+/g, '_');
    const filePath = path.join(INVOICE_FOLDER, safeName);

    fs.copyFileSync(req.file.path, filePath);

    expense.invoice = {
      path: `uploads/invoices/${safeName}`,
      filename: req.file.originalname
    };

    await expense.save();

    res.json({ message: 'Invoice uploaded', expense });
  } catch (error) {
    console.error('Error uploading invoice', error);
    res.status(500).json({
      message: 'Error uploading invoice',
      error: error.message
    });
  }
};

/* ================= DOWNLOAD ================= */

export const downloadInvoice = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId);
    if (!expense || !expense.invoice)
      return res.status(404).json({ message: 'Invoice not found' });

    const fileName = expense.invoice.path.split('/').pop();
    const filePath = path.join(INVOICE_FOLDER, fileName);

    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: 'File not found' });

    res.download(filePath, expense.invoice.filename || 'invoice');
  } catch (error) {
    console.error('Error downloading invoice', error);
    res.status(500).json({
      message: 'Error downloading invoice',
      error: error.message
    });
  }
};
/* ================= APPROVE ================= */
/* ================= APPROVE ================= */
export const approveExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    // Only ADMIN can approve
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can approve expense" });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    expense.status = "approved";
    expense.approvedBy = req.user._id;
    expense.approvedAt = new Date();

    await expense.save();

    res.json({
      message: "Expense approved successfully",
      expense
    });
  } catch (error) {
    console.error("Approve expense error:", error);
    res.status(500).json({
      message: "Error approving expense",
      error: error.message
    });
  }
};


/* ================= STATUS ================= */
/* ================= UPDATE STATUS ================= */
export const updateExpenseStatus = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["pending", "approved", "rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
        allowed: allowedStatuses
      });
    }

    // Only ADMIN can change status
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Only admin can update expense status"
      });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    expense.status = status;
    await expense.save();

    res.json({
      message: "Expense status updated",
      expense
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      message: "Error updating expense status",
      error: error.message
    });
  }
};

/* ================= PAYMENT STATUS ================= */
/* ================= PAYMENT STATUS ================= */
export const updateExpensePaymentStatus = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { paymentStatus } = req.body;

    const allowedPaymentStatus = ["unpaid", "paid"];

    if (!allowedPaymentStatus.includes(paymentStatus)) {
      return res.status(400).json({
        message: "Invalid payment status",
        allowed: allowedPaymentStatus
      });
    }

    // Only ADMIN can update payment status
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Only admin can update payment status"
      });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    expense.paymentStatus = paymentStatus;
    expense.paidAt = paymentStatus === "paid" ? new Date() : null;

    await expense.save();

    res.json({
      message: "Payment status updated",
      expense
    });
  } catch (error) {
    console.error("Payment status error:", error);
    res.status(500).json({
      message: "Error updating payment status",
      error: error.message
    });
  }
};

/* ================= SERVE FILE ================= */

export const serveInvoiceFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(INVOICE_FOLDER, filename);

    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: 'File not found' });

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE ================= */

export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    if (req.user.role !== 'ADMIN')
      return res.status(403).json({ message: 'Only admin can delete expenses' });

    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (expense.invoice?.path) {
      const fileName = expense.invoice.path.split('/').pop();
      const filePath = path.join(INVOICE_FOLDER, fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Expense.deleteOne({ _id: expenseId });

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  addExpense,
  getExpensesBySite,
  uploadInvoice,
  downloadInvoice,
  serveInvoiceFile,
  deleteExpense
};
