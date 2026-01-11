import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Download,
  Share2,
  Pencil,
  Check,
  X,
  Trash2,
  FileText,
  Search,
  ShieldCheck,
  MapPin,
  Image,
  BadgeCheck,
  EllipsisVertical,
  Info,
  Minus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useSite } from "../context/SiteContext";
import {  useAuth } from "../context/AuthContext";
import { boqApi, libraryApi, materialApi, type MaterialDto } from "../services/api";
// import libraryData from "../data/libraryData";
import jsPDF from 'jspdf';
// import BoqLibrary from "../component/BoqLibrary";

interface BOQItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  purchaseRate?: number | null;
  amount: number;
  category: "furniture" | "services";
  comments?: number;
  status?: 'pending' | 'approved' | 'rejected';
  bill?: string | null;
  photo?: string | null;
}

interface Room {
  id: string;
  name: string;
  items: BOQItem[];
  subtotal: number;
}

const BOQ: React.FC = () => {
  // Track which menu is open (by item id)
  // const [activeTab, setActiveTab] = useState(...);
  // const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState<"boq" | "material" | "library">("boq");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // const handleOpenMaterial = (material: any) => {
  //   console.log("Open material:", material);
  //   // future: modal / navigate
  // };

  // // Close menu on outside click
  // useEffect(() => {
  //   if (activeTab === "material") {
  //     setMaterials([
  //       {
  //         id: "1",
  //         name: "Soft Close Hinge",
  //         brand: "Hettich • Sensys 8645i",
  //         cost: 850,
  //         warranty: "5 Years",
  //       },
  //     ]);
  //   }
  // }, [activeTab]);
  // useEffect(() => {
  //   const handleClick = (e: MouseEvent) => {
  //     // Only close if click is outside any menu button or menu
  //     if (!(e.target instanceof HTMLElement)) return;
  //     if (!e.target.closest('.boq-menu-btn') && !e.target.closest('.boq-menu-dropdown')) {
  //       setOpenMenuId(null);
  //     }
  //   };
  //   document.addEventListener('mousedown', handleClick);
  //   return () => document.removeEventListener('mousedown', handleClick);
  // }, []);



  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editedRoomName, setEditedRoomName] = useState<string>("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingPurchaseRate, setEditingPurchaseRate] = useState<Record<string, number | null>>({});
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, 'bill' | 'photo' | null>>({});
  const { activeSite } = useSite();

  const [selectedCategory] = useState<"furniture" | "services" | "all">("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  // const [boqItems, setBoqItems] = useState<any[]>([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  // const [materials, setMaterials] = useState<any[]>([]);
  // const [libraryItems, setLibraryItems] = useState<any[]>([]);
  // Removed unused state variables
const { user, token } = useAuth();

// Material Used – search & category
const [materialSearch, setMaterialSearch] = useState("");
const [materialCategory, setMaterialCategory] = useState<
  "All" | "Finishes" | "Hardware" | "Electrical" | "Electronics"
>("All");

// 🔍 Library search & category (SAFE)
const [librarySearch, setLibrarySearch] = useState("");
const [libraryCategory, setLibraryCategory] = useState<
  "All" | "Furniture" | "Finishes" | "Hardware" | "Electrical"
>("All");


  interface LibraryItem {
  _id: string;
  name: string;
  Category?: string;
  description?: string;
  image?: string;
  ratePerQty: number;
  qty: string | number;
  tag?: string;
}

const [boqItems, setBoqItems] = useState<any[]>([]); // backend dependent, ok
const [materials, setMaterials] = useState<MaterialDto[]>([]);
const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
const [editingMaterial, setEditingMaterial] = useState<MaterialDto | null>(null);
const [materialLoading, setMaterialLoading] = useState(false);

// Library item state for quantity, unit, room selection
const [libraryItemInputs, setLibraryItemInputs] = useState<Record<string, { quantity: number; unit: string; room: string }>>({});
const [editingLibraryRate, setEditingLibraryRate] = useState<string | null>(null);
const [editingLibraryRateValue, setEditingLibraryRateValue] = useState<string>("");

const fetchLibraryItems = async () => {
  if (!token) {
    console.log("⛔ Token not ready yet");
    return;
  }

  try {
    const res = await libraryApi.getLibraryItems(token, {
      category: libraryCategory === "All" ? undefined : libraryCategory,
      search: librarySearch || undefined,
    });

    console.log("✅ Library Response:", res);

    // ✅ API TYPE MATCH
    setLibraryItems(res.items);
  } catch (error) {
    console.error("❌ Failed to fetch library", error);
    setLibraryItems([]);
  }
};



useEffect(() => {
  if (activeTab === "library" && token) {
    fetchLibraryItems();
  }
}, [activeTab, libraryCategory, librarySearch, token]);


  const [boqForm, setBoqForm] = useState({
    roomName: '',
    itemName: '',
    quantity: '',
    unit: 'Sq.ft',
    rate: '',
    comments: '',
    referenceImage: null as File | null,
  });

  // Role-based permissions
  const canAddItems = user && ['ADMIN', 'MANAGER', 'AGENT'].includes(user.role);
  const isAdmin = user?.role === 'ADMIN';

  const allRoomNames = useMemo(() => {
    const roomNames = new Set<string>();
    boqItems.forEach((item: any) => {
      roomNames.add(item.roomName);
    });
    return Array.from(roomNames);
  }, [boqItems]);


  const rooms = useMemo(() => {
    const roomMap: { [key: string]: Room } = {};

    // First, initialize all rooms from allRoomNames
    allRoomNames.forEach((roomName) => {
      roomMap[roomName] = {
        id: roomName.toLowerCase().replace(/\s+/g, '-'),
        name: roomName,
        items: [],
        subtotal: 0,
      };
    });

    // Then add items to the rooms
    boqItems
      .filter((item: any) => item.itemName !== 'Room Added') // Exclude dummy room items
      .forEach((item: any) => {
        const roomName = item.roomName;
        if (roomMap[roomName]) {
          // Calculate amount using purchaseRate if available, otherwise use rate
          const effectiveRate = (item.purchaseRate !== null && item.purchaseRate !== undefined) 
            ? item.purchaseRate 
            : item.rate;
          const calculatedAmount = item.quantity * effectiveRate;
          
          roomMap[roomName].items.push({
            id: item._id,
            name: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            purchaseRate: item.purchaseRate || null,
            amount: calculatedAmount, // Use calculated amount based on purchaseRate if available
            category: 'furniture', // TODO: determine from item or add to backend
            comments: item.comments,
            status: item.status,
            bill: item.bill || null,
            photo: item.photo || null,
          });
          roomMap[roomName].subtotal += calculatedAmount;
        }
      });

    return Object.values(roomMap);
  }, [boqItems]);



// Fetch BOQ items when site or token changes
useEffect(() => {
  if (activeSite && token) {
    fetchBOQItems();
  }
}, [activeSite, token]);

// Track if materials have been fetched for current site/tab combination
const [materialsFetched, setMaterialsFetched] = useState<string | null>(null);

// Fetch materials only when material tab becomes active (controlled)
useEffect(() => {
  // Create a unique key for current site/tab combination
  const fetchKey = activeSite?.id && activeTab === "material" ? `${activeSite.id}-material` : null;
  
  if (fetchKey && fetchKey !== materialsFetched && activeSite && token) {
    fetchMaterials();
    setMaterialsFetched(fetchKey);
  } else if (activeTab !== "material") {
    // Reset flag when switching away from material tab
    setMaterialsFetched(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeTab, activeSite?.id]); // Only depend on activeTab and site ID to prevent unnecessary API calls

// Refetch materials when explicitly needed (after add/update/delete)
const refetchMaterials = () => {
  if (activeSite && token && activeTab === "material") {
    fetchMaterials();
  }
};

// Material form state
const [materialForm, setMaterialForm] = useState({
  category: "Finishes" as "Finishes" | "Hardware" | "Electrical" | "Electronics",
  name: "",
  description: "",
  installedAt: "",
  vendorName: "",
  vendorCity: "",
  cost: "",
  warrantyDuration: "",
  warrantyModel: "",
  warrantySince: "",
  invoice: null as File | null,
  photo: null as File | null,
  warrantyDoc: null as File | null,
});

 const fetchBOQItems = async () => {
  if (!token || !activeSite) return;

  try {
    const response = await boqApi.getBOQItemsBySite(activeSite.id, token);
    const { boqItems } = response as {
      boqItems: Record<string, any[]>;
      stats: any;
    };

    setBoqItems(Object.values(boqItems || {}).flat());
  } catch (error) {
    console.error("Failed to fetch BOQ items", error);
    setBoqItems([]);
  }
};


const handleAddRoom = async () => {
  if (!newRoomName.trim()) return;
  if (!token || !activeSite) return;

  const dummyItem = {
    roomName: newRoomName,
    itemName: "Room Added",
    quantity: 1,
    unit: "Nos",
    rate: 0,
    totalCost: 0,
    comments: "",
    siteId: activeSite.id,
  };

  await boqApi.addBOQItem(dummyItem, token);
  setNewRoomName("");
  setShowAddRoomModal(false);
  fetchBOQItems();
};

const handleUpdateBOQItem = async (itemId: string, quantity?: number, purchaseRate?: number | null) => {
  if (!token || !isAdmin) return;
  
  try {
    setUpdatingItemId(itemId);
    const updateBody: { quantity?: number; purchaseRate?: number | null } = {};
    if (quantity !== undefined) updateBody.quantity = quantity;
    if (purchaseRate !== undefined) updateBody.purchaseRate = purchaseRate;
    
    await boqApi.updateBOQItem(itemId, updateBody, token);
    await fetchBOQItems();
    setEditingPurchaseRate({});
  } catch (error) {
    console.error("Failed to update BOQ item", error);
    alert("Failed to update BOQ item. Please try again.");
  } finally {
    setUpdatingItemId(null);
  }
};

const handleUploadBOQFile = async (itemId: string, file: File, type: 'bill' | 'photo') => {
  if (!token || !isAdmin) return;
  
  try {
    setUploadingFiles((prev) => ({ ...prev, [itemId]: type }));
    const formData = new FormData();
    formData.append(type, file);
    
    await boqApi.updateBOQItemFiles(itemId, formData, token);
    await fetchBOQItems();
    setUploadingFiles((prev) => ({ ...prev, [itemId]: null }));
  } catch (error) {
    console.error("Failed to upload file", error);
    alert("Failed to upload file. Please try again.");
    setUploadingFiles((prev) => ({ ...prev, [itemId]: null }));
  }
};


const handleSubmitBOQItem = async (
  e?: React.FormEvent,
  keepModalOpen = false
) => {
  e?.preventDefault();

  // 🔐 Auth & site validation
  if (!token || !activeSite) {
    console.error("Token or active site missing");
    return;
  }

  // ✅ Basic validation
  if (
    !boqForm.roomName ||
    !boqForm.itemName ||
    !boqForm.quantity ||
    !boqForm.rate
  ) {
    alert("Please fill all required fields");
    return;
  }

  const quantity = parseFloat(boqForm.quantity);
  const rate = parseFloat(boqForm.rate);

  if (isNaN(quantity) || isNaN(rate)) {
    alert("Quantity and Rate must be valid numbers");
    return;
  }

  // When adding, purchaseRate equals rate (purchased price = base price initially)
  const purchaseRate = rate;
  // totalCost will be calculated on the backend using purchaseRate (final price)

  // 📦 Base payload
  const payload: any = {
    roomName: boqForm.roomName,
    itemName: boqForm.itemName,
    quantity,
    unit: boqForm.unit,
    rate, // Base price
    purchaseRate: purchaseRate, // Purchased price = final price (used in calculation)
    comments: boqForm.comments,
    siteId: activeSite.id,
  };

  try {
    // 🖼️ If image exists → convert to base64
    if (boqForm.referenceImage) {
      const file = boqForm.referenceImage;

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      payload.referenceImageBase64 = base64;
      payload.referenceImageFilename = file.name;
    }

    // 🚀 API call
    await boqApi.addBOQItem(payload, token);

    // 🔄 Reset form
    setBoqForm({
      roomName: keepModalOpen ? boqForm.roomName : "",
      itemName: "",
      quantity: "",
      unit: "Sq.ft",
      rate: "",
      comments: "",
      referenceImage: null,
    });

    // 📦 Refresh BOQ list
    fetchBOQItems();

    // ❌ Close modal if needed
    if (!keepModalOpen) {
      setShowAddModal(false);
    }
  } catch (error) {
    console.error("Failed to add BOQ item", error);
    alert("Failed to add BOQ item. Please try again.");
  }
};


  const handleEditRoomName = (roomId: string, currentName: string) => {
    setEditingRoomId(roomId);
    setEditedRoomName(currentName);
  };

  const handleSaveRoomName = () => {
    // TODO: Implement backend update for room name
    setEditingRoomId(null);
    setEditedRoomName("");
  };

  const handleCancelEdit = () => {
    setEditingRoomId(null);
    setEditedRoomName("");
  };

  // Generate a PDF by capturing the room DOM as an image using html2canvas
  const generatePDFFromElement = async (room: Room) => {
    try {
      if (!room.items || room.items.length === 0) {
        throw new Error('No items to export');
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BILL OF QUANTITIES', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Site/Project Info
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Site Name: ${activeSite?.name || 'N/A'}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Room: ${room.name}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Generated Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Total Items: ${room.items.length}`, margin, yPosition);
      yPosition += 15;

      // Summary by Category
      const categorySummary: Record<string, { count: number; totalBaseAmount: number; totalPurchaseAmount: number }> = {};
      room.items.forEach((item) => {
        const cat = item.category || 'Other';
        if (!categorySummary[cat]) {
          categorySummary[cat] = { count: 0, totalBaseAmount: 0, totalPurchaseAmount: 0 };
        }
        categorySummary[cat].count++;
        const baseAmount = item.quantity * item.rate;
        const purchaseRate = item.purchaseRate !== null && item.purchaseRate !== undefined ? item.purchaseRate : item.rate;
        const purchaseAmount = item.quantity * purchaseRate;
        categorySummary[cat].totalBaseAmount += baseAmount;
        categorySummary[cat].totalPurchaseAmount += purchaseAmount;
      });

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary by Category', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      Object.entries(categorySummary).forEach(([category, summary]) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        const categoryDisplay = category.charAt(0).toUpperCase() + category.slice(1);
        pdf.text(`${categoryDisplay}: ${summary.count} items`, margin + 5, yPosition);
        yPosition += 6;
        pdf.setFontSize(8);
        pdf.text(`  Base Total: ${formatCurrency(summary.totalBaseAmount)}`, margin + 10, yPosition);
        yPosition += 5;
        pdf.text(`  Purchase Total: ${formatCurrency(summary.totalPurchaseAmount)}`, margin + 10, yPosition);
        yPosition += 8;
        pdf.setFontSize(9);
      });

      yPosition += 10;

      // BOQ Items Details Table
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BOQ Items Details', margin, yPosition);
      yPosition += 10;

      // Table Header
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10);

      // Define column positions with better spacing
      const colPositions = {
        sno: margin + 3,
        item: margin + 12,
        quantity: margin + 70,
        unit: margin + 88,
        basePrice: margin + 110,
        purchasePrice: margin + 135,
        baseAmount: margin + 160,
        purchaseAmount: pageWidth - margin - 20
      };

      // Column widths for alignment
      const colWidths = {
        sno: 8,
        item: 55,
        quantity: 15,
        unit: 20,
        basePrice: 22,
        purchasePrice: 22,
        baseAmount: 25,
        purchaseAmount: 25
      };

      pdf.text('S.No', colPositions.sno, yPosition + 2);
      pdf.text('Item Description', colPositions.item, yPosition + 2);
      pdf.text('Qty', colPositions.quantity, yPosition + 2);
      pdf.text('Unit', colPositions.unit, yPosition + 2);
      pdf.text('Base Price', colPositions.basePrice, yPosition + 2);
      pdf.text('Purchase Price', colPositions.purchasePrice, yPosition + 2);
      pdf.text('Base Amount', colPositions.baseAmount, yPosition + 2);
      pdf.text('Purchase Amount', colPositions.purchaseAmount, yPosition + 2);
      yPosition += 12;

      // Table Content
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);

      // Calculate totals
      let totalBaseAmount = 0;
      let totalPurchaseAmount = 0;

      room.items.forEach((item, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
          
          // Redraw header
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');
          pdf.setLineWidth(0.5);
          pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10);
          pdf.text('S.No', colPositions.sno, yPosition + 2);
          pdf.text('Item Description', colPositions.item, yPosition + 2);
          pdf.text('Qty', colPositions.quantity, yPosition + 2);
          pdf.text('Unit', colPositions.unit, yPosition + 2);
          pdf.text('Base Price', colPositions.basePrice, yPosition + 2);
          pdf.text('Purchase Price', colPositions.purchasePrice, yPosition + 2);
          pdf.text('Base Amount', colPositions.baseAmount, yPosition + 2);
          pdf.text('Purchase Amount', colPositions.purchaseAmount, yPosition + 2);
          yPosition += 12;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
        }

        // Calculate row height based on item name lines
        const itemNameLines = pdf.splitTextToSize(item.name || 'N/A', colWidths.item);
        const lineCount = Array.isArray(itemNameLines) ? itemNameLines.length : 1;
        const rowHeight = Math.max(12, 8 + (lineCount - 1) * 4);
        const centerY = yPosition + (rowHeight / 2) - 2;

        const isEvenRow = index % 2 === 0;
        if (isEvenRow) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, rowHeight, 'F');
        }

        pdf.setLineWidth(0.3);
        pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, rowHeight);

        // Serial number (centered vertically)
        pdf.text((index + 1).toString(), colPositions.sno, centerY);

        // Item name (with word wrap, centered vertically)
        const itemNameY = centerY - ((lineCount - 1) * 2);
        if (Array.isArray(itemNameLines)) {
          itemNameLines.forEach((line: string, lineIndex: number) => {
            pdf.text(line, colPositions.item, itemNameY + (lineIndex * 4));
          });
        } else {
          pdf.text(itemNameLines, colPositions.item, itemNameY);
        }

        // Quantity (centered)
        const qtyText = item.quantity.toString();
        const qtyX = colPositions.quantity + (colWidths.quantity / 2) - (pdf.getTextWidth(qtyText) / 2);
        pdf.text(qtyText, qtyX, centerY);

        // Unit (centered vertically)
        pdf.text(formatUnit(item.unit), colPositions.unit, centerY);

        // Base Price (right-aligned, centered vertically)
        const basePriceText = formatCurrency(item.rate).replace('₹', '').trim();
        const basePriceX = colPositions.basePrice + colWidths.basePrice - pdf.getTextWidth(basePriceText);
        pdf.text(basePriceText, basePriceX, centerY);

        // Purchase Price (right-aligned, centered vertically)
        const purchaseRate = item.purchaseRate !== null && item.purchaseRate !== undefined ? item.purchaseRate : item.rate;
        const purchasePriceText = formatCurrency(purchaseRate).replace('₹', '').trim();
        const purchasePriceX = colPositions.purchasePrice + colWidths.purchasePrice - pdf.getTextWidth(purchasePriceText);
        pdf.text(purchasePriceText, purchasePriceX, centerY);

        // Base Amount (right-aligned, centered vertically)
        const baseAmount = item.quantity * item.rate;
        totalBaseAmount += baseAmount;
        const baseAmountText = formatCurrency(baseAmount).replace('₹', '').trim();
        const baseAmountX = colPositions.baseAmount + colWidths.baseAmount - pdf.getTextWidth(baseAmountText);
        pdf.text(baseAmountText, baseAmountX, centerY);

        // Purchase Amount (right-aligned, centered vertically)
        const purchaseAmount = item.quantity * purchaseRate;
        totalPurchaseAmount += purchaseAmount;
        const purchaseAmountText = formatCurrency(purchaseAmount).replace('₹', '').trim();
        const purchaseAmountX = colPositions.purchaseAmount + colWidths.purchaseAmount - pdf.getTextWidth(purchaseAmountText);
        pdf.text(purchaseAmountText, purchaseAmountX, centerY);

        yPosition += rowHeight;
      });

      // Total Amounts
      yPosition += 10;
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }

      // Draw total line
      pdf.setLineWidth(1);
      pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      
      // Base Price Total (right-aligned)
      const totalBaseLabel = 'TOTAL BASE AMOUNT:';
      const totalBaseLabelX = colPositions.baseAmount - pdf.getTextWidth(totalBaseLabel) - 5;
      pdf.text(totalBaseLabel, totalBaseLabelX, yPosition + 5);
      const totalBaseText = formatCurrency(totalBaseAmount).replace('₹', '').trim();
      const totalBaseX = colPositions.baseAmount + colWidths.baseAmount - pdf.getTextWidth(totalBaseText);
      pdf.text(totalBaseText, totalBaseX, yPosition + 5);
      
      yPosition += 10;
      
      // Purchase Price Total (highlighted box)
      pdf.setFontSize(12);
      pdf.setFillColor(240, 255, 240);
      const totalBoxHeight = 12;
      pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, totalBoxHeight, 'F');
      
      const totalPurchaseLabel = 'TOTAL PURCHASE AMOUNT:';
      const totalPurchaseLabelX = colPositions.purchaseAmount - pdf.getTextWidth(totalPurchaseLabel) - 5;
      pdf.text(totalPurchaseLabel, totalPurchaseLabelX, yPosition + 5);
      
      const totalPurchaseText = formatCurrency(totalPurchaseAmount).replace('₹', '').trim();
      const totalPurchaseX = colPositions.purchaseAmount + colWidths.purchaseAmount - pdf.getTextWidth(totalPurchaseText);
      pdf.text(totalPurchaseText, totalPurchaseX, yPosition + 5);
      
      // Draw box around purchase total
      pdf.setLineWidth(1.5);
      pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, totalBoxHeight);

      // Footer
      const footerY = pageHeight - 20;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.text('Generated by IntirorHub - Professional Interior Design Management', pageWidth / 2, footerY, { align: 'center' });

      return pdf;
    } catch (error) {
      console.error('Error in generatePDFFromElement:', error);
      throw error; // Re-throw to be caught by handleExportPDF
    }
  };
// Helper function to get static image based on category/tag
const getLibraryItemImage = (item: LibraryItem): string => {
  // If image exists and is a URL, use it
  if (item.image) {
    if (item.image.startsWith("http")) {
      return item.image;
    }
    if (item.image.startsWith("/")) {
      return item.image;
    }
  }

  // Default image from frontend - using logo or default library image
  // Replace this path with your actual logo: /logo.png or /images/logo.png
  // Place your logo file in: /frontend/public/logo.png or /frontend/public/images/logo.png
  return "/logo.png";
};

const filteredLibraryItems = useMemo(() => {
  const search = librarySearch.toLowerCase();

  return (libraryItems ?? []).filter((item) => {
    const searchMatch =
      item.name?.toLowerCase().includes(search) ||
      item.Category?.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search);

    const categoryMatch =
      libraryCategory === "All" ||
      item.Category === libraryCategory;

    return searchMatch && categoryMatch;
  });
}, [libraryItems, librarySearch, libraryCategory]);



  const handleExportPDF = async (room: Room) => {
    try {
      if (!room.items || room.items.length === 0) {
        alert('No items found in this room to export.');
        return;
      }

      // Try full PDF generation
      const pdf = await generatePDFFromElement(room);
      const projectName = activeSite?.name || 'Project';
      const filename = `${projectName}_${room.name}_BOQ_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      alert(`PDF downloaded successfully as: ${filename}`);
    } catch (err) {
      console.error('Simple PDF export failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to generate PDF: ${errorMessage}`);
    }
  };

  const handleShareBOQ = async (room: Room) => {
    try {
      const pdf = await generatePDFFromElement(room);
      const blob = pdf.output('blob');
      const projectName = activeSite?.name || 'Project';
      const filename = `${projectName}_${room.name}_BOQ_${new Date().toISOString().split('T')[0]}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Try Web Share API first
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await (navigator as any).share({
            title: `BOQ for ${room.name}`,
            text: `Bill of Quantities for ${room.name}`,
            files: [file],
          });
          return;
        } catch (err) {
          console.error('Web Share failed:', err);
        }
      }

      // WhatsApp sharing
      const url = URL.createObjectURL(blob);
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        `BOQ for ${room.name}\n\nPlease find attached the Bill of Quantities document.\n\nGenerated by IntirorHub`
      )}`;

      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');

      // Also provide download as fallback
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = url;
        const projectName = activeSite?.name || 'Project';
        const filename = `${projectName}_${room.name}_BOQ_${new Date().toISOString().split('T')[0]}.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);

    } catch (err) {
      console.error('Share BOQ failed:', err);
      // Fallback: just download
      try {
        const pdf = await generatePDFFromElement(room);
        pdf.save(`${room.name}_BOQ.pdf`);
      } catch (fallbackErr) {
        console.error('Fallback download failed:', fallbackErr);
      }
    }
  };

  const filteredRooms = selectedRoom === "all"
    ? rooms
    : rooms.filter(room => room.id === selectedRoom);

  const filterItemsByCategory = (items: BOQItem[]) => {
    if (selectedCategory === "all") return items;
    return items.filter(item => item.category === selectedCategory);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatUnit = (unit: string) => {
    const unitMap: { [key: string]: string } = {
      'Nos': 'Nos.',
      'nos': 'Nos.',
      'Sq.ft': 'Sq. Ft.',
      'sq.ft': 'Sq. Ft.',
      'sq ft': 'Sq. Ft.',
      'Sq Ft': 'Sq. Ft.',
      'Rft': 'Rft',
      'rft': 'Rft',
    };
    return unitMap[unit] || unit;
  };

  // Generate PDF report for all materials
  const generateMaterialsPDF = async () => {
    try {
      if (!materials || materials.length === 0) {
        alert('No materials found to export.');
        return;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MATERIAL USED REPORT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Site/Project Info
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Site Name: ${activeSite?.name || 'N/A'}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Generated Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Total Materials: ${materials.length}`, margin, yPosition);
      yPosition += 15;

      // Summary by Category
      const categorySummary: Record<string, { count: number; totalCost: number }> = {};
      materials.forEach((material) => {
        const cat = material.category || 'Other';
        if (!categorySummary[cat]) {
          categorySummary[cat] = { count: 0, totalCost: 0 };
        }
        categorySummary[cat].count++;
        categorySummary[cat].totalCost += material.cost;
      });

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary by Category', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      Object.entries(categorySummary).forEach(([category, summary]) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(`${category}: ${summary.count} items - Total: ${formatCurrency(summary.totalCost)}`, margin + 5, yPosition);
        yPosition += 7;
      });

      yPosition += 10;

      // Materials Details Table
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Material Details', margin, yPosition);
      yPosition += 10;

      // Table Header
      pdf.setFontSize(9);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10);

      const colPositions = {
        sno: margin + 5,
        name: margin + 20,
        category: margin + 80,
        installedAt: margin + 110,
        vendor: margin + 150,
        cost: pageWidth - margin - 30
      };

      pdf.text('S.No', colPositions.sno, yPosition + 2);
      pdf.text('Material Name', colPositions.name, yPosition + 2);
      pdf.text('Category', colPositions.category, yPosition + 2);
      pdf.text('Installed At', colPositions.installedAt, yPosition + 2);
      pdf.text('Vendor', colPositions.vendor, yPosition + 2);
      pdf.text('Cost (₹)', colPositions.cost, yPosition + 2);
      yPosition += 12;

      // Table Content
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      materials.forEach((material, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
          
          // Redraw header
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');
          pdf.setLineWidth(0.5);
          pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10);
          pdf.text('S.No', colPositions.sno, yPosition + 2);
          pdf.text('Material Name', colPositions.name, yPosition + 2);
          pdf.text('Category', colPositions.category, yPosition + 2);
          pdf.text('Installed At', colPositions.installedAt, yPosition + 2);
          pdf.text('Vendor', colPositions.vendor, yPosition + 2);
          pdf.text('Cost (₹)', colPositions.cost, yPosition + 2);
          yPosition += 12;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
        }

        const isEvenRow = index % 2 === 0;
        if (isEvenRow) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 15, 'F');
        }

        pdf.setLineWidth(0.3);
        pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 15);

        // Serial number
        pdf.text((index + 1).toString(), colPositions.sno, yPosition + 4);

        // Material name (with word wrap)
        const nameLines = pdf.splitTextToSize(material.name || 'N/A', 50);
        pdf.text(nameLines, colPositions.name, yPosition + 4);

        // Category
        pdf.text(material.category || 'N/A', colPositions.category, yPosition + 4);

        // Installed At (with word wrap)
        const installedAtLines = pdf.splitTextToSize(material.installedAt || 'N/A', 35);
        pdf.text(installedAtLines, colPositions.installedAt, yPosition + 4);

        // Vendor
        const vendorText = material.vendor?.name || 'N/A';
        pdf.text(pdf.splitTextToSize(vendorText, 30), colPositions.vendor, yPosition + 4);

        // Cost (right-aligned)
        const costText = formatCurrency(material.cost).replace('₹', '').trim();
        const costWidth = pdf.getTextWidth(costText);
        pdf.text(costText, colPositions.cost + 25 - costWidth, yPosition + 4);

        yPosition += 15;
      });

      // Total Cost
      yPosition += 10;
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setLineWidth(1);
      pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);

      const totalCost = materials.reduce((sum, m) => sum + m.cost, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('TOTAL COST:', pageWidth - margin - 60, yPosition + 5);
      pdf.text(formatCurrency(totalCost).replace('₹', ''), pageWidth - margin - 25, yPosition + 5);

      // Document Links Section
      yPosition += 20;
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Document Links', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');

      materials.forEach((material, index) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        const hasDocuments = material.invoice || material.photo || material.warrantyDoc;
        if (hasDocuments) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${material.name}`, margin, yPosition);
          yPosition += 6;
          pdf.setFont('helvetica', 'normal');

          const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
          
          if (material.invoice) {
            const invoiceUrl = material.invoice.startsWith('http') 
              ? material.invoice 
              : `${baseUrl}${material.invoice}`;
            pdf.text(`   Invoice: ${invoiceUrl}`, margin + 5, yPosition);
            yPosition += 6;
          }

          if (material.photo) {
            const photoUrl = material.photo.startsWith('http') 
              ? material.photo 
              : `${baseUrl}${material.photo}`;
            pdf.text(`   Photo: ${photoUrl}`, margin + 5, yPosition);
            yPosition += 6;
          }

          if (material.warrantyDoc) {
            const warrantyUrl = material.warrantyDoc.startsWith('http') 
              ? material.warrantyDoc 
              : `${baseUrl}${material.warrantyDoc}`;
            pdf.text(`   Warranty: ${warrantyUrl}`, margin + 5, yPosition);
            yPosition += 6;
          }

          yPosition += 3;
        }
      });

      // Footer
      const footerY = pageHeight - 15;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.text('Generated by IntirorHub - Professional Interior Design Management', pageWidth / 2, footerY, { align: 'center' });

      // Save PDF
      const siteName = activeSite?.name || 'Project';
      const filename = `${siteName}_Materials_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      alert(`PDF report downloaded successfully as: ${filename}`);
    } catch (error) {
      console.error('Error generating materials PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  // Material CRUD functions
  const fetchMaterials = async () => {
    if (!token || !activeSite) return;
    try {
      setMaterialLoading(true);
      const response = await materialApi.getMaterialsBySite(activeSite.id, token);
      setMaterials(response.materials);
    } catch (error) {
      console.error("Failed to fetch materials", error);
      setMaterials([]);
    } finally {
      setMaterialLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeSite) return;

    try {
      const formData = new FormData();
      formData.append("category", materialForm.category);
      formData.append("name", materialForm.name);
      formData.append("description", materialForm.description);
      formData.append("installedAt", materialForm.installedAt);
      formData.append("vendor[name]", materialForm.vendorName);
      formData.append("vendor[city]", materialForm.vendorCity);
      formData.append("cost", materialForm.cost);
      formData.append("warranty[duration]", materialForm.warrantyDuration);
      formData.append("warranty[model]", materialForm.warrantyModel);
      if (materialForm.warrantySince) {
        formData.append("warranty[since]", materialForm.warrantySince);
      }
      formData.append("siteId", activeSite.id);

      if (materialForm.invoice) {
        formData.append("invoice", materialForm.invoice);
      }
      if (materialForm.photo) {
        formData.append("photo", materialForm.photo);
      }
      if (materialForm.warrantyDoc) {
        formData.append("warrantyDoc", materialForm.warrantyDoc);
      }

      await materialApi.addMaterial(formData, token);
      
      // Reset form
      setMaterialForm({
        category: "Finishes",
        name: "",
        description: "",
        installedAt: "",
        vendorName: "",
        vendorCity: "",
        cost: "",
        warrantyDuration: "",
        warrantyModel: "",
        warrantySince: "",
        invoice: null,
        photo: null,
        warrantyDoc: null,
      });
      setShowAddMaterialModal(false);
      refetchMaterials();
    } catch (error: any) {
      console.error("Error adding material:", error);
      alert(error.message || "Failed to add material");
    }
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingMaterial) return;

    try {
      const formData = new FormData();
      formData.append("category", materialForm.category);
      formData.append("name", materialForm.name);
      formData.append("description", materialForm.description);
      formData.append("installedAt", materialForm.installedAt);
      formData.append("vendor[name]", materialForm.vendorName);
      formData.append("vendor[city]", materialForm.vendorCity);
      formData.append("cost", materialForm.cost);
      formData.append("warranty[duration]", materialForm.warrantyDuration);
      formData.append("warranty[model]", materialForm.warrantyModel);
      if (materialForm.warrantySince) {
        formData.append("warranty[since]", materialForm.warrantySince);
      }

      if (materialForm.invoice) {
        formData.append("invoice", materialForm.invoice);
      }
      if (materialForm.photo) {
        formData.append("photo", materialForm.photo);
      }
      if (materialForm.warrantyDoc) {
        formData.append("warrantyDoc", materialForm.warrantyDoc);
      }

      await materialApi.updateMaterial(editingMaterial._id, formData, token);
      
      setEditingMaterial(null);
      setShowAddMaterialModal(false);
      refetchMaterials();
    } catch (error: any) {
      console.error("Error updating material:", error);
      alert(error.message || "Failed to update material");
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!token) return;
    const ok = window.confirm("Are you sure you want to delete this material?");
    if (!ok) return;

    try {
      await materialApi.deleteMaterial(materialId, token);
      refetchMaterials();
    } catch (error) {
      console.error("Failed to delete material", error);
      alert("Failed to delete material");
    }
  };

  const handleEditMaterial = (material: MaterialDto) => {
    setEditingMaterial(material);
    setMaterialForm({
      category: material.category,
      name: material.name,
      description: material.description || "",
      installedAt: material.installedAt,
      vendorName: material.vendor.name,
      vendorCity: material.vendor.city || "",
      cost: material.cost.toString(),
      warrantyDuration: material.warranty?.duration || "",
      warrantyModel: material.warranty?.model || "",
      warrantySince: material.warranty?.since ? new Date(material.warranty.since).toISOString().split('T')[0] : "",
      invoice: null,
      photo: null,
      warrantyDoc: null,
    });
    setShowAddMaterialModal(true);
  };

  const filteredMaterials = useMemo(() => {
    const search = materialSearch.toLowerCase();
    return materials.filter((item) => {
      const searchMatch =
        item.name?.toLowerCase().includes(search) ||
        item.vendor?.name?.toLowerCase().includes(search);
      const categoryMatch =
        materialCategory === "All" ||
        item.category === materialCategory;
      return searchMatch && categoryMatch;
    });
  }, [materials, materialSearch, materialCategory]);

  // ✅ Filtered materials - reserved for future use
  // const filteredMaterials = useMemo(() => {
  //   const search = materialSearch.toLowerCase();
  //   return materials.filter((item) => {
  //     const searchMatch =
  //       item.name?.toLowerCase().includes(search) ||
  //       item.brand?.toLowerCase().includes(search);
  //     const categoryMatch =
  //       materialCategory === "All" ||
  //       item.category?.toLowerCase() === materialCategory.toLowerCase();
  //     return searchMatch && categoryMatch;
  //   });
  // }, [materials, materialSearch, materialCategory]);


  return (
    <>
      <div className="min-h-screen px-1 py-4 pb-28 relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
        </div>

        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex mb-4">
          {[
            { key: "boq", label: "BOQ" },
            { key: "material", label: "Material Used" },
            { key: "library", label: "Library" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-4 px-2 text-[11px] font-bold rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {activeTab === "library" && (
          <div className="flex justify-center">
            <div className="w-full max-w-5xl">
           {/* BOQ LIBRARY HEADER */}
<div className="mb-4">
  <h2 className="text-xl font-bold text-slate-800">
    BOQ Library
  </h2>
  <p className="text-sm text-slate-500 mt-1">
    Pre-built items for faster estimation
  </p>
</div>

{/* SEARCH BAR */}
<div className="flex gap-3 mb-4">
  <div className="relative flex-1">
    <span className="absolute left-3 top-3 text-slate-400">🔍</span>
    <input
      type="text"
      placeholder="Search items, brands..."
      value={librarySearch}
      onChange={(e) => setLibrarySearch(e.target.value)}
      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200
        focus:ring-2 focus:ring-slate-300 outline-none"
    />
  </div>

  <button
    onClick={() => {
      setLibrarySearch("");
      setLibraryCategory("All");
    }}
    className="w-12 h-12 rounded-xl border flex items-center justify-center text-slate-600"
    title="Reset filters"
  >
    ⟲
  </button>
</div>

            {/* CATEGORY PILLS */}
            <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
  {["All", "Furniture", "Finishes", "Hardware", "Electrical", "Electronics", "Services"].map((cat) => (
    <button
      key={cat}
      onClick={() => setLibraryCategory(cat as any)}
      className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition
        ${
          libraryCategory === cat
            ? "bg-slate-900 text-white"
            : "bg-white border text-slate-600 hover:bg-slate-100"
        }`}
    >
      {cat}
    </button>
  ))}
</div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
{filteredLibraryItems.map((item) => {
  const id = item._id;
  const inputs = libraryItemInputs[id] || { quantity: 1, unit: "Nos.", room: allRoomNames[0] || "Living Room" };
  const isEditingRate = editingLibraryRate === id;
  const displayRate = isEditingRate ? parseFloat(editingLibraryRateValue) || item.ratePerQty : (typeof item.ratePerQty === 'number' ? item.ratePerQty : parseFloat(item.ratePerQty) || 0);
  const totalAmount = displayRate * inputs.quantity;

  // Get category display name from tag or Category
  const getCategoryDisplay = () => {
    const tag = (item.tag || "").toUpperCase();
    if (tag.includes("BED")) return "Beds";
    if (tag.includes("WARDROBE") || tag.includes("WARDROB")) return "Wardrobes";
    if (tag.includes("TV") || tag.includes("UNIT")) return "TV Unit";
    if (tag.includes("TABLE") || tag.includes("DESK")) return "Tables";
    if (tag.includes("SOFA")) return "Sofas";
    if (tag.includes("CHAIR")) return "Chairs";
    if (tag.includes("DOOR")) return "Doors";
    if (tag.includes("ELECTRICAL") || tag.includes("LIGHT")) return "Electrical";
    if (tag.includes("FLOOR")) return "Floor";
    if (tag.includes("WALL")) return "Wall Panels";
    if (tag.includes("CEILING")) return "Ceiling";
    return item.Category || "Furniture";
  };

  // Get unit display (parse from qty or use default)
  const getUnitDisplay = () => {
    if (typeof item.qty === "string") {
      // If qty is like "Nos", "Sq.ft", etc.
      return item.qty;
    }
    return "Nos.";
  };

  const handleQuantityChange = (value: number) => {
    setLibraryItemInputs(prev => ({
      ...prev,
      [id]: { ...inputs, quantity: Math.max(1, value) }
    }));
  };

  const handleUnitChange = (unit: string) => {
    setLibraryItemInputs(prev => ({
      ...prev,
      [id]: { ...inputs, unit }
    }));
  };

  const handleRoomChange = (room: string) => {
    setLibraryItemInputs(prev => ({
      ...prev,
      [id]: { ...inputs, room }
    }));
  };

  const handleStartEditRate = () => {
    setEditingLibraryRate(id);
    setEditingLibraryRateValue(item.ratePerQty.toString());
  };

  const handleSaveRate = async () => {
    if (!token) return;
    
    try {
      const newRate = parseFloat(editingLibraryRateValue);
      if (isNaN(newRate) || newRate <= 0) {
        alert("Please enter a valid rate");
        return;
      }

      // Update library item rate via API
      await libraryApi.updateLibraryItem(id, { 
        ratePerQty: newRate,
        baseRate: newRate 
      }, token);
      
      // Update local state
      const updatedItems = libraryItems.map(libItem => 
        libItem._id === id 
          ? { ...libItem, ratePerQty: newRate }
          : libItem
      );
      setLibraryItems(updatedItems);
      setEditingLibraryRate(null);
    } catch (error) {
      console.error("Failed to update rate", error);
      alert("Failed to update rate. Please try again.");
      setEditingLibraryRate(null);
    }
  };

  const handleCancelEditRate = () => {
    setEditingLibraryRate(null);
    setEditingLibraryRateValue("");
  };

  const handleAddToBOQ = async () => {
    if (!token || !activeSite) return;
    
    try {
      const payload = {
        roomName: inputs.room,
        itemName: item.name,
        quantity: inputs.quantity,
        unit: inputs.unit,
        rate: displayRate || item.ratePerQty,
        totalCost: totalAmount,
        comments: "",
        siteId: activeSite.id,
      };

      await boqApi.addBOQItem(payload, token);
      fetchBOQItems();
      
      // Reset inputs
      setLibraryItemInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[id];
        return newInputs;
      });
      
      alert("Item added to BOQ successfully!");
    } catch (error) {
      console.error("Failed to add to BOQ", error);
      alert("Failed to add item to BOQ");
    }
  };

  return (
    <div key={id} className="h-full">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full group">
        {/* IMAGE SECTION */}
        <div className="relative h-28 sm:h-32 w-full bg-slate-100 overflow-hidden">
          <img
            src={getLibraryItemImage(item)}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              // Fallback to SVG placeholder if logo.png doesn't exist
              // This creates a simple gray placeholder with "No Image" text
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect fill='%23f1f5f9' width='300' height='200'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='14' x='150' y='100' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-600 shadow-sm border border-white">
            {getCategoryDisplay()}
          </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="p-2.5 sm:p-4 flex flex-col flex-1">
          {/* TITLE & DESCRIPTION */}
          <div className="mb-2 sm:mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h3>
            <div className="flex justify-between items-start mt-0.5">
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1">{item.description || item.Category || "Generic"}</p>
              <Info className="w-3 h-3 text-slate-300 flex-shrink-0" />
            </div>
          </div>

          {/* BASE RATE SECTION */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide">BASE RATE</span>
              {isAdmin && (
                <>
                  {isEditingRate ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editingLibraryRateValue}
                        onChange={(e) => setEditingLibraryRateValue(e.target.value)}
                        className="w-20 px-1 py-0.5 text-xs border rounded"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveRate}
                        className="text-green-500 hover:text-green-600"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelEditRate}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartEditRate}
                      className="text-slate-300 hover:text-blue-500"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-800">
              ₹{formatCurrency(displayRate).replace('₹', '')} <span className="text-[10px] sm:text-xs font-medium text-slate-400">/ {getUnitDisplay()}</span>
            </div>
          </div>

          {/* INPUTS SECTION */}
          <div className="mt-auto space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t border-slate-50">
            {/* QUANTITY & UNIT */}
            <div className="flex gap-1.5 sm:gap-2">
              <input
                type="number"
                min="1"
                value={inputs.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-12 sm:w-16 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs sm:text-sm font-bold text-slate-700 py-1 sm:py-1.5 focus:outline-none focus:border-slate-400"
              />
              <div className="relative flex-1">
                <select
                  value={inputs.unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full h-full bg-slate-50 border border-slate-200 rounded-lg text-[10px] sm:text-xs font-bold text-slate-600 px-1.5 sm:px-2 py-1 sm:py-1.5 appearance-none focus:outline-none focus:border-slate-400"
                >
                  <option value="Nos.">Nos.</option>
                  <option value="Sq. Ft.">Sq. Ft.</option>
                  <option value="R. Ft.">R. Ft.</option>
                  <option value="Lumpsum">Lumpsum</option>
                  <option value="Meters">Meters</option>
                  <option value="Sets">Sets</option>
                </select>
              </div>
            </div>

            {/* ROOM SELECTOR */}
            <div className="relative">
              <select
                value={inputs.room}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[10px] sm:text-xs font-semibold text-slate-600 px-2 sm:px-3 py-1.5 sm:py-2 appearance-none focus:outline-none focus:border-slate-400"
              >
                {allRoomNames.length > 0 ? (
                  allRoomNames.map((room) => (
                    <option key={room} value={room}>{room}</option>
                  ))
                ) : (
                  <>
                    <option value="Living Room">Living Room</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Bedroom 1">Bedroom 1</option>
                    <option value="Bedroom 2">Bedroom 2</option>
                    <option value="Bedroom 3">Bedroom 3</option>
                    <option value="Toilet 1">Toilet 1</option>
                    <option value="Toilet 2">Toilet 2</option>
                    <option value="Foyer">Foyer</option>
                    <option value="Balcony">Balcony</option>
                    <option value="Utility">Utility</option>
                  </>
                )}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
              </div>
            </div>

            {/* ADD TO BOQ BUTTON */}
            <button
              onClick={handleAddToBOQ}
              className="w-full py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-300 shadow-md bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Add to BOQ</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* TOTAL */}
            <div className="text-center">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Total: {formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})}
              </div>
            </div>
          </div>
        )}



        {activeTab === "material" && (
          <div className="px-1 pb-4">
            {/* MATERIAL USED HEADER */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Material Used</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Installed materials with proof & warranty
                </p>
              </div>
              <button 
                onClick={generateMaterialsPDF}
                className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-slate-900/20 active:scale-95 transition-transform"
              >
                <FileText className="w-3.5 h-3.5" />
                Report
              </button>
            </div>

            {/* SEARCH */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search material, brand..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm"
                />
              </div>
            </div>

            {/* CATEGORY PILLS */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {["All", "Finishes", "Hardware", "Electrical", "Electronics"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMaterialCategory(cat as any)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    materialCategory === cat
                      ? "bg-slate-800 text-white"
                      : "bg-white border border-slate-200 text-slate-500"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* ADD MATERIAL BUTTON - Floating */}
            {canAddItems && (
              <button
                onClick={() => {
                  setEditingMaterial(null);
                  setMaterialForm({
                    category: "Finishes",
                    name: "",
                    description: "",
                    installedAt: "",
                    vendorName: "",
                    vendorCity: "",
                    cost: "",
                    warrantyDuration: "",
                    warrantyModel: "",
                    warrantySince: "",
                    invoice: null,
                    photo: null,
                    warrantyDoc: null,
                  });
                  setShowAddMaterialModal(true);
                }}
                className="fixed bottom-20 right-5 bg-blue-500 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors z-40"
                title="Add Material"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}

            {/* MATERIALS LIST */}
            {materialLoading ? (
              <div className="text-center py-8 text-slate-500">Loading materials...</div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No materials added yet.</p>
                {canAddItems && (
                  <p className="text-xs mt-1">Click the + button to add material.</p>
                )}
              </div>
            ) : (
              <div>
                {filteredMaterials.map((material) => {
                  // Parse description for brand/model format (e.g., "Merino • 2201 SF")
                  const descriptionParts = material.description?.split("•") || [];
                  const brand = descriptionParts[0]?.trim() || "";
                  const model = descriptionParts[1]?.trim() || "";
                  const hasWarranty = !!(material.warranty?.duration || material.warranty?.model);
                  const installedAtParts = material.installedAt.split(",").map(s => s.trim());
                  const installedAtMain = installedAtParts[0] || material.installedAt;
                  const installedAtSub = installedAtParts.slice(1).join(", ") || "";

                  return (
                    <div key={material._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {material.category}
                            </span>
                            {hasWarranty && (
                              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Warranty
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 leading-tight text-left">
                            {material.name}
                          </h3>
                          {material.description && (
                            <div className="text-sm font-medium text-slate-500 mt-1 text-left">
                              {brand}
                              {model && (
                                <>
                                  {" • "}
                                  <span className="text-slate-400">{model}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === material._id ? null : material._id)}
                          className="text-slate-400 hover:text-slate-600 p-1 relative"
                          title="More options"
                        >
                          <EllipsisVertical className="w-5 h-5" />
                          {openMenuId === material._id && (
                            <div className="absolute right-0 top-8 z-10 bg-white border border-slate-200 rounded shadow-md min-w-[120px]">
                              {canAddItems && (
                                <button
                                  onClick={() => {
                                    handleEditMaterial(material);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Edit
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    handleDeleteMaterial(material._id);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-left">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            INSTALLED AT
                          </div>
                          <div className="text-sm font-bold text-slate-800">{installedAtMain}</div>
                          {installedAtSub && (
                            <div className="text-xs text-slate-500">{installedAtSub}</div>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 text-left">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            VENDOR
                          </div>
                          <div className="text-sm font-bold text-slate-800 truncate">
                            {material.vendor.name}
                          </div>
                          {material.vendor.city && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {material.vendor.city}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-end justify-between mb-3 border-b border-slate-50 pb-3">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left">
                            COST
                          </div>
                          <div className="text-xl font-bold text-slate-900 text-left">
                            {formatCurrency(material.cost)}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            WARRANTY
                          </div>
                          {material.warranty?.duration && (
                            <div className="text-sm font-bold text-slate-800">
                              {material.warranty.duration}
                            </div>
                          )}
                          {material.warranty?.since && (
                            <div className="text-[10px] text-slate-400">
                              Since {new Date(material.warranty.since).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {material.invoice ? (
                          <a
                            href={material.invoice.startsWith('http') ? material.invoice : `${import.meta.env.BACKEND_URL}${material.invoice}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Invoice
                          </a>
                        ) : (
                          <button
                            onClick={() => handleEditMaterial(material)}
                            className="flex-1 py-2 rounded-lg border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                             Invoice
                          </button>
                        )}

                        {material.photo ? (
                          <a
                            href={material.photo.startsWith('http') ? material.photo : `${import.meta.env.BACKEND_URL}${material.photo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-colors"
                          >
                            <Image className="w-3.5 h-3.5" />
                            Photo
                          </a>
                        ) : (
                          <button
                            onClick={() => handleEditMaterial(material)}
                            className="flex-1 py-2 rounded-lg border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                             Photo
                          </button>
                        )}

                        {material.warrantyDoc ? (
                          <a
                            href={material.warrantyDoc.startsWith('http') ? material.warrantyDoc : `${import.meta.env.BACKEND_URL}${material.warrantyDoc}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Warranty
                          </a>
                        ) : (
                          <button
                            onClick={() => handleEditMaterial(material)}
                            className="flex-1 py-2 rounded-lg border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                             Warranty
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

{/* ADD/EDIT MATERIAL MODAL */}
{showAddMaterialModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-black/40" onClick={() => {
      setShowAddMaterialModal(false);
      setEditingMaterial(null);
    }} />
    <div className="relative bg-white rounded-xl w-full max-w-2xl p-6 shadow-lg overflow-auto max-h-[calc(100vh-4rem)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {editingMaterial ? "Edit Material" : "Add Material"}
          </h3>
          <span className="text-xs text-gray-500">Material used with proof & warranty</span>
        </div>
        <button onClick={() => {
          setShowAddMaterialModal(false);
          setEditingMaterial(null);
        }} className="p-1 rounded-md hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={editingMaterial ? handleUpdateMaterial : handleAddMaterial} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
            <select
              className="w-full p-2 border rounded-lg text-sm"
              value={materialForm.category}
              onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value as any })}
              required
            >
              <option value="Finishes">Finishes</option>
              <option value="Hardware">Hardware</option>
              <option value="Electrical">Electrical</option>
              <option value="Electronics">Electronics</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="e.g., Laminate - Matte Wood"
              value={materialForm.name}
              onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg text-sm"
            placeholder="e.g., Merino • 2201 SF"
            value={materialForm.description}
            onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Installed At *</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg text-sm"
            placeholder="e.g., Kitchen, Base Cabinet Shutters"
            value={materialForm.installedAt}
            onChange={(e) => setMaterialForm({ ...materialForm, installedAt: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor Name *</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="e.g., City Hardware"
              value={materialForm.vendorName}
              onChange={(e) => setMaterialForm({ ...materialForm, vendorName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor City</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="e.g., Mumbai"
              value={materialForm.vendorCity}
              onChange={(e) => setMaterialForm({ ...materialForm, vendorCity: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cost (₹) *</label>
          <input
            type="number"
            className="w-full p-2 border rounded-lg text-sm"
            placeholder="e.g., 4500"
            value={materialForm.cost}
            onChange={(e) => setMaterialForm({ ...materialForm, cost: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warranty Duration</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="e.g., 10 Years"
              value={materialForm.warrantyDuration}
              onChange={(e) => setMaterialForm({ ...materialForm, warrantyDuration: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warranty Model</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="e.g., Since 01/10/2023"
              value={materialForm.warrantyModel}
              onChange={(e) => setMaterialForm({ ...materialForm, warrantyModel: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warranty Since</label>
            <input
              type="date"
              className="w-full p-2 border rounded-lg text-sm"
              value={materialForm.warrantySince}
              onChange={(e) => setMaterialForm({ ...materialForm, warrantySince: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Invoice</label>
            <input
              type="file"
              className="w-full p-2 border rounded-lg text-sm"
              accept="image/*,application/pdf"
              onChange={(e) => setMaterialForm({ ...materialForm, invoice: e.target.files?.[0] || null })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Photo</label>
            <input
              type="file"
              className="w-full p-2 border rounded-lg text-sm"
              accept="image/*"
              onChange={(e) => setMaterialForm({ ...materialForm, photo: e.target.files?.[0] || null })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warranty Doc</label>
            <input
              type="file"
              className="w-full p-2 border rounded-lg text-sm"
              accept="image/*,application/pdf"
              onChange={(e) => setMaterialForm({ ...materialForm, warrantyDoc: e.target.files?.[0] || null })}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-4">
          <button
            type="button"
            onClick={() => {
              setShowAddMaterialModal(false);
              setEditingMaterial(null);
            }}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {editingMaterial ? "Update" : "Add"} Material
          </button>
        </div>
      </form>
    </div>
  </div>
)}

          </div>
        )}



        {activeTab === "boq" && (
          <>
            <div
              className="
    bg-white rounded-2xl
    px-2 py-3 mb-4
    shadow-sm border border-slate-200
    flex items-center justify-between
    gap-3
  "
            >
             
              {/* ROOM FILTERS */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* ALL ROOMS */}
                <button
                  onClick={() => setSelectedRoom("all")}
                  className={`
        px-4 py-2
        rounded-xl text-xs font-semibold
        whitespace-nowrap
        transition-all
        focus:outline-none focus:ring-2 focus:ring-blue-300
        ${selectedRoom === "all"
                      ? "bg-blue-600 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }
      `}
                >
                  
                  All Rooms
                </button>
 
                {/* DYNAMIC ROOMS */}
                {allRoomNames.map((roomName) => {
                  const roomKey = roomName.toLowerCase().replace(/\s+/g, "-");
                  const isActive = selectedRoom === roomKey;
                 

                  return (
                    <button
                      key={roomName}
                      onClick={() => setSelectedRoom(roomKey)}
                      className={`
            px-4 py-2
            rounded-xl text-xs font-medium
            whitespace-nowrap
            transition-all
            focus:outline-none focus:ring-2 focus:ring-blue-300
            ${isActive
                          ? "bg-blue-600 text-white shadow"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }
          `}
                    >
                      {roomName}
                     
                    </button>
                  );
                })}
              </div>

              {/* ADD ROOM BUTTON */}
              
              <button
                title="Add Room"
                onClick={() => setShowAddRoomModal(true)}
                className="
      w-12 h-12
      rounded-full
      bg-black text-white
      shadow-lg
      flex items-center justify-center
      flex-shrink-0
      hover:bg-gray-900
      active:scale-95
      transition
      focus:outline-none focus:ring-2 focus:ring-slate-400
    "
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            {showAddModal && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center px-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAddModal(false);
                  }
                }}
              >
                <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 opacity-100" />
                <div 
                  className="relative bg-white rounded-xl w-full max-w-md p-4 sm:p-6 shadow-lg
        overflow-auto max-h-[calc(100vh-8rem)]
        transform transition-all duration-300
        scale-100 translate-y-0 opacity-100
        animate-modalIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col">
                      <h3 className="text-base font-semibold">Add BOQ Item</h3>
                      <span className="text-xs text-gray-500">Add a new item to the Bill of Quantities</span>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleSubmitBOQItem} className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">Room Name *</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={boqForm.roomName}
                        onChange={(e) => setBoqForm({ ...boqForm, roomName: e.target.value })}
                        required
                      >
                        <option value="">Select Room</option>
                        {allRoomNames.map((roomName) => (
                          <option key={roomName} value={roomName}>{roomName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Item Name / Scope of Work *</label>
                      <input
                        className="w-full mt-1 p-2 border rounded"
                        placeholder="Enter item name or scope of work"
                        value={boqForm.itemName}
                        onChange={(e) => setBoqForm({ ...boqForm, itemName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Quantity / Size *</label>
                      <input
                        className="w-full mt-1 p-2 border rounded"
                        placeholder="Enter quantity or size"
                        type="number"
                        value={boqForm.quantity}
                        onChange={(e) => setBoqForm({ ...boqForm, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Unit *</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={boqForm.unit}
                        onChange={(e) => setBoqForm({ ...boqForm, unit: e.target.value })}
                      >
                        <option>Sq.ft</option>
                        <option>Rft</option>
                        <option>Nos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Purchased Price (₹) *</label>
                      <input
                        type="number"
                        className="w-full mt-1 p-2 border rounded"
                        placeholder="Enter purchased price per unit"
                        value={boqForm.rate}
                        onChange={(e) => setBoqForm({ ...boqForm, rate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Total Cost (₹)</label>
                      <input
                        type="text"
                        className="w-full mt-1 p-2 border rounded bg-gray-100"
                        readOnly
                        value={boqForm.quantity && boqForm.rate ? `₹${(parseFloat(boqForm.quantity) * parseFloat(boqForm.rate)).toLocaleString()}` : "Auto Calculated"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Upload Reference Image</label>
                      <input
                        type="file"
                        className="w-full mt-1 p-2 border rounded"
                        accept="image/*"
                        onChange={(e) => setBoqForm({ ...boqForm, referenceImage: e.target.files?.[0] || null })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Comments / Notes</label>
                      <textarea
                        className="w-full mt-1 p-2 border rounded"
                        rows={3}
                        placeholder="Add any additional comments or notes"
                        value={boqForm.comments}
                        onChange={(e) => setBoqForm({ ...boqForm, comments: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setShowAddModal(false)} className="w-full sm:w-auto px-4 py-2 rounded bg-gray-100">Cancel</button>
                      <button type="submit" className="w-full sm:w-auto px-4 py-2 rounded bg-indigo-600 text-white">Add BOQ Item</button>
                    <button
  type="button"
  onClick={() => handleSubmitBOQItem(undefined, true)}
  className="w-full sm:w-auto px-4 py-2 rounded bg-white border border-indigo-600 text-indigo-600"
>
  Save & Add Another
</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showAddRoomModal && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center px-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAddRoomModal(false);
                  }
                }}
              >
                <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 opacity-100" />
                <div 
                  className="relative bg-white rounded-xl w-full max-w-md p-4 sm:p-6 shadow-lg
        overflow-auto max-h-[calc(100vh-8rem)]
        transform transition-all duration-300
        scale-100 translate-y-0 opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col">
                      <h3 className="text-base font-semibold">Add New Room</h3>
                      <span className="text-xs text-gray-500">Add a new room to the Bill of Quantities</span>
                    </div>
                    <button onClick={() => setShowAddRoomModal(false)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); handleAddRoom(); }} className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">Room Name *</label>
                      <input
                        type="text"
                        className="w-full mt-1 p-2 border rounded"
                        placeholder="Enter room name (e.g., Bedroom, Kitchen)"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setShowAddRoomModal(false)} className="w-full sm:w-auto px-4 py-2 rounded bg-gray-100">Cancel</button>
                      <button type="submit" className="w-full sm:w-auto px-4 py-2 rounded bg-indigo-600 text-white">Add Room</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="px-1 space-y-6">
              {filteredRooms.map((room) => {
                const filteredItems = filterItemsByCategory(room.items);
                // Show room even if no items

                const roomSubtotal = filteredItems.reduce((sum, item) => sum + item.amount, 0);

                return (
                  <div id={`boq-room-${room.id}`} key={room.id} className="bg-white rounded-[2rem] px-2 py-5 mb-6 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                    {/* Room Header */}
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2">
                        {editingRoomId === room.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editedRoomName}
                              onChange={(e) => setEditedRoomName(e.target.value)}
                              className="text-xl font-bold text-slate-500 border-1 border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-200"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRoomName()}
                              className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-xl font-bold text-slate-800">{room.name}</h3>
                            {isAdmin && (
                              <button
                                onClick={() => handleEditRoomName(room.id, room.name)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit room name"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      {canAddItems && (
                        <button
                          onClick={() => {
                            setBoqForm({ ...boqForm, roomName: room.name });
                            setShowAddModal(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Item
                        </button>
                      )}
                    </div>

                    {filteredItems.length > 0 ? (
                      <>
                        {/* Table Header */}
                        <div className="flex text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
                          <div className="w-[45%]">Item Name</div>
                          <div className="w-[25%] text-center">Quantity</div>
                          <div className="w-[30%] text-right">Rate</div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-4 mb-8">
                          {filteredItems.map((item) => {
                            const isExpanded = expandedItemId === item.id.toString();
                            return (
                              <div key={item.id} className="relative">
                                {/* Item Header - Clickable */}
                                <div 
                                  className={`relative flex items-center pl-2 py-2 cursor-pointer transition-all duration-200 rounded-xl pr-1 mb-4 ${isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50'}`}
                                  onClick={() => setExpandedItemId(isExpanded ? null : item.id.toString())}
                                >
                                  {/* Left border indicator */}
                                  <div className={`absolute left-1 top-2 bottom-2 w-1 rounded-full ${item.category === "furniture" ? "bg-blue-500" : "bg-amber-500"}`} />
                                  
                                  {/* Item Name */}
                                  <div className="w-[45%] pr-2 pl-2">
                                    <span className="text-[15px] font-medium leading-snug block transition-colors text-slate-900 font-bold">{item.name}</span>
                                  </div>

                                  {/* Quantity */}
                                  <div className="w-[25%] text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[15px] font-semibold text-slate-700">
                                        {item.quantity} <span className="text-sm font-medium">{formatUnit(item.unit)}</span>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Rate */}
                                  <div className="w-[25%] text-right">
                                    <span className="text-[15px] font-bold text-slate-800">{formatCurrency(item.amount).replace('₹', '')}</span>
                                  </div>

                                  {/* Expand/Collapse Arrow */}
                                  <div className="w-[5%] flex justify-center">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                  <div className="pb-2 animate-in fade-in slide-in-from-top-4 duration-300 ease-out">
                                    {/* Base Price and Purchased Price */}
                                    <div className="flex gap-3 mb-6">
                                      <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">BASE PRICE</div>
                                        <div className="text-xl font-bold text-slate-800">{formatCurrency(item.rate).replace('₹', '')}</div>
                                      </div>
                                      <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative">
                                        <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">PURCHASED PRICE</div>
                                        {isAdmin ? (
                                          <div className="relative">
                                            <input
                                              type="number"
                                              value={
                                                editingPurchaseRate[item.id.toString()] !== undefined 
                                                  ? (editingPurchaseRate[item.id.toString()] === null ? '' : String(editingPurchaseRate[item.id.toString()]))
                                                  : (item.purchaseRate !== null && item.purchaseRate !== undefined ? String(item.purchaseRate) : String(item.rate))
                                              }
                                              onChange={(e) => {
                                                const value = e.target.value === '' ? null : Number(e.target.value);
                                                setEditingPurchaseRate({ ...editingPurchaseRate, [item.id.toString()]: value });
                                              }}
                                              onBlur={(e) => {
                                                const inputValue = e.target.value;
                                                const currentPurchaseRate = item.purchaseRate !== null && item.purchaseRate !== undefined ? item.purchaseRate : item.rate;
                                                
                                                if (inputValue === '') {
                                                  // If empty, default to rate (base price)
                                                  const defaultValue = item.rate;
                                                  if (defaultValue !== currentPurchaseRate) {
                                                    handleUpdateBOQItem(item.id.toString(), undefined, defaultValue);
                                                  } else {
                                                    setEditingPurchaseRate({ ...editingPurchaseRate, [item.id.toString()]: defaultValue });
                                                  }
                                                } else {
                                                  const value = Number(inputValue);
                                                  if (!isNaN(value) && value >= 0 && value !== currentPurchaseRate) {
                                                    handleUpdateBOQItem(item.id.toString(), undefined, value);
                                                  } else if (isNaN(value) || value < 0) {
                                                    // Reset to original value if invalid
                                                    setEditingPurchaseRate({ ...editingPurchaseRate, [item.id.toString()]: currentPurchaseRate });
                                                  }
                                                }
                                              }}
                                              placeholder="Enter purchased price"
                                              className="text-xl font-bold text-slate-800 w-full bg-transparent border-none outline-none focus:bg-slate-50 rounded px-2 -ml-2"
                                              disabled={updatingItemId === item.id.toString()}
                                              min="0"
                                              step="0.01"
                                            />
                                            {updatingItemId === item.id.toString() && (
                                              <div className="absolute right-2 top-0 bottom-0 flex items-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-xl font-bold text-slate-800">
                                            {item.purchaseRate !== null && item.purchaseRate !== undefined ? formatCurrency(item.purchaseRate).replace('₹', '') : formatCurrency(item.rate).replace('₹', '')}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center justify-between mb-8 bg-slate-50/50 p-2 rounded-xl border border-slate-50">
                                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-2">QUANTITY</span>
                                      <div className="flex items-center gap-2">
                                        <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formatUnit(item.unit)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isAdmin ? (
                                            <>
                                              <button 
                                                className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (item.quantity > 1 && updatingItemId !== item.id.toString()) {
                                                    handleUpdateBOQItem(item.id.toString(), item.quantity - 1);
                                                  }
                                                }}
                                                disabled={item.quantity <= 1 || updatingItemId === item.id.toString()}
                                              >
                                                <Minus className="w-4 h-4 stroke-[3]" />
                                              </button>
                                              <div className="w-12 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white text-base font-bold shadow-lg shadow-slate-800/20">
                                                {updatingItemId === item.id.toString() ? (
                                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                ) : (
                                                  item.quantity
                                                )}
                                              </div>
                                              <button 
                                                className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (updatingItemId !== item.id.toString()) {
                                                    handleUpdateBOQItem(item.id.toString(), item.quantity + 1);
                                                  }
                                                }}
                                                disabled={updatingItemId === item.id.toString()}
                                              >
                                                <Plus className="w-4 h-4 stroke-[3]" />
                                              </button>
                                            </>
                                          ) : (
                                            <div className="w-12 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white text-base font-bold shadow-lg shadow-slate-800/20">
                                              {item.quantity}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Documentation */}
                                    <div className="mb-8">
                                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">DOCUMENTATION</div>
                                      <div className="flex gap-2">
                                        {item.bill ? (
                                          <a
                                            href={item.bill.startsWith('http') ? item.bill : `${import.meta.env.BACKEND_URL || import.meta.env.VITE_API_BASE_URL || ''}${item.bill}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            Bill
                                          </a>
                                        ) : (
                                          isAdmin && (
                                            <label className="flex-1 py-2 rounded-lg border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                              <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                className="hidden"
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0];
                                                  if (file) {
                                                    handleUploadBOQFile(item.id.toString(), file, 'bill');
                                                  }
                                                }}
                                                disabled={uploadingFiles[item.id.toString()] === 'bill'}
                                              />
                                              {uploadingFiles[item.id.toString()] === 'bill' ? (
                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-400"></div>
                                              ) : (
                                                <Plus className="w-3.5 h-3.5" />
                                              )}
                                              Bill
                                            </label>
                                          )
                                        )}
                                        {item.photo ? (
                                          <a
                                            href={item.photo.startsWith('http') ? item.photo : `${import.meta.env.BACKEND_URL || import.meta.env.VITE_API_BASE_URL || ''}${item.photo}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Image className="w-3.5 h-3.5" />
                                            Photo
                                          </a>
                                        ) : (
                                          isAdmin && (
                                            <label className="flex-1 py-2 rounded-lg border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                              <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                  const file = e.target.files?.[0];
                                                  if (file) {
                                                    handleUploadBOQFile(item.id.toString(), file, 'photo');
                                                  }
                                                }}
                                                disabled={uploadingFiles[item.id.toString()] === 'photo'}
                                              />
                                              {uploadingFiles[item.id.toString()] === 'photo' ? (
                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-400"></div>
                                              ) : (
                                                <Plus className="w-3.5 h-3.5" />
                                              )}
                                              Photo
                                            </label>
                                          )
                                        )}
                                      </div>
                                    </div>

                                    {/* Collapse Button */}
                                    <div className="flex justify-center">
                                      <button 
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors py-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedItemId(null);
                                        }}
                                      >
                                        COLLAPSE
                                        <ChevronUp className="w-3 h-3 stroke-[3]" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-slate-100 w-full mb-5"></div>

                        {/* Subtotal */}
                        <div className="flex justify-between items-end mb-6 px-1">
                          <span className="text-slate-500 font-medium text-base mb-1">Subtotal</span>
                          <span className="text-2xl font-bold text-slate-800 tracking-tight">{formatCurrency(roomSubtotal).replace('₹', '')}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleExportPDF(room)}
                            disabled={room.items.length === 0}
                            className={`flex-1 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-800/10 ${room.items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Download className="w-4 h-4" />
                            Export PDF
                          </button>
                          <button
                            onClick={() => handleShareBOQ(room)}
                            className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                            Share BOQ
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <p className="text-sm">No items added to this room yet.</p>
                        <p className="text-xs mt-1">Click "Add Item" to get started.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}


      </div>
    </>

  );
};

export default BOQ;

