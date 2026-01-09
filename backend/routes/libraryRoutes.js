import express from "express";
import AuthMiddleware from "../middleware/auth.js";

import {
  addLibraryItem,
  getLibraryItems,
  updateLibraryItem,
  deleteLibraryItem,
  getLibraryItemsByCategory,
} from "../controllers/BOQController.js";

import { importLibraryCSV } from "../controllers/libraryController.js";
import { uploadSingleImage, uploadSingleFile } from "../utils/multer.js";

// const router = express.Router();

/* ================= AUTH ================= */
router.use(AuthMiddleware);

/* ================= LIBRARY CRUD ================= */

// ✅ Get all library items
router.get("/", getLibraryItems);

// ✅ Get items by category
router.get("/category/:category", getLibraryItemsByCategory);

// ✅ Add library item (optional image)
router.post(
  "/",
  uploadSingleImage("boq-images"),
  addLibraryItem
);

// ✅ Update library item
router.put(
  "/:itemId",
  uploadSingleImage("boq-images"),
  updateLibraryItem
);

// ✅ Delete library item
router.delete("/:itemId", deleteLibraryItem);

/* ================= CSV IMPORT ================= */

// ✅ Import library items from CSV
router.post(
  "/import-csv",
  uploadSingleFile("library"),
  importLibraryCSV
);

export default router;
