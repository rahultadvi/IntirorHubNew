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
    const { paymentMethod, paymentDate } = req.body;

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    payment.status = "paid";
    // Use provided paymentDate or default to current date
    payment.paidDate = paymentDate ? new Date(paymentDate) : new Date();
    // Store payment method if provided
    if (paymentMethod) {
      payment.paymentMethod = paymentMethod;
    }
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

    const siteName = payment.siteId.name || "Project";
    const companyName = payment.companyName || "";
    const formattedAmount = payment.amount.toLocaleString("en-IN");
    const dueDate = new Date(payment.dueDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    for (const client of clients) {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Reminder - ${payment.title}</title>
          </head>
          <body style="margin:0;padding:0;background-color:#f8f9fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
                    max-width:600px;
                    background-color:#ffffff;
                    border-radius:16px;
                    padding:40px 32px;
                    box-shadow:0 10px 30px rgba(0,0,0,0.1);
                    border:1px solid #e9ecef;
                  ">
                    <tr>
                      <td align="center" style="padding-bottom:32px;">
                        <div style="
                          font-size:28px;
                          font-weight:800;
                          letter-spacing:-0.5px;
                          color:#1a1a1a;
                          text-transform:uppercase;
                          border-bottom:3px solid #dc2626;
                          padding-bottom:12px;
                          display:inline-block;
                        ">
                          SiteZero
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:28px;">
                        <h1 style="
                          font-size:24px;
                          margin:0 0 12px 0;
                          color:#212529;
                          font-weight:600;
                        ">
                          Payment Reminder
                        </h1>
                        <p style="
                          margin:0 0 20px;
                          color:#6c757d;
                          font-size:16px;
                          line-height:1.6;
                        ">
                          Dear <strong>${client.name || "Valued Client"}</strong>,
                        </p>
                        <p style="
                          margin:0 0 20px;
                          color:#495057;
                          font-size:16px;
                          line-height:1.6;
                        ">
                          This is a friendly reminder regarding your pending payment.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:24px;">
                        <div style="
                          background:linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                          border-radius:12px;
                          padding:24px;
                          border:1px solid #fecaca;
                          box-shadow:0 4px 12px rgba(0,0,0,0.05);
                        ">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-bottom:16px;">
                                <p style="margin:0 0 8px;font-weight:600;font-size:14px;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">Payment Details</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-bottom:12px;border-bottom:1px solid #fecaca;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding:8px 0;">
                                      <span style="font-weight:600;color:#374151;font-size:14px;">Site/Project:</span>
                                    </td>
                                    <td align="right" style="padding:8px 0;">
                                      <span style="font-weight:600;color:#1f2937;font-size:14px;">${siteName}${companyName ? ` By ${companyName}` : ''}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-bottom:12px;border-bottom:1px solid #fecaca;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding:8px 0;">
                                      <span style="font-weight:600;color:#374151;font-size:14px;">Payment Title:</span>
                                    </td>
                                    <td align="right" style="padding:8px 0;">
                                      <span style="font-weight:600;color:#1f2937;font-size:14px;">${payment.title}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            ${payment.description ? `
                            <tr>
                              <td style="padding-bottom:12px;border-bottom:1px solid #fecaca;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding:8px 0;">
                                      <span style="font-weight:600;color:#374151;font-size:14px;">Description:</span>
                                    </td>
                                    <td align="right" style="padding:8px 0;">
                                      <span style="color:#1f2937;font-size:14px;">${payment.description}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td style="padding-bottom:12px;border-bottom:1px solid #fecaca;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding:8px 0;">
                                      <span style="font-weight:600;color:#374151;font-size:14px;">Due Date:</span>
                                    </td>
                                    <td align="right" style="padding:8px 0;">
                                      <span style="font-weight:600;color:#dc2626;font-size:14px;">${dueDate}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-top:16px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td>
                                      <span style="font-weight:600;color:#374151;font-size:14px;">Amount Due:</span>
                                    </td>
                                    <td align="right">
                                      <span style="
                                        font-size:28px;
                                        font-weight:700;
                                        color:#dc2626;
                                        letter-spacing:-0.5px;
                                      ">₹${formattedAmount}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:24px;">
                        <p style="
                          margin:0;
                          color:#495057;
                          font-size:15px;
                          line-height:1.6;
                        ">
                          Please make the payment at your earliest convenience to avoid any inconvenience.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="
                        padding-top:20px;
                        font-size:14px;
                        color:#adb5bd;
                        line-height:1.5;
                        border-top:1px solid #e9ecef;
                        padding-top:24px;
                      ">
                        <p style="margin:0 0 8px;">
                          If you have any questions, please contact us.
                        </p>
                        <p style="margin:0;">
                          Thank you for your prompt attention to this matter.
                        </p>
                        <p style="margin:12px 0 0;color:#6b7280;font-size:13px;">
                          Best regards,<br>
                          <strong style="color:#1f2937;">${companyName || 'SiteZero'} Team</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      await sendEmail(
        client.email,
        `Payment Reminder - ${payment.title}`,
        html
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
