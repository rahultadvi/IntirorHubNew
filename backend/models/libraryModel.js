import mongoose from "mongoose";

const librarySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company", // ya User ke companyId
      required: true,
      index: true
    },

    category: {
      type: String,
      enum: ["Furniture", "Finishes", "Hardware", "Electrical"],
      required: true
    },

    subCategory: {
      type: String,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    baseRate: {
      type: Number,
      required: true
    },

    unit: {
      type: String, // Nos, Sq Ft
      required: true
    },

    image: String
  },
  { timestamps: true }
);

const Library = mongoose.model("Library", librarySchema);

export default Library;