import mongoose from "mongoose";

const FeedSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      index: true,
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
    title: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        url: {
          type: String,
          trim: true,
        },
        name: {
          type: String,
          trim: true,
        },
        type: {
          type: String,
          trim: true,
        },
        size: {
          type: Number,
        },
      },
    ],
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

