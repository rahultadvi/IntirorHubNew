import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  X,
  Loader2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { paymentApi } from "../services/api";
import type { PaymentDto } from "../services/api";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Payments: React.FC = () => {
  const { activeSite } = useSite();
  const { user, token } = useAuth();
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [remindingPaymentId, setRemindingPaymentId] = useState<string | null>(null);
  const [reminderModal, setReminderModal] = useState<{ show: boolean; message?: string }>({ show: false });
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'NEFT'>('Bank Transfer');
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    dueDate: "",
  });

  const isAdmin = (user?.role ?? '').toString().toUpperCase() === 'ADMIN';
  const isManager = user?.role === "MANAGER";
  const canManagePayments = isAdmin || isManager;

  const isLoadingRef = useRef(false);
  const lastSiteIdRef = useRef<string | null>(null);

  const loadPayments = async () => {
    if (!activeSite || !token || isLoadingRef.current) return;

    // Prevent duplicate calls for the same site
    if (lastSiteIdRef.current === activeSite.id) {
      return;
    }

    try {
      isLoadingRef.current = true;
      lastSiteIdRef.current = activeSite.id;
      setLoading(true);
      const response = await paymentApi.getPaymentsBySite(activeSite.id, token);
      setPayments(response.payments);
    } catch (error) {
      console.error("Error loading payments:", error);
      lastSiteIdRef.current = null; // Reset on error to allow retry
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  useEffect(() => {
    if (activeSite?.id && token) {
      // Reset if site ID changed
      if (lastSiteIdRef.current !== activeSite.id) {
        lastSiteIdRef.current = null;
      }
      loadPayments();
    }
  }, [activeSite?.id, token]);



  const location = useLocation();
  const navigate = useNavigate();

  const closeAddModal = () => {
    setShowAddForm(false);
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('openAdd')) {
        navigate(location.pathname, { replace: true });
      }
    } catch (e) { }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('openAdd')) setShowAddForm(true);
    } catch (e) { }
    const handler = () => setShowAddForm(true);
    window.addEventListener('open-add-payment', handler as EventListener);
    return () => window.removeEventListener('open-add-payment', handler as EventListener);
  }, [location.search]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite || !token || !isAdmin) return;

    try {
      await paymentApi.addPayment(
        {
          title: formData.title,
          description: formData.description,
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate,
          siteId: activeSite.id,
        },
        token
      );

      setFormData({ title: "", description: "", amount: "", dueDate: "" });
      closeAddModal();
      lastSiteIdRef.current = null; // Reset to allow reload
      loadPayments();
    } catch (error) {
      console.error("Error adding payment:", error);
      showToast("Failed to add payment", "error");
    }
  };

  const handleMarkPaidClick = (paymentId: string) => {
    if (!token || !isAdmin) return;
    setSelectedPaymentId(paymentId);
    setPaymentMethod('Bank Transfer'); // Reset to default
    setShowPaymentMethodModal(true);
  };

  const handleMarkPaid = async () => {
    if (!token || !isAdmin || !selectedPaymentId) return;

    try {
      await paymentApi.markAsPaid(selectedPaymentId, paymentMethod, token);
      setShowPaymentMethodModal(false);
      setSelectedPaymentId(null);
      lastSiteIdRef.current = null; // Reset to allow reload
      loadPayments();
      showToast("Payment marked as paid", "success");
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      showToast("Failed to mark payment as paid", "error");
    }
  };

  const handleClosePaymentMethodModal = () => {
    setShowPaymentMethodModal(false);
    setSelectedPaymentId(null);
    setPaymentMethod('Bank Transfer');
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!token || !isAdmin) return;

    const ok = window.confirm("Are you sure you want to delete this payment?");
    if (!ok) return;

    try {
      await paymentApi.deletePayment(paymentId, token);
      showToast("Payment deleted", "success");
      lastSiteIdRef.current = null; // Reset to allow reload
      loadPayments();
    } catch (error) {
      console.error("Delete failed", error);
      showToast("Failed to delete payment", "error");
    }
  };



  const handleRemind = async (paymentId: string) => {
    if (!token || !canManagePayments) return;

    try {
      setRemindingPaymentId(paymentId);
      const response = await paymentApi.sendReminder(paymentId, token);
      setReminderModal({ show: true, message: response.message || "Reminder sent" });
      setTimeout(() => setReminderModal({ show: false }), 2500);
    } catch (error) {
      console.error("Error sending reminder:", error);
      showToast("Failed to send reminder", "error");
    }
    finally {
      setRemindingPaymentId(null);
    }
  };

  const handleDownloadInvoice = async (paymentId: string) => {
    if (!token) return;
    
    const payment = payments.find(p => p._id === paymentId);
    if (!payment) {
      showToast("Payment not found", "error");
      return;
    }

    try {
      // Create a hidden div for receipt rendering
      const receiptDiv = document.createElement('div');
      receiptDiv.style.position = 'absolute';
      receiptDiv.style.left = '-9999px';
      receiptDiv.style.width = '800px';
      receiptDiv.style.padding = '40px';
      receiptDiv.style.backgroundColor = '#ffffff';
      receiptDiv.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      
      // Use stored payment method or default to 'Bank Transfer'
      const receiptPaymentMethod = payment.paymentMethod || 'Bank Transfer';
      
      receiptDiv.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 0;">
          <!-- Header with Company Name -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 48px; border-radius: 12px 12px 0 0; color: white;">
            <h2 style="font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: 0.5px;">${activeSite?.name || 'Company Name'}</h2>
            <p style="font-size: 14px; margin: 0; opacity: 0.95;">Payment Receipt</p>
          </div>
          
          <!-- Receipt Content -->
          <div style="padding: 48px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <!-- Receipt Title -->
            <div style="text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb;">
              <h1 style="font-size: 36px; font-weight: 700; color: #111827; margin: 0 0 8px 0; letter-spacing: 1px;">PAYMENT RECEIPT</h1>
              <p style="font-size: 16px; color: #6b7280; margin: 0;">Official Payment Confirmation</p>
            </div>
            
            <!-- Receipt Details -->
            <div style="margin-bottom: 32px;">
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Receipt Number:</div>
                <div style="font-weight: 600; color: #111827; font-size: 14px; text-align: right; letter-spacing: 0.5px;">#${payment._id.slice(-8).toUpperCase()}</div>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Payment Title:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right;">${payment.title || 'N/A'}</div>
              </div>
              ${payment.description ? `
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Description:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right; max-width: 60%;">${payment.description}</div>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Site/Project:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right;">${activeSite?.name || 'N/A'}</div>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Due Date:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right;">${new Date(payment.dueDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}</div>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Payment Made By:</div>
                <div style="font-weight: 600; color: #111827; font-size: 14px; text-align: right; padding: 4px 12px; background: #f3f4f6; border-radius: 6px; display: inline-block;">
                  ${receiptPaymentMethod}
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Status:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right;">
                  <span style="display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; background: ${payment.status === 'paid' ? '#d1fae5' : '#fef3c7'}; color: ${payment.status === 'paid' ? '#059669' : '#d97706'};">
                    ${payment.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 16px 0;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Generated Date:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right;">${new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}</div>
              </div>
            </div>
            
            <!-- Amount Section -->
            <div style="margin-top: 40px; padding: 32px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 2px solid #bae6fd; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 20px; font-weight: 600; color: #0c4a6e;">Amount ${payment.status === 'paid' ? 'Paid' : 'Due'}:</div>
                <div style="font-size: 36px; font-weight: 700; color: #059669; letter-spacing: -0.5px;">${formatCurrency(payment.amount)}</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 48px; padding-top: 32px; border-top: 2px solid #e5e7eb;">
              <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-bottom: 16px;">
                <p style="margin: 0 0 8px 0;">This is a computer-generated receipt. No signature required.</p>
                <p style="margin: 0;">Generated on ${new Date().toLocaleString("en-IN")}</p>
              </div>
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #f3f4f6;">
                <p style="margin: 0; color: #6b7280; font-size: 11px; font-weight: 500; letter-spacing: 0.5px;">Powered by <span style="color: #667eea; font-weight: 600;">SiteZero</span></p>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(receiptDiv);
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Convert to PDF using html2canvas and jsPDF
      const canvas = await html2canvas(receiptDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Clean up
      document.body.removeChild(receiptDiv);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      
      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Payment_Receipt_${payment.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      
      showToast("Receipt downloaded successfully", "success");
    } catch (error) {
      console.error("Error generating receipt:", error);
      showToast("Failed to generate receipt", "error");
    }
  };


  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const showToast = (message: string, type: "info" | "success" | "error" = "info") => {
    try {
      const containerId = "site-zero-toast-container";
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement("div");
        container.id = containerId;
        container.style.position = "fixed";
        container.style.right = "16px";
        container.style.bottom = "16px";
        container.style.zIndex = "9999";
        document.body.appendChild(container);
      }

      const toast = document.createElement("div");
      toast.className = `mb-2 max-w-xs rounded-lg p-3 text-sm shadow-lg text-white`;
      toast.style.opacity = "0";
      toast.style.transition = "opacity 200ms ease, transform 200ms ease";
      toast.style.transform = "translateY(8px)";
      if (type === "success") {
        toast.style.background = "#059669"; // green-600
      } else if (type === "error") {
        toast.style.background = "#dc2626"; // red-600
      } else {
        toast.style.background = "#374151"; // gray-700
      }
      toast.textContent = message;

      container.appendChild(toast);

      // animate in
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
      });

      // remove after 3s
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        setTimeout(() => {
          try {
            container?.removeChild(toast);
          } catch (e) { }
        }, 200);
      }, 3000);
    } catch (e) {
      // fallback
      try {
        // eslint-disable-next-line no-alert
        alert(message);
      } catch (_) { }
    }
  };

  const siteContractValue = activeSite?.contractValue ?? null;
  const contractValue = siteContractValue ?? payments.reduce((sum, p) => sum + p.amount, 0);
  const receivedAmount = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const dueAmount = payments
    .filter((p) => p.status === "due" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = Math.max(0, contractValue - receivedAmount);
  const rawPercent = contractValue > 0 ? Math.round((receivedAmount / contractValue) * 100) : 0;
  const progressPercentage = Math.min(100, Math.max(0, rawPercent));

  return (
    <div className="min-h-screen pt-2  md:px-2">
      <div className="max-w-md mx-auto">

        {payments.length > 0 && (
          <p className="text-xs text-gray-400 mb-6">
            Last updated:{" "}
            {(() => {
              const lastUpdated = payments.reduce((latest, p) => {
                const pDate = new Date(p.updatedAt || p.createdAt || p.dueDate);
                return pDate > latest ? pDate : latest;
              }, new Date(0));

              const now = new Date();
              const diffMs = now.getTime() - lastUpdated.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);

              if (diffMins < 1) return "just now";
              if (diffMins < 60) return `${diffMins} min ago`;
              if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
              if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
              return lastUpdated.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            })()}
          </p>
        )}

        {/* Contract Value, Received, and Due */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 mb-2">CONTRACT VALUE</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(contractValue)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-[10px] font-semibold tracking-wider text-blue-500 mb-2">RECEIVED</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(receivedAmount)}</p>
          </div>
        </div>
        
        {/* Pending and Due Amount */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-[10px] font-semibold tracking-wider text-amber-500 mb-2">PENDING</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(pendingAmount)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-[10px] font-semibold tracking-wider text-rose-500 mb-2">DUE AMOUNT</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(dueAmount)}</p>
          </div>
        </div>

        {/* Payment Progress */}
        <div className="bg-white rounded-3xl p-5 mb-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-slate-700">Payment Progress</span>
            <span className="text-lg font-bold text-slate-800">{progressPercentage}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Stage-wise Payments Title */}
        <h3 className="text-lg font-bold text-slate-800 mb-4">Stage-wise Payments</h3>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading payments...</p>
          </div>
        )}
        {/* Payment Method Selection Modal */}
        {showPaymentMethodModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Select Payment Method</h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Made By:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Bank Transfer' | 'UPI' | 'NEFT')}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-800 font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClosePaymentMethodModal}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaid}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reminder confirmation modal */}
        {reminderModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg mx-4 pointer-events-auto">
              <h3 className="text-md font-semibold mb-1">Reminder sent</h3>
              <p className="text-sm text-gray-600">{reminderModal.message}</p>
            </div>
          </div>
        )}

        {!loading && payments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No payments found</p>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Add First Payment
              </button>
            )}
          </div>
        )}

        {/* Payment Stages */}
        <div className="space-y-9">
          {payments.map((payment) => (
            <div
              key={payment._id}
              className="relative bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
            >{/* 3 DOT MENU – ADMIN ONLY */}
              {isAdmin && (
                <div className="absolute top-4 right-1 z-20 transition">
                  <button
                    onClick={() =>
                      setOpenMenuId(openMenuId === payment._id ? null : payment._id)
                    }
                  >
                    <MoreVertical className="w-4 h-5 mt-2 ml-5 text-slate-600" />
                  </button>

                  {openMenuId === payment._id && (
                    <div className="absolute right-0 mt-2 w-36 bg-white border rounded-xl shadow-lg">
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          handleDeletePayment(payment._id);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2    className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-base mb-1">{payment.title}</h4>
                  <p className="text-xs font-semibold text-slate-400 mb-1">{contractValue > 0 ? Math.round((payment.amount / contractValue) * 100) : 0}% of total</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(payment.amount)}</p>
                  {payment.status === "paid" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      PAID
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      DUE
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4 text-left">
                Due: {new Date(payment.dueDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>

              {payment.status === "paid" ? (
                <button
                  onClick={() => handleDownloadInvoice(payment._id)}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:shadow-indigo-200 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download Invoice
                </button>
              ) : (
                <div className="flex gap-3">
                  {isAdmin && (
                    <button
                      onClick={() => handleMarkPaidClick(payment._id)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap hover:shadow-lg hover:shadow-blue-200 transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Mark Paid</span>
                    </button>
                  )}
                  {canManagePayments && (
                    <button
                      onClick={() => handleRemind(payment._id)}
                      disabled={remindingPaymentId === payment._id}
                      className={`$
                        isAdmin ? "flex-1" : "w-full"
                      } bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all ${remindingPaymentId === payment._id ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      {remindingPaymentId === payment._id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {remindingPaymentId === payment._id ? 'Sending...' : 'Remind'}
                    </button>
                  )}
                  {!canManagePayments && (
                    <button
                      onClick={() => handleDownloadInvoice(payment._id)}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:shadow-indigo-200 transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Download Invoice
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Payment Modal */}
        {showAddForm && isAdmin && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeAddModal();
              }
            }}
          >
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Payment</h3>
                <button
                  onClick={() => closeAddModal()}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Initial Deposit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Payment details"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent "
                    placeholder="500000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => closeAddModal()}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                  >
                    Add Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            title="Add Payment"
            className={`
              fixed
              bottom-24
              right-5
              z-50
              p-4
              bg-black
              hover:bg-gray-900
              text-white
              rounded-full
              shadow-xl
              transition
              active:scale-95
            `}
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Payments;
