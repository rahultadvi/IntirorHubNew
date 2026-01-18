import express from "express";
import AuthMiddleware from "../middleware/auth.js";

import {
  addLibraryItem,
  bulkAddLibraryItems,
  getLibraryItems,
  updateLibraryItem,
  deleteLibraryItem,
  getLibraryItemById,
} from "../controllers/libraryController.js";

// import { importLibraryCSV } from "../controllers/libraryController.js";
import { uploadSingleImage, uploadSingleFile } from "../utils/multer.js";

const router = express.Router();

/* ================= AUTH ================= */
router.use(AuthMiddleware);

/* ================= LIBRARY CRUD ================= */

// Get all library items
router.get("/", getLibraryItems);

// Get single library item
router.get("/:id", getLibraryItemById);

// Add library item (optional image)
router.post(
  "/",
  uploadSingleImage("boq-images"),
  addLibraryItem
);

// Bulk add library items
router.post("/bulk", bulkAddLibraryItems);

// Update library item
router.put(
  "/:id",
  updateLibraryItem
);

// Delete library item
router.delete("/:id", deleteLibraryItem);

/* ================= CSV IMPORT ================= */

// Import library items from CSV
// router.post(
//   "/import-csv",
//   uploadSingleFile("library"),
//   importLibraryCSV
// );

export default router;
