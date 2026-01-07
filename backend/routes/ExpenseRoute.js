import express from 'express';
import * as ExpenseController from '../controllers/ExpenseController.js';
import auth from '../middleware/auth.js';

import { uploadSingleFile, uploadSingleImage } from "../utils/multer.js";

const router = express.Router();

// Add expense (NO FILE)
router.post('/add', auth, ExpenseController.addExpense);

// Get expenses
router.get('/site/:siteId', auth, ExpenseController.getExpensesBySite);

// Upload invoice (✅ MULTER YAHAN LAGEGA)
router.post(
  '/:expenseId/upload-invoice',
  auth,
  uploadSingleFile('invoices'), // 👈 MULTER HERE
  ExpenseController.uploadInvoice
);


// Serve raw invoice file
router.get('/invoice-file/:filename', ExpenseController.serveInvoiceFile);

// Approve / status
router.put('/:expenseId/approve', auth, ExpenseController.approveExpense);
router.put('/:expenseId/status', auth, ExpenseController.updateExpenseStatus);
router.put('/:expenseId/payment-status', auth, ExpenseController.updateExpensePaymentStatus);

// Download invoice
router.get('/:expenseId/invoice', auth, ExpenseController.downloadInvoice);

// Delete expense
router.delete('/:expenseId', auth, ExpenseController.deleteExpense);

export default router;
