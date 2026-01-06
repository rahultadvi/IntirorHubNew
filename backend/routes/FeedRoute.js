import { Router } from "express";
import AuthMiddleware from "../middleware/auth.js";
import { listFeed, createFeedItem, getFeedItem, toggleLike, deleteFeedItem } from "../controllers/FeedController.js";

const feedRouter = Router();

feedRouter.use(AuthMiddleware);

feedRouter.get("/", listFeed);
feedRouter.post("/", createFeedItem);
feedRouter.get("/:id", getFeedItem);
feedRouter.post("/:id/like", toggleLike);   
feedRouter.delete("/:id", deleteFeedItem);

export default feedRouter;
