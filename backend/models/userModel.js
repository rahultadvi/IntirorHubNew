import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "AGENT", "CLIENT"],
      default: "ADMIN",
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    siteAccess: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    }],
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    paymentDue: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },
    allowedModules: {
      type: [String],
      default: ['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users'],
      enum: ['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users'],
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

export default mongoose.model("User",UserSchema);