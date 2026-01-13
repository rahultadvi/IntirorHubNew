
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import siteModel from "../models/siteModel.js";
import { sendPasswordEmail, sendOtpEmail, sendEmail } from "../utils/emailService.js";
import { generateTemporaryPassword } from "../utils/password.js";
import crypto from "crypto";

const buildToken = (id) =>
  jwt.sign({ 
    id,
    instanceId: process.env.SERVER_INSTANCE_ID || Date.now().toString() // Include server instance ID
  }, process.env.JWT_SECRET || "development-secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject({ getters: true });
  delete user.password;
  delete user.otp;
  delete user.otpExpiresAt;
  return user;
};

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const getOtpExpiryDate = () => new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

export const registerAdmin = async (req, res) => {
  try {
    const { email, phone, companyName, password, name } = req.body;

    if (!email || !phone || !companyName || !password) {
      return res.status(400).json({ message: "Email, phone, company name, and password are required" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const existingPhone = await userModel.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({ message: "Phone number already exists" });
    }

    // Check if company name is already registered
    const existingCompany = await userModel.findOne({ companyName: companyName.trim(), role: "ADMIN" });
    if (existingCompany) {
      return res.status(409).json({ message: "Company name is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await userModel.create({
      name,
      email,
      phone,
      companyName,
      password: hashedPassword,
      role: "ADMIN",
      parentId: null,
      isVerified: false,
      otp: otpHash,
      otpExpiresAt: getOtpExpiryDate(),
    });

    await sendOtpEmail({
      to: email,
      name: name || companyName,
      companyName,
      otp,
      context: "registration",
    });

    res.status(201).json({
      message: "Admin registered successfully. Enter the verification code sent to your email.",
      data: {
        email,
        needsVerification: true,
      },
    });
  } catch (error) {
    console.error("registerAdmin error", error);
    res.status(500).json({ message: "Unable to register admin" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Prevent deleted users from logging in
    if (user.isDeleted) {
      return res.status(403).json({ message: "This account has been deleted. Please contact your administrator." });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified. Please enter the verification code sent to your email." });
    }

    // Check company payment status: if any admin for the company has paymentDue=true, block login
    try {
      const adminRecord = await userModel.findOne({ companyName: user.companyName, role: 'ADMIN' }).select('+paymentDue');
      if (adminRecord && adminRecord.paymentDue) {
        return res.status(403).json({ message: 'Your payment is due. Please contact the administrator.' });
      }
    } catch (e) {
      console.error('payment check error', e);
    }

    const token = buildToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("loginUser error", error);
    res.status(500).json({ message: "Unable to login" });
  }
};

export const getProfile = async (req, res) => {
  try {
    // Check if user is deleted
    if (req.user.isDeleted) {
      return res.status(403).json({ message: "This account has been deleted. Please contact your administrator." });
    }

    const userObj = sanitizeUser(req.user);

    // Attach company payment status (check admin record for the company)
    try {
      const adminRecord = await userModel.findOne({ companyName: req.user.companyName, role: 'ADMIN' }).select('+paymentDue');
      userObj.companyPaymentDue = Boolean(adminRecord && adminRecord.paymentDue);
    } catch (e) {
      console.error('error fetching company payment status', e);
      userObj.companyPaymentDue = false;
    }

    res.status(200).json({ user: userObj });
  } catch (error) {
    console.error("getProfile error", error);
    res.status(500).json({ message: "Unable to fetch profile" });
  }
};

export const inviteUser = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admins can invite teammates" });
    }

    const { email, name, role, phone, siteIds, allowedModules } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }

    const normalizedRole = role.toUpperCase();
    const allowedRoles = ["MANAGER", "AGENT", "CLIENT"];
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: "Role must be Manager, Agent, or Client" });
    }

    const existing = await userModel.findOne({ email });
    if (existing) {
      // If user was deleted, restore them with new details
      if (existing.isDeleted) {
        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        existing.name = name || existing.name;
        existing.phone = phone || existing.phone;
        existing.role = normalizedRole;
        existing.password = hashedPassword;
        existing.isDeleted = false;
        existing.siteAccess = siteIds && Array.isArray(siteIds) ? siteIds : [];
        existing.allowedModules = allowedModules && Array.isArray(allowedModules) && allowedModules.length > 0 ? allowedModules : undefined;
        existing.isVerified = true;
        existing.parentId = req.user._id;
        
        await existing.save();

        await sendPasswordEmail({
          to: email,
          name: name || normalizedRole,
          password: tempPassword,
          companyName: req.user.companyName,
          role: normalizedRole,
          context: "invitation",
          inviter: req.user.name || req.user.email,
        });

        return res.status(201).json({
          message: "User re-invited successfully",
          user: sanitizeUser(existing),
        });
      }
      
      return res.status(409).json({ message: "Email already exists" });
    }

    if (phone) {
      const existingPhone = await userModel.findOne({ phone });
      if (existingPhone && !existingPhone.isDeleted) {
        return res.status(409).json({ message: "Phone number already exists" });
      }
    }

    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const invitedUser = await userModel.create({
      name,
      email,
      phone: phone || undefined,
      companyName: req.user.companyName,
      password: hashedPassword,
      role: normalizedRole,
      parentId: req.user._id,
      siteAccess: siteIds && Array.isArray(siteIds) ? siteIds : [],
      allowedModules: allowedModules && Array.isArray(allowedModules) && allowedModules.length > 0 ? allowedModules : undefined,
      isVerified: true,
    });

    await sendPasswordEmail({
      to: email,
      name: name || normalizedRole,
      password: tempPassword,
      companyName: req.user.companyName,
      role: normalizedRole,
      context: "invitation",
      inviter: req.user.name || req.user.email,
    });

    res.status(201).json({
      message: "User invited successfully",
      user: sanitizeUser(invitedUser),
    });
  } catch (error) {
    console.error("inviteUser error", error);
    res.status(500).json({ message: "Unable to invite user" });
  }
};

