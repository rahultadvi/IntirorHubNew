import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRouter from "./routes/UserRoute.js";
import siteRouter from "./routes/SiteRoute.js";
import feedRouter from "./routes/FeedRoute.js";
import paymentRouter from "./routes/PaymentRoute.js";
import expenseRouter from "./routes/ExpenseRoute.js";
import boqRouter from "./routes/BOQRoute.js";
import libraryRoutes from "./routes/libraryRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;


app.use(cors({
  origin: '*',
  credentials: true,
}))
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

connectDB();

app.use("/api", userRouter);
app.use("/api/sites", siteRouter);
app.use("/api/feed", feedRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/boq", boqRouter);
app.use("/uploads", express.static("uploads"));
app.use("/api/library", libraryRoutes);


app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: true, limit: "50mb" }));


// ✅ Error handling middleware (MUST be AFTER all routes)
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: "File too large" });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({ message: "Too many files" });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: "Unexpected file field" });
  }
  
  // Custom multer filter errors
  if (err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ message: err.message });
  }
  
  // Default error
  res.status(500).json({ message: "Internal server error", error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
