import express from 'express';
import * as PaymentController from '../controllers/PaymentController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Add a new payment (admin only)
router.post('/add', auth, PaymentController.addPayment);

// Get all payments for a site
router.get('/site/:siteId', auth, PaymentController.getPaymentsBySite);

// Mark payment as paid (admin only)
router.put('/:paymentId/paid', auth, PaymentController.markAsPaid);

// Send payment reminder (admin and manager)
router.post('/:paymentId/remind', auth, PaymentController.sendReminder);

// Admin can set arbitrary status
router.put('/:paymentId/status', auth, PaymentController.updatePaymentStatus);

// Download invoice
router.get('/:paymentId/invoice', auth, PaymentController.downloadInvoice);

router.delete('/:paymentId', auth, PaymentController.deletePayment);

export default router;