export const listCompanyUsers = async (req, res) => {
  try {
   
    if (!["ADMIN", "MANAGER", "AGENT"].includes(req.user.role)) {
      return res.status(403).json({ message: "You don't have permission to view users" });
    }

    const members = await userModel
      .find({ companyName: req.user.companyName, isDeleted: { $ne: true } })
      .select("name email role companyName createdAt siteAccess allowedModules");

    const payload = members.map((member) => ({
      id: member._id,
      name: member.name || member.email,
      email: member.email,
      role: member.role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        member.email || member.name || member.companyName || "User"
      )}`,
      joinedAt: member.createdAt,
      siteAccessCount: member.siteAccess ? member.siteAccess.length ?? 0 : 0,
      siteAccess: member.siteAccess ? member.siteAccess.map((id) => id.toString()) : [],
      allowedModules: member.allowedModules || ['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users'],
    }));

    return res.status(200).json({ users: payload });
  } catch (error) {
    console.error("listCompanyUsers error", error);
    return res.status(500).json({ message: "Unable to fetch users" });
  }
};

// List all users related to the current user's parentId or their own id
export const listRelatedUsers = async (req, res) => {
  try {
    const companyName = req.user.companyName;
    const members = await userModel.find({ companyName }).select("name email role companyName createdAt siteAccess allowedModules");

    const payload = members.map((member) => ({
      id: member._id,
      name: member.name || member.email,
      email: member.email,
      role: member.role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        member.email || member.name || member.companyName || "User"
      )}`,
      joinedAt: member.createdAt,
      siteAccessCount: member.siteAccess ? member.siteAccess.length ?? 0 : 0,
      allowedModules: member.allowedModules || ['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users'],
    }));

    return res.status(200).json({ users: payload });
  } catch (error) {
    console.error("listRelatedUsers error", error);
    return res.status(500).json({ message: "Unable to fetch related users" });
  }
};

