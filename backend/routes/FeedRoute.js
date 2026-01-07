import { Router } from "express";
import AuthMiddleware from "../middleware/auth.js";
import { listFeed, createFeedItem, getFeedItem, toggleLike, deleteFeedItem } from "../controllers/FeedController.js";
import {  uploadFeedFiles, uploadImages } from "../utils/multer.js";

const feedRouter = Router();

feedRouter.use(AuthMiddleware);

feedRouter.get("/", listFeed);

// ➕ Create feed WITH image upload
feedRouter.post(
  "/",
  uploadFeedFiles("feed-files"), // ✅ sirf ye rakho
  createFeedItem
);

// 📄 Get single feed
feedRouter.get("/:id", getFeedItem);

// ❤️ Like feed
feedRouter.post("/:id/like", toggleLike);

// 🗑️ Delete feed
feedRouter.delete("/:id", deleteFeedItem);
export default feedRouter;
