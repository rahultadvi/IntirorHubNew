import express from 'express';
import * as MaterialController from '../controllers/MaterialController.js';
import AuthMiddleware from '../middleware/auth.js';
import { uploadMaterialFiles } from '../utils/multer.js';

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware);

// Add a new material
router.post('/add', uploadMaterialFiles(), MaterialController.addMaterial);

// Get all materials for a site
router.get('/site/:siteId', MaterialController.getMaterialsBySite);

// Get single material
router.get('/:materialId', MaterialController.getMaterial);

// Update material
router.put('/:materialId', uploadMaterialFiles(), MaterialController.updateMaterial);

// Delete material
router.delete('/:materialId', MaterialController.deleteMaterial);

export default router;



