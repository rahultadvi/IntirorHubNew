import mongoose from "mongoose";

const LibrarySchema = new mongoose.Schema(
  {
    companyName: {
      type:String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 0,
    },

    baseRate: {
      type: Number,
      required: true,
      min: 0,
    },

    ratePerQty: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
    },

    tag: {
      type: String,
      default: "",
    },

    Category: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Library", LibrarySchema);
