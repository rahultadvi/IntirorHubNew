import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
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
  Lock,
  Unlock,
  Upload,
} from "lucide-react";
import { useSite } from "../context/SiteContext";
import {  useAuth } from "../context/AuthContext";
import { boqApi, libraryApi, materialApi, type MaterialDto } from "../services/api";
// import libraryData from "../data/libraryData";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// import BoqLibrary from "../component/BoqLibrary";

interface BOQItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  purchaseRate?: number | null;
  amount: number;
  category: "Furniture" | "Finishes" | "Hardware" | "Electrical" | "Miscellaneous" | string;
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
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [editingPurchaseRate, setEditingPurchaseRate] = useState<Record<string, number | null>>({});
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, 'bill' | 'photo' | null>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lockedRooms, setLockedRooms] = useState<Set<string>>(new Set());
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const { activeSite } = useSite();
  const location = useLocation();

  // Check for action=add query parameter to open modal
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
    }
  }, [location.search]);

  const [selectedCategory, setSelectedCategory] = useState<"All" | "Furniture" | "Finishes" | "Hardware" | "Electrical" | "Miscellaneous">("All");
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
  "All" | "Furniture" | "Finishes" | "Hardware" | "Electrical"
>("All");

// 🔍 Library search & category (SAFE)
const [librarySearch, setLibrarySearch] = useState("");
const [libraryCategory, setLibraryCategory] = useState<
  "All" | "Furniture" | "Finishes" | "Hardware" | "Electrical"
