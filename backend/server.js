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

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use persistent server instance ID - sessions will persist across restarts
// If SERVER_INSTANCE_ID is set in .env, use that; otherwise generate a stable one based on JWT_SECRET
const SERVER_INSTANCE_ID = process.env.SERVER_INSTANCE_ID || 
  (process.env.JWT_SECRET ? crypto.createHash('sha256').update(process.env.JWT_SECRET).digest('hex').substring(0, 16) : 'default-instance-id');
console.log('Server instance ID:', SERVER_INSTANCE_ID);
// Make it available globally for JWT token generation/validation
process.env.SERVER_INSTANCE_ID = SERVER_INSTANCE_ID;

const app = express();
const PORT = process.env.PORT;


app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite
      "http://localhost:3000"  // React (agar ho)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);




app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

connectDB();

app.use("/api", userRouter);
app.use("/api/sites", siteRouter);
app.use("/api/feed", feedRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/boq", boqRouter);
app.use("/api/library", libraryRoutes);
app.use("/api/materials", materialRouter);

// Serve uploads directory FIRST - allows access to all subdirectories (feed-files, feed-images, boq-images, invoices, etc.)
// This must come before frontend static to avoid conflicts with frontend/dist/uploads
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));

// Serve static files from frontend/dist
const frontendDistPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDistPath));

// Catch-all handler: send back React's index.html file for client-side routing
// This should be last, after all API routes and static file serving
app.use((req, res, next) => {
  // Don't serve index.html for API routes or uploads
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, "index.html"));
});


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
