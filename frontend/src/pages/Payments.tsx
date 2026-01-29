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
  Share2,
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
  const [paymentDate, setPaymentDate] = useState("");
  const [selectedPaymentAmount, setSelectedPaymentAmount] = useState<number>(0);
  const [downloadingPaymentId, setDownloadingPaymentId] = useState<string | null>(null);
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
    const payment = payments.find(p => p._id === paymentId);
    setSelectedPaymentId(paymentId);
    setPaymentMethod('Bank Transfer'); // Reset to default
    setPaymentDate(new Date().toISOString().split('T')[0]); // Set today's date as default
    setSelectedPaymentAmount(payment?.amount || 0);
    setShowPaymentMethodModal(true);
  };

  const handleMarkPaid = async () => {
    if (!token || !isAdmin || !selectedPaymentId || !paymentDate) {
      showToast("Please select a payment date", "error");
      return;
    }

    try {
      await paymentApi.markAsPaid(selectedPaymentId, paymentMethod, paymentDate, token);
      setShowPaymentMethodModal(false);
      setSelectedPaymentId(null);
      setPaymentDate("");
      setPaymentMethod('Bank Transfer');
      setSelectedPaymentAmount(0);
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
    setPaymentDate("");
    setSelectedPaymentAmount(0);
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

  // Helper function to generate PDF blob
  const generatePDFBlob = async (payment: PaymentDto): Promise<Blob> => {
    // Create a hidden div for receipt rendering
    const receiptDiv = document.createElement('div');
    receiptDiv.style.position = 'absolute';
    receiptDiv.style.left = '-9999px';
    receiptDiv.style.width = '100%';
    receiptDiv.style.maxWidth = '210mm'; // A4 width
    receiptDiv.style.padding = '0';
    receiptDiv.style.backgroundColor = '#ffffff';
    receiptDiv.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    
    // Use stored payment method or default to 'Bank Transfer'
    const receiptPaymentMethod = payment.paymentMethod || 'Bank Transfer';
    
    const siteName = activeSite?.name || 'N/A';
    const companyName = user?.companyName || '';
    const companyLogo = user?.companyLogo || '';
    const logoUrl = companyLogo ? (companyLogo.startsWith('http') ? companyLogo : `${import.meta.env.VITE_BACKEND_URL}${companyLogo}`) : '';
    
    // Get payment date - use paidDate if paid, otherwise use current date
    const paymentDate = payment.status === 'paid' && payment.paidDate 
      ? new Date(payment.paidDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        })
      : new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
    
    // Dummy logo SVG if no logo present
    const logoText = (companyName || 'LOGO').substring(0, 8).toUpperCase();
    const dummyLogoSvg = `<svg width="120" height="60" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="60" fill="#1e293b" rx="8"/><text x="60" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">${logoText}</text></svg>`;
    const dummyLogo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dummyLogoSvg)}`;
    
    receiptDiv.innerHTML = `
      <div style="width: 100%; margin: 0; background: white; padding: 0; border: none;">
        <!-- Professional Header with Logo at Top Right -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding: 0;">
            <!-- Left Side: Payment Receipt Title -->
            <div style="flex: 1;">
              <h1 style="font-size: 26px; font-weight: 800; margin: 0 0 4px 0; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Payment Receipt</h1>
              <div style="width: 50px; height: 3px; background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%); margin-top: 6px; border-radius: 2px;"></div>
            </div>
            <!-- Right Side: Logo at Top -->
            <div style="flex-shrink: 0; margin-left: 24px;">
              ${logoUrl ? `
                <img src="${logoUrl}" alt="${companyName}" crossorigin="anonymous" style="max-height: 60px; max-width: 140px; object-fit: contain; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
              ` : `
                <img src="${dummyLogo}" alt="Company Logo" style="max-height: 60px; max-width: 140px; object-fit: contain; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
              `}
            </div>
          </div>
          <!-- Site and Company Info Row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 12px; padding: 0;">
            <div style="flex: 1;">
              <div style="margin-bottom: 6px;">
                <p style="font-size: 10px; margin: 0 0 1px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Site / Project</p>
                <p style="font-size: 15px; font-weight: 700; margin: 0; color: #0f172a; line-height: 1.2;">${siteName}</p>
              </div>
              <div>
                <p style="font-size: 10px; margin: 0 0 1px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Company</p>
                <p style="font-size: 13px; margin: 0; color: #475569; font-weight: 600;">${companyName || 'N/A'}</p>
              </div>
            </div>
            <!-- Payment Date on Right -->
            <div style="flex-shrink: 0; margin-left: 24px; text-align: right; padding: 8px 16px; border-radius: 6px; border: none; box-shadow: none;">
              <p style="font-size: 9px; margin: 0 0 3px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Date</p>
              <p style="font-size: 12px; margin: 0; color: #0f172a; font-weight: 700;">${paymentDate}</p>
            </div>
          </div>
        </div>
        
        <!-- Receipt Content -->
        <div style="padding: 32px 0; border: none;">
          <!-- From and Billed To Section -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; padding: 0 40px 18px 40px; border-bottom: 1px solid #e5e7eb;">
            <!-- From Section -->
            <div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: none;">
              <p style="font-size: 18px; margin: 0 0 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">From</p>
              <p style="font-size: 14px; margin: 0; color: #0f172a; font-weight: 700; line-height: 1.3;">${companyName || 'N/A'}</p>
            </div>
            <!-- Billed To Section -->
            <div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: none;">
              <p style="font-size: 18px; margin: 0 0 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Billed To</p>
              <p style="font-size: 14px; margin: 0; color: #0f172a; font-weight: 700; line-height: 1.3;">${activeSite?.clientEmail || 'N/A'}</p>
              ${activeSite?.clientPhone ? `
                <p style="font-size: 11px; margin: 3px 0 0 0; color: #64748b; font-weight: 500;">${activeSite.clientPhone}</p>
              ` : ''}
            </div>
          </div>
          
          <!-- Receipt Details -->
          <div style="margin-bottom: 24px; padding: 0;">
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18px;">Receipt Number:</div>
              <div style="font-weight: 600; color: #111827; font-size: 18px; text-align: right; letter-spacing: 0.5px;">#${payment._id.slice(-8).toUpperCase()}</div>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18px;">Payment Title:</div>
              <div style="font-weight: 500; color: #111827; font-size: 18px; text-align: right;">${payment.title || 'N/A'}</div>
            </div>
            ${payment.description ? `
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18px;">Description:</div>
              <div style="font-weight: 500; color: #111827; font-size: 18px; text-align: right; max-width: 60%;">${payment.description}</div>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18px;">Site/Project:</div>
              <div style="font-weight: 500; color: #111827; font-size: 18px; text-align: right;">${activeSite?.name || 'N/A'}</div>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18px;">Due Date:</div>
              <div style="font-weight: 500; color: #111827; font-size: 18px; text-align: right;">${new Date(payment.dueDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              })}</div>
            </div>
            ${payment.status === 'paid' && payment.paidDate ? `
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18px;">Payment Date:</div>
              <div style="font-weight: 600; color: #059669; font-size: 18px; text-align: right;">${new Date(payment.paidDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              })}</div>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18px;">Payment Made By:</div>
              <div style="font-weight: 600; color: #111827; font-size: 18px; text-align: right; padding: 3px 10px; border-radius: 4px; display: inline-block;">
                ${receiptPaymentMethod}
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18px;">Status:</div>
              <div style="font-weight: 500; color: #111827; font-size: 18px; text-align: right;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${payment.status === 'paid' ? '#059669' : '#d97706'};">
                  ${payment.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0;">
              <div style="font-weight: 600; color: #6b7280; font-size: 18
              <div style="font-weight: 500; color: #111827; font-size: 18px; text-align: right;">${new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              })}</div>
            </div>
          </div>
          
          <!-- Amount Section -->
          <div style="margin-top: 24px; padding: 16px 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 6px; border: none; box-shadow: none; margin-left: 40px; margin-right: 40px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 18px; font-weight: 600; color: #0c4a6e;">Amount ${payment.status === 'paid' ? 'Paid' : 'Due'}:</div>
              <div style="font-size: 24px; font-weight: 700; color: #059669; letter-spacing: -0.5px;">${formatCurrency(payment.amount)}</div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center; color: #9ca3af; font-size: 18px; margin-bottom: 8px;">
              <p style="margin: 0 0 4px 0;">This is a computer-generated receipt. No signature required.</p>
              <p style="margin: 0;">Generated on ${new Date().toLocaleString("en-IN")}</p>
            </div>
            <div style="text-align: center; padding-top: 12px; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; color: #6b7280; font-size: 18px; font-weight: 500; letter-spacing: 0.5px;">Powered by <span style="color: #667eea; font-weight: 600;">SiteZero</span></p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(receiptDiv);
    
    // Wait for rendering and logo to load
    await new Promise((resolve) => {
      const img = receiptDiv.querySelector('img') as HTMLImageElement;
      if (img) {
        // Set crossOrigin for CORS if it's not a data URI
        if (!img.src.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        
        if (img.complete && img.naturalWidth > 0) {
          // Image already loaded successfully
          setTimeout(resolve, 300);
        } else if (img.src.startsWith('data:')) {
          // Data URI loads immediately
          setTimeout(resolve, 200);
        } else {
          // Wait for image to load
          const timeout = setTimeout(() => {
            resolve(null);
          }, 5000); // Max 5 second wait
          
          img.onload = () => {
            clearTimeout(timeout);
            setTimeout(resolve, 300);
          };
          img.onerror = () => {
            clearTimeout(timeout);
            // Replace with dummy logo if real logo fails
            const logoText = (companyName || 'LOGO').substring(0, 8).toUpperCase();
            const dummyLogoSvg = `<svg width="120" height="60" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="60" fill="#1e293b" rx="8"/><text x="60" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">${logoText}</text></svg>`;
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dummyLogoSvg)}`;
            setTimeout(resolve, 200);
          };
        }
      } else {
        setTimeout(resolve, 200);
      }
    });
    
    // Convert to PDF using html2canvas and jsPDF
    const canvas = await html2canvas(receiptDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Ensure images are loaded in cloned document
        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img) => {
          if (img.complete && img.naturalWidth === 0) {
            // Image failed to load, hide it
            (img as HTMLElement).style.display = 'none';
          }
        });
      }
    });
    
    // Clean up
    document.body.removeChild(receiptDiv);
    
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Define margins to avoid cut edges - optimized for single page
    const marginTop = 8; // mm - minimal top margin
    const marginBottom = 15; // mm - space for footer
    const marginLeft = 10; // mm
    const marginRight = 10; // mm
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pdfWidth - marginLeft - marginRight;
    const contentHeight = pdfHeight - marginTop - marginBottom;
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Convert pixels to mm (96 DPI = 0.264583 mm per pixel)
    const pixelsToMm = 0.264583;
    const imgWidthMm = imgWidth * pixelsToMm;
    const imgHeightMm = imgHeight * pixelsToMm;
    
    // Calculate ratio to fit content width
    const ratio = contentWidth / imgWidthMm;
    const scaledWidth = contentWidth;
    const scaledHeight = imgHeightMm * ratio;
    
    // Calculate total pages needed
    const totalPages = Math.ceil(scaledHeight / contentHeight) || 1;

    const generatedDateTime = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

 

    // Helper function to add footer on each page
    const addFooter = (pageNum: number) => {
      const footerY = pdfHeight - marginBottom + 12;
      
      // Footer line
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.5);
      pdf.line(marginLeft, footerY - 8, pdfWidth - marginRight, footerY - 8);
      
      // Footer text
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.setFont('helvetica', 'normal');
      
      // Left side
      pdf.text('Generated by SiteZero', marginLeft, footerY);
      
      // Right side - Page number
      const pageText = `Page ${pageNum} of ${totalPages}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, pdfWidth - marginRight - pageTextWidth, footerY);
      
      // Center - Generated time (if space allows)
      const timeText = generatedDateTime;
      const timeTextWidth = pdf.getTextWidth(timeText);
      if (timeTextWidth < contentWidth * 0.7) {
        pdf.text(timeText, (pdfWidth - timeTextWidth) / 2, footerY + 4);
      }
    };

    // Add image across multiple pages
    let imgY = marginTop;
    let remainingHeight = scaledHeight;
    let currentPage = 1;
    let sourceY = 0;

    while (remainingHeight > 0) {
      // Add footer before adding content
      addFooter(currentPage);
      
      // Calculate how much of the image fits on this page
      const availableHeight = contentHeight;
      const imageHeightForThisPage = Math.min(remainingHeight, availableHeight);
      
      // Calculate source position in pixels
      const sourceHeightPx = imageHeightForThisPage / ratio / pixelsToMm;
      
      // Create a temporary canvas for this page's portion
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidth;
      pageCanvas.height = Math.ceil(sourceHeightPx);
      const pageCtx = pageCanvas.getContext('2d');
      
      if (pageCtx) {
        // Draw the portion of the original canvas
        pageCtx.drawImage(
          canvas,
          0, sourceY, // source x, y
          imgWidth, sourceHeightPx, // source width, height
          0, 0, // destination x, y
          imgWidth, sourceHeightPx // destination width, height
        );
      }
      
      const pageImgData = pageCanvas.toDataURL('image/png');
      
      // Add the image portion to PDF
      pdf.addImage(pageImgData, 'PNG', marginLeft, imgY, scaledWidth, imageHeightForThisPage, undefined, 'FAST');
      
      // Update for next iteration
      remainingHeight -= availableHeight;
      sourceY += sourceHeightPx;
      
      if (remainingHeight > 0) {
        pdf.addPage();
        currentPage++;
        imgY = marginTop;
      }
    }
    
    // Return PDF as blob
    return pdf.output('blob');
  };

  const handleDownloadInvoice = async (paymentId: string) => {
    if (!token) return;
    
    const payment = payments.find(p => p._id === paymentId);
    if (!payment) {
      showToast("Payment not found", "error");
      return;
    }

    try {
      setDownloadingPaymentId(paymentId);
      const pdfBlob = await generatePDFBlob(payment);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payment_Receipt_${payment.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast("Receipt downloaded successfully", "success");
    } catch (error) {
      console.error("Error generating receipt:", error);
      showToast("Failed to generate receipt", "error");
    } finally {
      setDownloadingPaymentId(null);
    }
  };

  const handleShareInvoice = async (paymentId: string) => {
    if (!token) return;
    
    const payment = payments.find(p => p._id === paymentId);
    if (!payment) {
      showToast("Payment not found", "error");
      return;
    }

    try {
      const pdfBlob = await generatePDFBlob(payment);
      const fileName = `Payment_Receipt_${payment.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // Check if Web Share API is available (mobile browsers)
      if (navigator.share) {
        try {
          // Try sharing with file (works on mobile)
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Payment Receipt - ${payment.title}`,
              text: `Payment Receipt for ${payment.title} - ${formatCurrency(payment.amount)}`
            });
            showToast("Receipt shared successfully", "success");
            return;
          }
        } catch (shareError) {
          // If file sharing fails, try text-only sharing
          console.log("File sharing not supported, trying text share");
        }
        
        // Fallback: Share text with download link
        try {
          const message = `Payment Receipt for ${payment.title}\nAmount: ${formatCurrency(payment.amount)}\nStatus: ${payment.status.toUpperCase()}\n\nPlease download the PDF receipt.`;
          await navigator.share({
            title: `Payment Receipt - ${payment.title}`,
            text: message
          });
          // Also trigger download
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
          showToast("Receipt shared. PDF downloaded.", "success");
          return;
        } catch (textShareError) {
          console.log("Text sharing also failed");
        }
      }
      
      // Fallback for desktop: Open WhatsApp Web with message and download PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const message = `Payment Receipt for ${payment.title}\nAmount: ${formatCurrency(payment.amount)}\nStatus: ${payment.status.toUpperCase()}\n\nPlease download the attached PDF receipt.`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');
      
      // Also trigger download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
      
      showToast("Opening WhatsApp... PDF downloaded. Attach it manually.", "info");
    } catch (error) {
      console.error("Error sharing receipt:", error);
      // If share fails, fallback to download
      if (error instanceof Error && error.name !== 'AbortError') {
        showToast("Sharing not supported. Downloading instead...", "info");
        handleDownloadInvoice(paymentId);
      }
    }
  };


  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  // Helper function to check if a payment is overdue
  const isPaymentOverdue = (payment: PaymentDto): boolean => {
    if (payment.status === "paid") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
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
  // Calculate overdue amount - only payments where due date has passed
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
  const overdueAmount = payments
    .filter((p) => {
      const dueDate = new Date(p.dueDate);
      dueDate.setHours(0, 0, 0, 0); // Reset time to start of day
      const isPastDue = dueDate < today;
      const isUnpaid = p.status === "due" || p.status === "overdue";
      return isUnpaid && isPastDue;
    })
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
            <p className="text-[10px] font-semibold tracking-wider text-rose-500 mb-2">OVERDUE</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(overdueAmount)}</p>
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
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Mark as Paid</h3>
              
              {/* Amount (Read-only) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount:
                </label>
                <input
                  type="text"
                  value={formatCurrency(selectedPaymentAmount)}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium cursor-not-allowed"
                />
              </div>

              {/* Payment Date */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Date: *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-800 font-medium"
                />
              </div>

              {/* Payment Method */}
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
                  ) : isPaymentOverdue(payment) ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      OVERDUE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      DUE
                    </span>
                  )}
                </div>
              </div>
              <div className="mb-4 space-y-1">
                <p className="text-xs text-slate-500 text-left">
                  Due: {new Date(payment.dueDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {payment.status === "paid" && payment.paidDate && (
                  <p className="text-xs text-emerald-600 font-medium text-left">
                    Paid on: {new Date(payment.paidDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>

              {payment.status === "paid" ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownloadInvoice(payment._id)}
                    disabled={downloadingPaymentId === payment._id}
                    className={`flex-1 bg-black hover:bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-gray-900/50 transition-all ${downloadingPaymentId === payment._id ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {downloadingPaymentId === payment._id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Download
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleShareInvoice(payment._id)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-gray-600/50 transition-all"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  {isAdmin && (
                    <button
                      onClick={() => handleMarkPaidClick(payment._id)}
                      className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap hover:shadow-lg hover:shadow-gray-800/50 transition-all"
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
                      } bg-white border-2 border-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all ${remindingPaymentId === payment._id ? 'opacity-70 cursor-wait' : ''}`}
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
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => handleDownloadInvoice(payment._id)}
                        disabled={downloadingPaymentId === payment._id}
                        className={`flex-1 bg-black hover:bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-gray-900/50 transition-all ${downloadingPaymentId === payment._id ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {downloadingPaymentId === payment._id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5" />
                            Download
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleShareInvoice(payment._id)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-gray-600/50 transition-all"
                      >
                        <Share2 className="w-5 h-5" />
                        Share
                      </button>
                    </div>
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