export const updateUserSiteAccess = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update user site access' });
    }

    const { userId } = req.params;
    const { siteIds } = req.body;

    if (!Array.isArray(siteIds)) {
      return res.status(400).json({ message: 'siteIds must be an array' });
    }

    const user = await userModel.findByIdAndUpdate(
      userId,
      { siteAccess: siteIds },
      { new: true }
    ).select('name email role companyName createdAt siteAccess allowedModules');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User site access updated',
      user: {
        id: user._id,
        name: user.name || user.email,
        email: user.email,
        role: user.role,
        siteAccess: user.siteAccess ? user.siteAccess.map((id) => id.toString()) : [],
        allowedModules: user.allowedModules || ['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users'],
      },
    });
  } catch (error) {
    console.error('updateUserSiteAccess error', error);
    return res.status(500).json({ message: 'Unable to update user site access' });
  }
};

export const updateUserPermissions = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update user permissions' });
    }

    const { userId } = req.params;
    const { allowedModules } = req.body;

    if (!Array.isArray(allowedModules)) {
      return res.status(400).json({ message: 'allowedModules must be an array' });
    }

    const validModules = ['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users'];
    const invalidModules = allowedModules.filter(m => !validModules.includes(m));
    if (invalidModules.length > 0) {
      return res.status(400).json({ message: `Invalid modules: ${invalidModules.join(', ')}` });
    }

    const user = await userModel.findByIdAndUpdate(
      userId,
      { allowedModules: allowedModules.length > 0 ? allowedModules : undefined },
      { new: true }
    ).select('name email role companyName createdAt siteAccess allowedModules');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User permissions updated',
      user: {
        id: user._id,
        name: user.name || user.email,
        email: user.email,
        role: user.role,
        siteAccess: user.siteAccess ? user.siteAccess.map((id) => id.toString()) : [],
        allowedModules: user.allowedModules || ['home', 'payments', 'boq', 'expenses', 'feed', 'invite', 'manage-sites', 'users'],
      },
    });
  } catch (error) {
    console.error('updateUserPermissions error', error);
    return res.status(500).json({ message: 'Unable to update user permissions' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const user = await userModel.findOne({ email }).select("+otp +otpExpiresAt");
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (user.isVerified) {
      const token = buildToken(user._id);
      return res.status(200).json({
        message: "Account already verified",
        token,
        user: sanitizeUser(user),
      });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No verification code found. Request a new one." });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Verification code expired. Request a new one." });
    }

    const isValidOtp = await bcrypt.compare(otp, user.otp);
    if (!isValidOtp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save({ validateBeforeSave: false });

    const token = buildToken(user._id);

    res.status(200).json({
      message: "Account verified successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("verifyOtp error", error);
    res.status(500).json({ message: "Unable to verify code" });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await userModel.findOne({ email }).select("+otp +otpExpiresAt");
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" });
    }

    const otp = generateOtp();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = getOtpExpiryDate();
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail({
      to: user.email,
      name: user.name || user.companyName,
      companyName: user.companyName,
      otp,
      context: "registration",
    });

    res.status(200).json({ message: "Verification code sent" });
  } catch (error) {
    console.error("resendOtp error", error);
    res.status(500).json({ message: "Unable to send verification code" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await userModel.findOne({ email }).select('+resetPasswordToken +resetPasswordTokenExpires');
    if (!user) return res.status(404).json({ message: 'Account not found' });

    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + (process.env.RESET_PASSWORD_EXPIRES_MS ? Number(process.env.RESET_PASSWORD_EXPIRES_MS) : 3600000)); // 1 hour default

    user.resetPasswordToken = token;
    user.resetPasswordTokenExpires = expires;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL;
    const resetLink = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    const html = `<p>Hello ${user.name || user.email},</p>
      <p>You requested a password reset. Click the link below to set a new password. The link expires in 1 hour.</p>
      <p><a href="${resetLink}">Reset your password</a></p>
      <p>If you didn't request this, ignore this email.</p>`;

    await sendEmail(email, 'Reset your SiteZero password', html);

    return res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('forgotPassword error', error);
    return res.status(500).json({ message: 'Unable to send password reset email' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) return res.status(400).json({ message: 'Email, token and newPassword are required' });

    const user = await userModel.findOne({ email }).select('+resetPasswordToken +resetPasswordTokenExpires +password');
    if (!user) return res.status(404).json({ message: 'Account not found' });

    if (!user.resetPasswordToken || !user.resetPasswordTokenExpires) {
      return res.status(400).json({ message: 'No reset request found. Request a new reset email.' });
    }

    if (user.resetPasswordToken !== token) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    if (user.resetPasswordTokenExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Reset token expired. Request a new reset email.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('resetPassword error', error);
    return res.status(500).json({ message: 'Unable to reset password' });
  }
};

// --- Admin helpers
export const listAllCompanyAdmins = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const admins = await userModel.find({ role: 'ADMIN' }).select('name email phone companyName createdAt paymentDue');

    const payload = admins.map((a) => ({
      id: a._id,
      companyName: a.companyName,
      email: a.email,
      phone: a.phone,
      createdAt: a.createdAt,
      paymentDue: Boolean(a.paymentDue),
    }));

    return res.status(200).json({ companies: payload });
  } catch (error) {
    console.error('listAllCompanyAdmins error', error);
    return res.status(500).json({ message: 'Unable to fetch company admins' });
  }
};

export const getCompanyUsersByName = async (req, res) => {
  try {
    const { companyName } = req.params;
    if (!companyName) return res.status(400).json({ message: 'companyName is required' });

    const members = await userModel.find({ companyName }).select('name email role companyName createdAt siteAccess');

    const payload = members.map((member) => ({
      id: member._id,
      name: member.name || member.email,
      email: member.email,
      role: member.role,
      joinedAt: member.createdAt,
      siteAccessCount: member.siteAccess ? member.siteAccess.length ?? 0 : 0,
    }));

    return res.status(200).json({ users: payload });
  } catch (error) {
    console.error('getCompanyUsersByName error', error);
    return res.status(500).json({ message: 'Unable to fetch company users' });
  }
};

export const getCompanySites = async (req, res) => {
  try {
    const { companyName } = req.params;
    if (!companyName) return res.status(400).json({ message: 'companyName is required' });

    const sites = await siteModel.find({ companyName }).select('name description contractValue createdAt');

    const payload = sites.map((s) => ({
      id: s._id,
      name: s.name,
      description: s.description,
      contractValue: s.contractValue,
      createdAt: s.createdAt,
    }));

    return res.status(200).json({ sites: payload });
  } catch (error) {
    console.error('getCompanySites error', error);
    return res.status(500).json({ message: 'Unable to fetch company sites' });
  }
};

export const toggleCompanyPayment = async (req, res) => {
  try {
    const { companyName } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ message: 'enabled must be boolean' });
    if (!companyName) return res.status(400).json({ message: 'companyName is required' });

    await userModel.updateMany({ role: 'ADMIN', companyName }, { $set: { paymentDue: enabled } });

    return res.status(200).json({ message: 'Payment flag updated', companyName, paymentDue: enabled });
  } catch (error) {
    console.error('toggleCompanyPayment error', error);
    return res.status(500).json({ message: 'Unable to update payment flag' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only admins can delete users
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Only admins can delete users' });
    }

    // Find the user to delete
    const userToDelete = await userModel.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (userToDelete._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Prevent deleting users from other companies (unless super admin)
    if (userToDelete.companyName !== req.user.companyName) {
      return res.status(403).json({ message: 'You can only delete users from your company' });
    }

    // Mark user as deleted instead of actually deleting
    await userModel.deleteOne({ _id: userId });

    return res.status(200).json({ message: 'User deleted successfully', userId });
  } catch (error) {
    console.error('deleteUser error', error);
    return res.status(500).json({ message: 'Unable to delete user' });
  }
};

export default {
  registerAdmin,
  loginUser,
  getProfile,
  inviteUser,
  listCompanyUsers,
  listRelatedUsers,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  listAllCompanyAdmins,
  getCompanyUsersByName,
  getCompanySites,
  toggleCompanyPayment,
  deleteUser,
  updateUserPermissions,
};
