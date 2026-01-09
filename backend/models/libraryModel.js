import mongoose from "mongoose";

const LibrarySchema = new mongoose.Schema(
  {
    CompanyName: {
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

    Category: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Library", LibrarySchema);
