import express from 'express';
import * as BOQController from '../controllers/BOQController.js';
import { uploadSingleImage, uploadBOQFiles } from '../utils/multer.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Add BOQ item with optional image upload
router.post('/add', auth, uploadSingleImage('boq-images'), BOQController.addBOQItem);

// Get BOQ items by site
router.get('/site/:siteId', auth, BOQController.getBOQItemsBySite);

// Update BOQ item (quantity, purchaseRate, bill, photo)
router.put('/:boqId', auth, uploadBOQFiles(), BOQController.updateBOQItem);

// Update BOQ status
router.put('/:boqId/status', auth, BOQController.updateBOQStatus);

// Delete BOQ item
router.delete('/:boqId', auth, BOQController.deleteBOQItem);

// Serve reference image
router.get('/image/:filename', BOQController.getBOQImage);

// Lock/Unlock BOQ room (Admin only)
router.post('/room/lock', auth, BOQController.lockBOQRoom);
router.post('/room/unlock', auth, BOQController.unlockBOQRoom);

export default router;