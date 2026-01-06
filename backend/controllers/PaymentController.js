import Payment from "../models/paymentModel.js";
import Site from "../models/siteModel.js";
import User from "../models/userModel.js";
import { sendEmail } from "../utils/emailService.js";
import PDFDocument from "pdfkit";

/* ======================================================
   ADD PAYMENT (ADMIN)
====================================================== */
export const addPayment = async (req, res) => {
  try {
    const { title, description, amount, dueDate, siteId } = req.body;

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can add payments" });
    }

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: "Site not found" });

    if (site.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Site does not belong to your company" });
    }

    const payment = await Payment.create({
      title,
      description,
      amount,
      dueDate,
      siteId,
      createdBy: req.user._id,
      companyName: req.user.companyName
    });

    payment.updateStatus();
    await payment.save();

    res.status(201).json({ message: "Payment added successfully", payment });
  } catch (err) {
    res.status(500).json({ message: "Error adding payment", error: err.message });
  }
};

/* ======================================================
   GET PAYMENTS BY SITE
====================================================== */
export const getPaymentsBySite = async (req, res) => {
  try {
    const { siteId } = req.params;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: "Site not found" });

    const hasAccess =
      site.companyName === req.user.companyName ||
      (req.user.siteAccess &&
        req.user.siteAccess.some(id => id.toString() === siteId));

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payments = await Payment.find({ siteId })
      .sort({ dueDate: -1 })
      .populate("createdBy", "name email");

    payments.forEach(p => p.updateStatus());
    await Promise.all(payments.map(p => p.save()));

    res.json({ payments });
  } catch (err) {
    res.status(500).json({ message: "Error fetching payments", error: err.message });
  }
};

/* ======================================================
   MARK AS PAID (ADMIN)
====================================================== */
export const markAsPaid = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    payment.status = "paid";
    payment.paidDate = new Date();
    await payment.save();

    res.json({ message: "Payment marked as paid", payment });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

/* ======================================================
   UPDATE PAYMENT STATUS (ADMIN)
====================================================== */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    const allowed = ["paid", "due", "overdue"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    payment.status = status;
    payment.paidDate = status === "paid" ? new Date() : undefined;
    await payment.save();

    res.json({ message: "Status updated", payment });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

/* ======================================================
   SEND PAYMENT REMINDER (ADMIN / MANAGER)
====================================================== */
export const sendReminder = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const payment = await Payment.findById(paymentId).populate("siteId");
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const clients = await User.find({
      companyName: payment.companyName,
      role: "CLIENT",
      siteAccess: payment.siteId._id
    });

    for (const client of clients) {
      await sendEmail(
        client.email,
        `Payment Reminder - ${payment.title}`,
        `<p>Dear ${client.name}, payment of ₹${payment.amount} is pending.</p>`
      );
    }

    res.json({ message: "Reminder sent", count: clients.length });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

/* ======================================================
   DOWNLOAD INVOICE (PDF)
====================================================== */
export const downloadInvoice = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId).populate("siteId");
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${payment._id}.pdf`
    );

    doc.pipe(res);
    doc.fontSize(20).text("PAYMENT RECEIPT", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Project: ${payment.siteId.name}`);
    doc.text(`Amount: ₹${payment.amount}`);
    doc.text(`Status: ${payment.status}`);
    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Error generating invoice", error: err.message });
  }
};

/* ======================================================
   DELETE PAYMENT (ADMIN)
====================================================== */
export const deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can delete payment" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await payment.deleteOne();
    res.json({ message: "Payment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting payment", error: err.message });
  }
};
