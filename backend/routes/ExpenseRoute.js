import express from 'express';
import * as ExpenseController from '../controllers/ExpenseController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Add expense
router.post('/add', auth, ExpenseController.addExpense);

// Get expenses by site
router.get('/site/:siteId', auth, ExpenseController.getExpensesBySite);

// Serve raw invoice file (must come before generic :expenseId route)
router.get('/invoice-file/:filename', ExpenseController.serveInvoiceFile);

// Upload invoice
router.post('/:expenseId/upload-invoice', auth, ExpenseController.uploadInvoice);

// Approve / status
router.put('/:expenseId/approve', auth, ExpenseController.approveExpense);
router.put('/:expenseId/status', auth, ExpenseController.updateExpenseStatus);
router.put('/:expenseId/payment-status', auth, ExpenseController.updateExpensePaymentStatus);

// Download invoice
router.get('/:expenseId/invoice', auth, ExpenseController.downloadInvoice);

// Delete expense
router.delete('/:expenseId', auth, ExpenseController.deleteExpense);

export default router;
