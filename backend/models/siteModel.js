
import mongoose from "mongoose";

const SiteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    contractValue: {
      type: Number,
      default: 0,
    },
    clientEmail: {
      type: String,
      trim: true,
    },
    clientPhone: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
    },
    expectedCompletionDate: {
      type: Date,
    },
    companyName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    budgetAllocation: {
      categories: {
        Material: { type: Number, default: 0 },
        Labour: { type: Number, default: 0 },
        Electrical: { type: Number, default: 0 },
        Equipment: { type: Number, default: 0 },
        Transport: { type: Number, default: 0 },
        Miscellaneous: { type: Number, default: 0 },
      },
      emergencyReserve: { type: Number, default: 0 },
      profitMargin: { type: Number, default: 0 },
      emergencyReserveLocked: { type: Boolean, default: true },
      profitMarginLocked: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Site", SiteSchema);
