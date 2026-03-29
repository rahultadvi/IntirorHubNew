import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

import userRouter from "./routes/UserRoute.js";
import siteRouter from "./routes/SiteRoute.js";
import feedRouter from "./routes/FeedRoute.js";
import paymentRouter from "./routes/PaymentRoute.js";
import expenseRouter from "./routes/ExpenseRoute.js";
import boqRouter from "./routes/BOQRoute.js";
import libraryRoutes from "./routes/libraryRoutes.js";
import materialRouter from "./routes/MaterialRoute.js";

dotenv.config();

// Create app FIRST
const app = express();
const PORT = process.env.PORT || 5000;

// CORS must come after app creation
app.use(cors({
  origin: "*",   // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server instance id logic
const SERVER_INSTANCE_ID = process.env.SERVER_INSTANCE_ID ||
  (process.env.JWT_SECRET
    ? crypto.createHash("sha256").update(process.env.JWT_SECRET).digest("hex").substring(0, 16)
    : "default-instance-id");

console.log("Server instance ID:", SERVER_INSTANCE_ID);
process.env.SERVER_INSTANCE_ID = SERVER_INSTANCE_ID;

// DB connect
connectDB();

// Routes
app.use("/api", userRouter);
app.use("/api/sites", siteRouter);
app.use("/api/feed", feedRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/boq", boqRouter);
app.use("/api/library", libraryRoutes);
app.use("/api/materials", materialRouter);

// Uploads
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));

// Frontend build
// const frontendDistPath = path.join(__dirname, "../frontend/dist");
// app.use(express.static(frontendDistPath));

// React routing fallback
// app.use((req, res, next) => {
//   if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
//     return next();
//   }
//   res.sendFile(path.join(frontendDistPath, "index.html"));
// });
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});
// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