>("All");


  interface LibraryItem {
  _id: string;
  name: string;
  companyName?: string;
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

// Handle library import from CSV/Excel
const handleLibraryImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const validExtensions = ['.csv', '.xls', '.xlsx'];
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
    alert('Please upload a valid CSV or Excel file (.csv, .xls, .xlsx)');
    e.target.value = '';
    return;
  }

  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      alert('CSV file must have at least a header row and one data row');
      e.target.value = '';
      return;
    }

    // Parse CSV - handle both comma and tab separated values
    const separator = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase()).filter(h => h);
    
    // Required headers: name, category, qty, ratePerQty, description, tag
    const requiredHeaders = ['name', 'category', 'qty', 'rateperqty', 'description', 'tag'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      alert(`Missing required columns: ${missingHeaders.join(', ')}. Please use the sample file format with columns: name, category, qty, ratePerQty, description, tag`);
      e.target.value = '';
      return;
    }

    // Helper function to extract number from currency string (e.g., "₹18,000" -> 18000)
    const extractNumber = (str: string): number => {
      if (!str) return 0;
      // Remove currency symbols, commas, spaces, and extract number
      const numStr = str.toString().replace(/[₹,\s/]/g, '').replace(/[^0-9.]/g, '');
      return parseFloat(numStr) || 0;
    };

    // Helper function to map tag to category
    const tagToCategory = (tag: string): string => {
      const normalizedTag = (tag || '').trim().toUpperCase();
      if (['BEDS', 'WARDROBE', 'WAREDROBES', 'TV UNIT', 'SHOE RACK'].includes(normalizedTag)) {
        return 'Furniture';
      }
      if (normalizedTag.includes('ELECTRICAL') || normalizedTag.includes('LIGHT') || normalizedTag.includes('APPLICES')) {
        return 'Electrical';
      }
      if (normalizedTag.includes('DOOR') || normalizedTag.includes('BATHROOM')) {
        return 'Hardware';
      }
      if (normalizedTag.includes('FLOOR') || normalizedTag.includes('WALL') || normalizedTag.includes('CELLING') || normalizedTag.includes('CEILING')) {
        return 'Finishes';
      }
      return 'Furniture'; // Default
    };

    const items: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, '')); // Remove quotes
      const item: any = {};
      
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          item[header] = values[index] || '';
        }
      });

      // Validate required fields are present and not empty
      if (!item.name || !item.name.trim()) {
        continue; // Skip rows without name
      }

      if (!item.category || !item.category.trim()) {
        // Category is required - derive from tag if missing
        if (item.tag && item.tag.trim()) {
          item.category = tagToCategory(item.tag);
        } else {
          alert(`Row ${i + 1}: Missing required field 'category' for item "${item.name}". Please provide category or tag.`);
          e.target.value = '';
          return;
        }
      }

      if (!item.qty || isNaN(parseFloat(item.qty))) {
        alert(`Row ${i + 1}: Missing or invalid 'qty' for item "${item.name}"`);
        e.target.value = '';
        return;
      }

      if (!item.rateperqty || (!extractNumber(item.rateperqty) && extractNumber(item.rateperqty) === 0)) {
        alert(`Row ${i + 1}: Missing or invalid 'ratePerQty' for item "${item.name}"`);
        e.target.value = '';
        return;
      }

      // Extract rate (handle currency format)
      const extractedRate = extractNumber(item.rateperqty);

      items.push({
        name: item.name.trim(),
        Category: item.category.trim(),
        qty: parseFloat(item.qty) || 1,
        ratePerQty: extractedRate,
        baseRate: extractedRate,
        description: (item.description || '').trim(),
        tag: (item.tag || '').trim(),
      });
    }

    if (items.length === 0) {
      alert('No valid items found in the file');
      e.target.value = '';
      return;
    }

    // Convert items to JSON and send all in one request
    try {
      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/library/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully imported ${result.count || items.length} item(s)`);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import items');
      }
    } catch (error: any) {
      console.error('Bulk import error:', error);
      alert(error.message || 'Failed to import items. Please check the file format.');
      e.target.value = '';
      return;
    }
    
    // Refresh library items
    await fetchLibraryItems();
    e.target.value = '';
  } catch (error: any) {
    console.error('Import error:', error);
    alert(error.message || 'Failed to import items. Please check the file format.');
    e.target.value = '';
  }
};

// Download sample CSV file
const handleDownloadSampleFile = async () => {
  try {
    // Fetch the sample file from the public directory
    const response = await fetch('/sample_library.csv');
    if (!response.ok) {
      throw new Error('Failed to fetch sample file');
    }
    const csvContent = await response.text();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_library.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading sample file:', error);
    // Fallback: create sample data if file fetch fails
    const sampleData = [
      ['name', 'category', 'qty', 'ratePerQty', 'description', 'tag'],
      ['King Size Bed', 'Furniture', '1', '18000', 'Premium bed frame', 'BEDS'],
      ['Wardrobe 8ft', 'Furniture', '1', '45000', '8 feet wardrobe', 'WARDROBE'],
      ['TV Unit 6ft', 'Furniture', '1', '25000', '6 feet TV unit', 'TV UNIT'],
      ['Floor Tiles', 'Finishes', '100', '80', 'Premium tiles', 'FLOOR'],
      ['LED Lights', 'Electrical', '10', '500', 'LED ceiling lights', 'ELECTRICAL'],
    ];
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_library.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
    category: 'Furniture' as 'Furniture' | 'Finishes' | 'Hardware' | 'Electrical' | 'Miscellaneous',
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
            category: item.category || 'Furniture', // Use category from item, default to 'Furniture'
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
  category: "Finishes" as "Furniture" | "Finishes" | "Hardware" | "Electrical",
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
    const { boqItems, lockedRooms } = response as {
      boqItems: Record<string, any[]>;
      lockedRooms?: string[];
      stats: any;
    };

    setBoqItems(Object.values(boqItems || {}).flat());
    
    // Update locked rooms from API response
    if (lockedRooms && Array.isArray(lockedRooms)) {
      setLockedRooms(new Set(lockedRooms));
    }
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
    showToast("Failed to update BOQ item. Please try again.", 'error');
  } finally {
    setUpdatingItemId(null);
  }
};

const handleDeleteBOQItem = async (itemId: string) => {
  if (!token || !isAdmin) return;
  
  if (!window.confirm("Are you sure you want to delete this BOQ item? This action cannot be undone.")) {
    return;
  }

  try {
    await boqApi.deleteBOQItem(itemId, token);
    await fetchBOQItems();
    setExpandedItemId(null); // Close expanded view after deletion
    showToast("BOQ item deleted successfully!");
  } catch (error) {
    console.error("Failed to delete BOQ item", error);
    showToast("Failed to delete BOQ item. Please try again.", 'error');
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
    showToast("Failed to upload file. Please try again.", 'error');
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
    !boqForm.itemName ||
    !boqForm.quantity ||
    !boqForm.rate
  ) {
    showToast("Please fill all required fields", 'error');
    return;
  }

  const quantity = parseFloat(boqForm.quantity);
  const rate = parseFloat(boqForm.rate);

  if (isNaN(quantity) || isNaN(rate)) {
    showToast("Quantity and Rate must be valid numbers", 'error');
    return;
  }

  // Set default roomName if not set (use first available room)
  const roomNameToUse = boqForm.roomName || (allRoomNames.length > 0 ? allRoomNames[0] : '');
  if (!roomNameToUse) {
    showToast("No rooms available. Please add a room first.", 'error');
    return;
  }

  // When adding, purchaseRate equals rate (purchased price = base price initially)
  const purchaseRate = rate;
  // totalCost will be calculated on the backend using purchaseRate (final price)

  // 📦 Base payload
  const payload: any = {
    roomName: roomNameToUse,
    itemName: boqForm.itemName,
    quantity,
    unit: boqForm.unit,
    rate, // Base price
    purchaseRate: purchaseRate, // Purchased price = final price (used in calculation)
    category: boqForm.category,
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
      category: "Furniture",
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
    showToast("Failed to add BOQ item. Please try again.", 'error');
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

  // Generate a PDF from HTML template using html2canvas (Payment/Invoice style)
  const generatePDFFromElement = async (room: Room) => {
    try {
      if (!room.items || room.items.length === 0) {
        throw new Error('No items to export');
      }

      // Calculate summary by category
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

      // Calculate totals
      let totalBaseAmount = 0;
      let totalPurchaseAmount = 0;
      room.items.forEach((item) => {
        totalBaseAmount += item.quantity * item.rate;
        const purchaseRate = item.purchaseRate !== null && item.purchaseRate !== undefined ? item.purchaseRate : item.rate;
        totalPurchaseAmount += item.quantity * purchaseRate;
      });

      const generatedDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

      const generatedDateTime = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      // Create a hidden div for report rendering
      const reportDiv = document.createElement('div');
      reportDiv.style.position = 'absolute';
      reportDiv.style.left = '-9999px';
      reportDiv.style.width = '800px';
      reportDiv.style.padding = '0';
      reportDiv.style.backgroundColor = '#ffffff';
      reportDiv.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

      // Generate item rows with proper table formatting
      const itemRows = room.items.map((item, index) => {
        const baseAmount = item.quantity * item.rate;
        const purchaseRate = item.purchaseRate !== null && item.purchaseRate !== undefined ? item.purchaseRate : item.rate;
        const purchaseAmount = item.quantity * purchaseRate;
        const categoryDisplay = typeof item.category === 'string' ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : (item.category || 'N/A');
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        
        return `
          <tr style="border-bottom: 1px solid #e5e7eb; background-color: ${rowBg};">
            <td style="padding: 12px 10px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 50px;">${index + 1}</td>
            <td style="padding: 12px 10px; font-size: 12px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; min-width: 200px;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #111827; line-height: 1.4;">${(item.name || 'N/A').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">
                <span style="color: #111827; padding: 2px 8px; border-radius: 10px; font-weight: 500; display: inline-block;">${categoryDisplay}</span>
              </div>
            </td>
            <td style="padding: 12px 10px; text-align: center; font-size: 12px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 100px;">
              <div style="font-weight: 600; margin-bottom: 2px;">${item.quantity}</div>
              <div style="font-size: 10px; color: #6b7280;">${formatUnit(item.unit)}</div>
            </td>
            <td style="padding: 12px 10px; text-align: right; font-size: 12px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 100px; white-space: nowrap;">${formatCurrency(item.rate)}</td>
            <td style="padding: 12px 10px; text-align: right; font-size: 12px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 100px; white-space: nowrap;">${formatCurrency(purchaseRate)}</td>
            <td style="padding: 12px 10px; text-align: right; font-size: 12px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 110px; white-space: nowrap;">${formatCurrency(baseAmount)}</td>
            <td style="padding: 12px 10px; text-align: right; font-size: 12px; color: #059669; font-weight: 600; vertical-align: middle; width: 120px; white-space: nowrap;">${formatCurrency(purchaseAmount)}</td>
          </tr>
        `;
      }).join('');

      // Generate category summary rows
      const categoryRows = Object.entries(categorySummary).map(([category, summary]) => {
        const categoryDisplay = category.charAt(0).toUpperCase() + category.slice(1);
        return `
          <div style="display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: #111827; padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 600;">${categoryDisplay}</span>
              <div style="font-weight: 600; color: #111827; font-size: 14px;">${summary.count} items</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">Base: ${formatCurrency(summary.totalBaseAmount)}</div>
              <div style="font-weight: 600; color: #059669; font-size: 14px;">Purchase: ${formatCurrency(summary.totalPurchaseAmount)}</div>
            </div>
          </div>
        `;
      }).join('');

      const siteName = activeSite?.name || 'N/A';
      const companyName = user?.companyName || '';
      const siteByCompany = companyName ? `${siteName} By ${companyName}` : siteName;

      reportDiv.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; background: white;">
          <!-- Header with Gradient -->
          <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px 48px; color: white; border-radius: 12px 12px 0 0;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
              <div>
                <h2 style="font-size: 32px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px;">BILL OF QUANTITIES</h2>
                <p style="font-size: 16px; margin: 0; opacity: 0.9; font-weight: 400;">${siteByCompany}</p>
              </div>
              <div style="text-align: right; background: rgba(255, 255, 255, 0.1); padding: 16px 20px; border-radius: 12px; backdrop-filter: blur(10px);">
                <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Document Date</div>
                <div style="font-size: 16px; font-weight: 600;">${generatedDate}</div>
              </div>
            </div>
          </div>
          
          <!-- Report Content -->
          <div style="padding: 48px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <!-- Project Info Section -->
            <div style="margin-bottom: 32px; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Project / Site</div>
                  <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${activeSite?.name || 'N/A'}</div>
                </div>
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Room / Area</div>
                  <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${room.name}</div>
                </div>
              </div>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #cbd5e1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Total Items</div>
                    <div style="font-size: 24px; font-weight: 700; color: #0f172a;">${room.items.length}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Generated On</div>
                    <div style="font-size: 13px; font-weight: 500; color: #475569;">${generatedDateTime}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Category Summary -->
            <div style="margin-bottom: 40px;">
              <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">Summary by Category</h3>
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                ${categoryRows}
              </div>
            </div>
            
            <!-- BOQ Items Table -->
            <div style="margin-bottom: 32px;">
              <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">Detailed Items</h3>
              <div style="overflow-x: visible; border: 2px solid #e5e7eb; border-radius: 12px; background: white;">
                <table style="width: 100%; border-collapse: collapse; background: white; table-layout: fixed;">
                  <thead>
                    <tr style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%);">
                      <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 50px;">S.No</th>
                      <th style="padding: 14px 10px; text-align: left; font-size: 11px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); min-width: 200px;">Item Description</th>
                      <th style="padding: 14px 10px; text-align: center; font-size: 11px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 100px;">Quantity</th>
                      <th style="padding: 14px 10px; text-align: right; font-size: 11px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 100px;">Base Rate</th>
                      <th style="padding: 14px 10px; text-align: right; font-size: 11px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 100px;">Purchase Rate</th>
                      <th style="padding: 14px 10px; text-align: right; font-size: 11px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 110px;">Base Amount</th>
                      <th style="padding: 14px 10px; text-align: right; font-size: 11px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; width: 120px;">Purchase Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Total Amounts Section -->
            <div style="margin-top: 40px;">
              <div style="padding: 24px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 2px solid #86efac;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 2px solid #86efac;">
                  <div style="font-size: 16px; font-weight: 600; color: #166534;">Total Base Amount:</div>
                  <div style="font-size: 20px; font-weight: 700; color: #166534;">${formatCurrency(totalBaseAmount)}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 20px; font-weight: 700; color: #166534;">Total Purchase Amount:</div>
                  <div style="font-size: 32px; font-weight: 800; color: #059669; letter-spacing: -0.5px;">${formatCurrency(totalPurchaseAmount)}</div>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 48px; padding-top: 32px; border-top: 2px solid #e5e7eb;">
              <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-bottom: 16px;">
                <p style="margin: 0 0 8px 0; font-weight: 500;">This is a computer-generated Bill of Quantities. No signature required.</p>
                <p style="margin: 0;">Generated on ${generatedDateTime} by SiteZero</p>
              </div>
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #f3f4f6;">
                <p style="margin: 0; color: #6b7280; font-size: 11px; font-weight: 500; letter-spacing: 0.5px;">Powered by <span style="color: #1e293b; font-weight: 700;">SiteZero</span> - Professional Interior Design Management</p>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(reportDiv);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 200));

      // Convert to PDF using html2canvas and jsPDF
      const canvas = await html2canvas(reportDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: reportDiv.scrollWidth,
        height: reportDiv.scrollHeight,
      });

      // Clean up
      document.body.removeChild(reportDiv);

      const pdf = new jsPDF('p', 'mm', 'a4');

      // Define margins to avoid cut edges
      const marginTop = 25; // mm - space for header
      const marginBottom = 30; // mm - space for footer
      const marginLeft = 10; // mm
      const marginRight = 10; // mm
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pdfWidth - marginLeft - marginRight;
      const contentHeight = pdfHeight - marginTop - marginBottom;
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Convert pixels to mm (96 DPI = 96 pixels per inch = 3.7795 pixels per mm)
      const pixelsToMm = 0.264583;
      const imgWidthMm = imgWidth * pixelsToMm;
      const imgHeightMm = imgHeight * pixelsToMm;
      
      // Calculate ratio to fit content width
      const ratio = contentWidth / imgWidthMm;
      const scaledWidth = contentWidth;
      const scaledHeight = imgHeightMm * ratio;
      
      // Calculate total pages needed
      const totalPages = Math.ceil(scaledHeight / contentHeight) || 1;

      // Helper function to add header on each page
      const addHeader = (pageNum: number) => {
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59); // slate-800
        pdf.setFont('helvetica', 'bold');
        
        // Left side - Document title
        pdf.text('BILL OF QUANTITIES', marginLeft, 12);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const siteText = siteByCompany.length > 50 ? siteByCompany.substring(0, 47) + '...' : siteByCompany;
        pdf.text(siteText, marginLeft, 16);
        
        // Right side - Page number and Date
        const pageText = `Page ${pageNum} of ${totalPages}`;
        const pageTextWidth = pdf.getTextWidth(pageText);
        pdf.setFont('helvetica', 'bold');
        pdf.text(pageText, pdfWidth - marginRight - pageTextWidth, 12);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(generatedDate, pdfWidth - marginRight - pageTextWidth, 16);
        
        // Header line
        pdf.setDrawColor(226, 232, 240); // slate-200
        pdf.setLineWidth(0.5);
        pdf.line(marginLeft, 20, pdfWidth - marginRight, 20);
      };

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
        // Add header and footer before adding content
        addHeader(currentPage);
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

      return pdf;
    } catch (error) {
      console.error('Error in generatePDFFromElement:', error);
      throw error;
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
        showToast('No items found in this room to export.', 'error');
        return;
      }

      // Try full PDF generation
      const pdf = await generatePDFFromElement(room);
      const projectName = activeSite?.name || 'Project';
      const filename = `${projectName}_${room.name}_BOQ_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      showToast(`PDF downloaded successfully as: ${filename}`);
    } catch (err) {
      console.error('Simple PDF export failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to generate PDF: ${errorMessage}`, 'error');
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
    if (selectedCategory === "All") return items;
    return items.filter(item => {
      // Normalize category for comparison (handle case differences)
      const itemCategory = typeof item.category === 'string' ? item.category : '';
      return itemCategory.toLowerCase() === selectedCategory.toLowerCase();
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getCategoryColor = (category: string | undefined): string => {
    if (!category) return 'bg-slate-400';
    const normalizedCategory = category.toLowerCase();
    if (normalizedCategory.includes('furniture')) return 'bg-blue-500';
    if (normalizedCategory.includes('finishes')) return 'bg-emerald-500';
    if (normalizedCategory.includes('hardware')) return 'bg-amber-500';
    if (normalizedCategory.includes('electrical')) return 'bg-purple-500';
    if (normalizedCategory.includes('miscellaneous') || normalizedCategory.includes('misc')) return 'bg-slate-500';
    return 'bg-slate-400'; // Default color
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

  // Generate PDF report for all materials using HTML template
  const generateMaterialsPDF = async () => {
    try {
      if (!materials || materials.length === 0) {
        showToast('No materials found to export.', 'error');
        return;
      }

      // Calculate summary by category
      const categorySummary: Record<string, { count: number; totalCost: number }> = {};
      materials.forEach((material) => {
        const cat = material.category || 'Other';
        if (!categorySummary[cat]) {
          categorySummary[cat] = { count: 0, totalCost: 0 };
        }
        categorySummary[cat].count++;
        categorySummary[cat].totalCost += material.cost;
      });

      const totalCost = materials.reduce((sum, m) => sum + (m.cost || 0), 0);
      const generatedDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

      const siteName = activeSite?.name || 'N/A';
      const companyName = user?.companyName || '';
      const siteByCompany = companyName ? `${siteName} By ${companyName}` : siteName;

      // Create a hidden div for report rendering
      const reportDiv = document.createElement('div');
      reportDiv.style.position = 'absolute';
      reportDiv.style.left = '-9999px';
      reportDiv.style.width = '800px';
      reportDiv.style.padding = '40px';
      reportDiv.style.backgroundColor = '#ffffff';
      reportDiv.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

      // Generate materials table rows
      const materialsRows = materials.map((material, index) => {
        const descriptionParts = material.description?.split("•") || [];
        const brand = descriptionParts[0]?.trim() || "";
        const model = descriptionParts[1]?.trim() || "";
        const hasWarranty = !!(material.warranty?.duration || material.warranty?.model);
        const warrantyInfo = hasWarranty 
          ? `${material.warranty?.duration || ''}${material.warranty?.model ? ` • ${material.warranty.model}` : ''}`.trim()
          : 'N/A';

        return `
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 12px 8px; text-align: center; font-size: 13px; color: #6b7280; font-weight: 500;">${index + 1}</td>
            <td style="padding: 12px 8px; font-size: 13px; color: #111827; font-weight: 500;">
              <div style="font-weight: 600; margin-bottom: 4px;">${material.name || 'N/A'}</div>
              ${brand || model ? `<div style="font-size: 11px; color: #6b7280;">${brand}${model ? ` • ${model}` : ''}</div>` : ''}
            </td>
            <td style="padding: 12px 8px; font-size: 13px; color: #111827; font-weight: 500;">${material.category || 'N/A'}</td>
            <td style="padding: 12px 8px; font-size: 13px; color: #111827; font-weight: 500;">${material.installedAt || 'N/A'}</td>
            <td style="padding: 12px 8px; font-size: 13px; color: #111827; font-weight: 500;">
              ${material.vendor?.name || 'N/A'}${material.vendor?.city ? `<br><span style="font-size: 11px; color: #6b7280;">${material.vendor.city}</span>` : ''}
            </td>
            <td style="padding: 12px 8px; text-align: right; font-size: 13px; color: #111827; font-weight: 600;">${formatCurrency(material.cost || 0)}</td>
            <td style="padding: 12px 8px; font-size: 12px; color: #6b7280; font-weight: 400;">${warrantyInfo}</td>
          </tr>
        `;
      }).join('');

      // Generate category summary rows
      const categoryRows = Object.entries(categorySummary).map(([category, summary]) => `
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          <div style="font-weight: 600; color: #111827; font-size: 14px;">${category}</div>
          <div style="font-weight: 600; color: #6b7280; font-size: 14px;">${summary.count} items</div>
          <div style="font-weight: 600; color: #059669; font-size: 14px; text-align: right;">${formatCurrency(summary.totalCost)}</div>
        </div>
      `).join('');

      reportDiv.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; background: white; padding: 0;">
          <!-- Header with Company Name -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 48px; border-radius: 12px 12px 0 0; color: white;">
            <h2 style="font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: 0.5px;">${siteByCompany}</h2>
            <p style="font-size: 14px; margin: 0; opacity: 0.95;">Material Used Report</p>
          </div>
          
          <!-- Report Content -->
          <div style="padding: 48px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <!-- Report Title -->
            <div style="text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb;">
              <h1 style="font-size: 36px; font-weight: 700; color: #111827; margin: 0 0 8px 0; letter-spacing: 1px;">MATERIAL USED REPORT</h1>
              <p style="font-size: 16px; color: #6b7280; margin: 0;">Complete Material Inventory</p>
            </div>
            
            <!-- Report Details -->
            <div style="margin-bottom: 32px;">
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Site/Project:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right;">${activeSite?.name || 'N/A'}</div>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Total Materials:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right;">${materials.length}</div>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 16px 0;">
                <div style="font-weight: 600; color: #6b7280; font-size: 14px;">Generated Date:</div>
                <div style="font-weight: 500; color: #111827; font-size: 14px; text-align: right;">${generatedDate}</div>
              </div>
            </div>

            <!-- Category Summary -->
            <div style="margin-bottom: 40px; padding: 24px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
              <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 20px 0;">Summary by Category</h3>
              ${categoryRows}
              <div style="display: flex; justify-content: space-between; padding: 16px 0 0 0; margin-top: 16px; border-top: 2px solid #e5e7eb;">
                <div style="font-weight: 700; color: #111827; font-size: 16px;">Total</div>
                <div style="font-weight: 700; color: #059669; font-size: 16px; text-align: right;">${formatCurrency(totalCost)}</div>
              </div>
            </div>
            
            <!-- Materials Table -->
            <div style="margin-bottom: 32px;">
              <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 20px 0;">Material Details</h3>
              <table style="width: 100%; border-collapse: collapse; background: white;">
                <thead>
                  <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                    <th style="padding: 14px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">S.No</th>
                    <th style="padding: 14px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Material Name</th>
                    <th style="padding: 14px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Category</th>
                    <th style="padding: 14px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Installed At</th>
                    <th style="padding: 14px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Vendor</th>
                    <th style="padding: 14px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Cost</th>
                    <th style="padding: 14px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Warranty</th>
                  </tr>
                </thead>
                <tbody>
                  ${materialsRows}
                </tbody>
              </table>
            </div>
            
            <!-- Total Cost Section -->
            <div style="margin-top: 40px; padding: 32px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; border: 2px solid #bae6fd; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 20px; font-weight: 600; color: #0c4a6e;">Total Cost:</div>
                <div style="font-size: 36px; font-weight: 700; color: #059669; letter-spacing: -0.5px;">${formatCurrency(totalCost)}</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 48px; padding-top: 32px; border-top: 2px solid #e5e7eb;">
              <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-bottom: 16px;">
                <p style="margin: 0 0 8px 0;">This is a computer-generated report. No signature required.</p>
                <p style="margin: 0;">Generated on ${new Date().toLocaleString("en-IN")}</p>
              </div>
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #f3f4f6;">
                <p style="margin: 0; color: #6b7280; font-size: 11px; font-weight: 500; letter-spacing: 0.5px;">Powered by <span style="color: #667eea; font-weight: 600;">SiteZero</span></p>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(reportDiv);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Convert to PDF using html2canvas and jsPDF
      const canvas = await html2canvas(reportDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Clean up
      document.body.removeChild(reportDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;

      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
      
      const filenameSiteName = (activeSite?.name || 'Materials').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${filenameSiteName}_Materials_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      showToast(`PDF report downloaded successfully as: ${filename}`);
    } catch (error) {
      console.error('Error generating materials PDF:', error);
      showToast('Failed to generate PDF report. Please try again.', 'error');
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
      showToast(error.message || "Failed to add material", 'error');
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
      showToast(error.message || "Failed to update material", 'error');
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
      showToast("Failed to delete material", 'error');
    }
  };

  const handleEditMaterial = (material: MaterialDto) => {
    setEditingMaterial(material);
    // Handle legacy "Electronics" category by mapping to "Electrical"
    const category = (material.category as string) === "Electronics" ? "Electrical" : material.category;
    setMaterialForm({
      category: category as "Furniture" | "Finishes" | "Hardware" | "Electrical",
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
      // Map legacy "Electronics" category to "Electrical" for filtering
      const itemCategory = (item.category as string) === "Electronics" ? "Electrical" : item.category;
      const categoryMatch =
        materialCategory === "All" ||
        itemCategory === materialCategory;
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
      <div className="min-h-screen pb-28 relative">
        {/* Centered Container */}
        <div className="max-w-md mx-auto px-4 py-4">
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
                className={`flex-1 py-4 px-2 text-xs font-bold rounded-xl transition-all duration-200 ${
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
<div className="mb-4 flex items-center justify-between">
  <div className="flex-1 text-center">
    <h2 className="text-xl font-bold text-slate-800">
      BOQ Library
    </h2>
    <p className="text-sm text-slate-500 mt-1">
      Pre-built items for faster estimation
    </p>
  </div>
  <div className="flex items-center gap-4">
   
    <button
      onClick={handleDownloadSampleFile}
      className="text-sm font-medium text-blue-600 hover:text-blue-700 underline hover:no-underline transition-all"
    >
       Sample
    </button>
  </div>
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

  <label htmlFor="library-import-file" className="flex items-center justify-center w-9 h-9 bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors shadow-md hover:shadow-lg" title="Import CSV/Excel">
      <Upload className="w-4 h-4" />
      <input
        id="library-import-file"
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => handleLibraryImport(e)}
      />
    </label>
</div>

            {/* CATEGORY PILLS */}
            <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
  {(["All", "Furniture", "Finishes", "Hardware", "Electrical"] as const).map((cat) => (
    <button
      key={cat}
      onClick={() => setLibraryCategory(cat)}
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

              {filteredLibraryItems.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="mb-6">
                      <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">No Library Items</h3>
                      <p className="text-sm text-slate-500 mb-6">Import CSV/Excel file to add items to your library</p>
                    </div>
                    
                    <div className="mb-6">
                      <label htmlFor="library-import-file-empty" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 cursor-pointer transition-colors shadow-md hover:shadow-lg">
                        <Upload className="w-5 h-5" />
                        Import CSV/Excel
                        <input
                          id="library-import-file-empty"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={(e) => handleLibraryImport(e)}
                        />
                      </label>
                    </div>

                    {/* Sample File Display */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700">Sample File Format</h4>
                        <button
                          onClick={handleDownloadSampleFile}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                        >
                          Download Sample
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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
        showToast("Please enter a valid rate", 'error');
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
      showToast("Failed to update rate. Please try again.", 'error');
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
      // Get category from library item - normalize to match BOQ category format
      const getCategoryFromLibrary = (): "Furniture" | "Finishes" | "Hardware" | "Electrical" | "Miscellaneous" => {
        const category = item.Category || "";
        const tag = (item.tag || "").toUpperCase();
        
        // Check category first
        if (category) {
          const normalizedCategory = category.toLowerCase();
          if (normalizedCategory.includes('furniture')) return "Furniture";
          if (normalizedCategory.includes('finishes')) return "Finishes";
          if (normalizedCategory.includes('hardware')) return "Hardware";
          if (normalizedCategory.includes('electrical') || normalizedCategory.includes('electronics')) return "Electrical";
          if (normalizedCategory.includes('miscellaneous') || normalizedCategory.includes('misc')) return "Miscellaneous";
        }
        
        // Check tag for category hints
        if (tag.includes("ELECTRICAL") || tag.includes("LIGHT") || tag.includes("ELECTRONIC")) return "Electrical";
        if (tag.includes("FLOOR") || tag.includes("WALL") || tag.includes("CEILING") || tag.includes("PAINT") || tag.includes("LAMINATE")) return "Finishes";
        if (tag.includes("HARDWARE") || tag.includes("HINGE") || tag.includes("HANDLE")) return "Hardware";
        
        // Default to Furniture if it's furniture-related items
        if (tag.includes("BED") || tag.includes("WARDROBE") || tag.includes("TV") || tag.includes("UNIT") || 
            tag.includes("TABLE") || tag.includes("SOFA") || tag.includes("CHAIR") || tag.includes("DESK")) {
          return "Furniture";
        }
        
        // Default to Furniture if no match
        return "Furniture";
      };

      const category = getCategoryFromLibrary();

      const payload = {
        roomName: inputs.room,
        itemName: item.name,
        quantity: inputs.quantity,
        unit: inputs.unit,
        rate: displayRate || item.ratePerQty,
        category: category,
        totalCost: totalAmount,
        comments: "",
        siteId: activeSite.id,
      };

      await boqApi.addBOQItem(payload, token);
      
      // Show success toast immediately after API call succeeds
      showToast("Item added to BOQ successfully!");
      
      // Refresh BOQ items (non-blocking - errors won't prevent toast from showing)
      try {
        await fetchBOQItems();
      } catch (fetchError) {
        console.error("Failed to refresh BOQ items", fetchError);
        // Don't show error toast - the item was added successfully
      }
      
      // Reset inputs
      setLibraryItemInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[id];
        return newInputs;
      });
    } catch (error) {
      console.error("Failed to add to BOQ", error);
      showToast("Failed to add item to BOQ", 'error');
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
            {item.companyName && (
              <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.companyName}</p>
            )}
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
              )}
            </div>
          </div>
        )}



        {activeTab === "material" && (
          <div className="px-1 pb-4">
            {/* MATERIAL USED HEADER */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 text-center">
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
            <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {(["All", "Furniture", "Finishes", "Hardware", "Electrical"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMaterialCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                    materialCategory === cat
                      ? "bg-slate-900 text-white"
                      : "bg-white border text-slate-600 hover:bg-slate-100"
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
                              {/* {canAddItems && (
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
                              )} */}
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
                            href={import.meta.env.VITE_BACKEND_URL + "/" + material.invoice}
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
                            href={import.meta.env.VITE_BACKEND_URL + "/" + material.photo}
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
                            href={import.meta.env.VITE_BACKEND_URL + "/" + material.warrantyDoc}
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
          <select
            className="w-full p-2 border rounded-lg text-sm"
            value={materialForm.installedAt}
            onChange={(e) => setMaterialForm({ ...materialForm, installedAt: e.target.value })}
            required
          >
            <option value="">Select a room</option>
            {allRoomNames.length > 0 ? (
              allRoomNames.map((roomName) => (
                <option key={roomName} value={roomName}>
                  {roomName}
                </option>
              ))
            ) : (
              <option value="" disabled>No rooms available. Add rooms in BOQ first.</option>
            )}
          </select>
          {allRoomNames.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">Please add rooms in the BOQ section first.</p>
          )}
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
                      <label className="block text-xs text-gray-600">Category *</label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={boqForm.category}
                        onChange={(e) => setBoqForm({ ...boqForm, category: e.target.value as 'Furniture' | 'Finishes' | 'Hardware' | 'Electrical' | 'Miscellaneous' })}
                        required
                      >
                        <option value="Furniture">Furniture</option>
                        <option value="Finishes">Finishes</option>
                        <option value="Hardware">Hardware</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                      </select>
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
                    <div className="grid grid-cols-2 gap-3">
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
                    <div className="flex flex-col gap-2 mt-4">
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setShowAddModal(false)} 
                          className="flex-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="flex-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
                        >
                          Add BOQ
                        </button>
                      </div>
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
                    <div className="flex flex-col text-left">
                      <h3 className="text-base font-semibold text-left">Add New Room</h3>
                      <span className="text-xs text-gray-500 text-left">Add a new room to the Bill of Quantities</span>
                    </div>
                    <button onClick={() => setShowAddRoomModal(false)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); handleAddRoom(); }} className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 text-left">Room Name *</label>
                      <input
                        type="text"
                        className="w-full mt-1 p-2 border rounded text-left"
                        placeholder="Enter room name (e.g., Bedroom, Kitchen)"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-row items-center justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setShowAddRoomModal(false)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
                      <button type="submit" className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white">Add Room</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {(["All", "Furniture", "Finishes", "Hardware", "Electrical", "Miscellaneous"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white"
                      : "bg-white border text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="px-1 space-y-6">
              {filteredRooms.map((room) => {
                const filteredItems = filterItemsByCategory(room.items);
                // Show room even if no items

                const roomSubtotal = filteredItems.reduce((sum, item) => sum + item.amount, 0);
                const isRoomExpanded = expandedRooms.has(room.id);
                
                const toggleRoom = () => {
                  setExpandedRooms(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(room.id)) {
                      newSet.delete(room.id);
                    } else {
                      newSet.add(room.id);
                    }
                    return newSet;
                  });
                };

                return (
                  <div id={`boq-room-${room.id}`} key={room.id} className="bg-white rounded-[2rem] px-2 py-5 mb-6 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                    {/* Room Header */}
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={toggleRoom}
                          className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title={isRoomExpanded ? "Collapse room" : "Expand room"}
                        >
                          {isRoomExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
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
                            <div className="flex items-center gap-2">
                              <h3 
                                className="text-xl font-bold text-slate-800 cursor-pointer" 
                                onClick={toggleRoom}
                                title={room.name}
                              >
                                {room.name.length > 12 ? `${room.name.substring(0, 12)}...` : room.name}
                              </h3>
                              {/* Show lock icon to ALL users (including CLIENT, AGENT, MANAGER, ADMIN) when room is locked - NO ROLE CHECK */}
                              {lockedRooms.has(room.id) && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg" title="Room is locked - No items can be added or edited">
                                  <Lock className="w-4 h-4" />
                                  <span className="text-xs font-semibold">Locked</span>
                                </div>
                              )}
                              {/* Show admin-only buttons when room is unlocked */}
                              {isAdmin && !lockedRooms.has(room.id) && (
                                <>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!token || !activeSite) return;
                                      
                                      try {
                                        await boqApi.lockBOQRoom({ siteId: activeSite.id, roomName: room.name }, token);
                                        setLockedRooms(prev => {
                                          const newSet = new Set(prev);
                                          newSet.add(room.id);
                                          return newSet;
                                        });
                                        showToast("Room locked");
                                      } catch (error) {
                                        console.error("Failed to lock room", error);
                                        showToast("Failed to lock room", 'error');
                                      }
                                    }}
                                    className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Lock room"
                                  >
                                    <Unlock className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditRoomName(room.id, room.name)}
                                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit room name"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {/* Show admin-only unlock button when room is locked */}
                              {isAdmin && lockedRooms.has(room.id) && (
                                <>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!token || !activeSite) return;
                                      
                                      try {
                                        await boqApi.unlockBOQRoom({ siteId: activeSite.id, roomName: room.name }, token);
                                        setLockedRooms(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(room.id);
                                          return newSet;
                                        });
                                        showToast("Room unlocked");
                                      } catch (error) {
                                        console.error("Failed to unlock room", error);
                                        showToast("Failed to unlock room", 'error');
                                      }
                                    }}
                                    className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Unlock room"
                                  >
                                    <Unlock className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditRoomName(room.id, room.name)}
                                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Edit room name"
                                    disabled={lockedRooms.has(room.id)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {canAddItems && !lockedRooms.has(room.id) && (
                        <button
                          onClick={() => {
                            setBoqForm({ ...boqForm, roomName: room.name });
                            setShowAddModal(true);
                          }}
                          className="bg-black hover:bg-gray-900 active:bg-gray-800 text-white px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Item
                        </button>
                      )}
                    </div>

                    {isRoomExpanded && filteredItems.length > 0 ? (
                      <>
                        {/* Table Header */}
                        <div className="flex text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
                          <div className="w-[45%] text-left">Item Name</div>
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
                                  {/* Left border indicator - Category based color */}
                                  <div className={`absolute left-1 top-2 bottom-2 w-1 rounded-full ${getCategoryColor(item.category)}`} />
                                  
                                  {/* Item Name */}
                                  <div className="w-[45%] pr-2 pl-2 text-left">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[15px] font-medium leading-snug block transition-colors text-slate-900 font-bold text-left">{item.name}</span>
                                        {/* Attachment Indicators */}
                                        {(item.bill || item.photo) && (
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {item.bill && (
                                              <div title="Bill attached" className="flex items-center">
                                                <FileText className="w-3 h-3 text-blue-500" />
                                              </div>
                                            )}
                                            {item.photo && (
                                              <div title="Photo attached" className="flex items-center">
                                                <Image className="w-3 h-3 text-emerald-500" />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
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
                                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 text-center">PURCHASED PRICE</div>
                                        {isAdmin && !lockedRooms.has(room.id) ? (
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
                                              className="text-xl font-bold text-slate-800 w-full bg-transparent border-none outline-none focus:bg-slate-50 rounded px-2 -ml-2 text-center"
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
                                          <div className="text-xl font-bold text-slate-800 text-center">
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
                                          {isAdmin && !lockedRooms.has(room.id) ? (
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
                                            href={import.meta.env.VITE_BACKEND_URL + "/" + item.bill}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            Bill
                                          </a>
                                        ) : (
                                          isAdmin && !lockedRooms.has(room.id) && (
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
                                            href={import.meta.env.VITE_BACKEND_URL + "/" + item.photo}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Image className="w-3.5 h-3.5" />
                                            Photo
                                          </a>
                                        ) : (
                                          isAdmin && !lockedRooms.has(room.id) && (
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

                                    {/* Delete Button (Admin Only) */}
                                    {isAdmin && (
                                      <div className="mb-4 flex justify-end">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteBOQItem(item.id.toString());
                                          }}
                                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                                          title="Delete this item"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Delete Item
                                        </button>
                                      </div>
                                    )}

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
                    ) : isRoomExpanded && (
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
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </>

  );
};

export default BOQ;

