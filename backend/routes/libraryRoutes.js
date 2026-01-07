import express from "express";
import {
  getLibraryItems,
  importLibraryCSV
} from "../controllers/libraryController.js";

import AuthMiddleware from "../middleware/AuthMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", AuthMiddleware, getLibraryItems);

router.post(
  "/import-csv",
  AuthMiddleware,
  upload.single("file"),
  importLibraryCSV
);

export default router;
