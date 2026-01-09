import mongoose from "mongoose";

const FeedSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      index: true,
    },
    siteName: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["update", "photo", "document", "milestone"],
      default: "update",
    },
    feedType: {
      type: String,
      enum: ["progress", "design", "material", "issue"],
      default: "progress",
    },
    title: { type: String, trim: true, default: "" },
    content: { type: String, trim: true, default: "" },
    images: [{ type: String, trim: true }],
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String, default: "" },
        type: { type: String, default: "application/octet-stream" },
        size: { type: Number, default: 0 },
      },
    ],
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentsCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);


const Feed = mongoose.model("Feed", FeedSchema);

export default Feed;
