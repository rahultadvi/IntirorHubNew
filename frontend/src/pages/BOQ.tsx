import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Download,
  Share2,
  Pencil,
  Check,
  X,
  Clock,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { boqApi } from "../services/api";
import jsPDF from 'jspdf';
// import BoqLibrary from "../component/BoqLibrary";

interface BOQItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  category: "furniture" | "services";
  comments?: number;
  status?: 'pending' | 'approved' | 'rejected';
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
  
   const handleOpenMaterial = (material: any) => {
    console.log("Open material:", material);
    // future: modal / navigate
  };

  // Close menu on outside click
  useEffect(() => {
    if (activeTab === "material") {
      setMaterials([
        {
          id: "1",
          name: "Soft Close Hinge",
          brand: "Hettich • Sensys 8645i",
          cost: 850,
          warranty: "5 Years",
        },
      ]);
    }
  }, [activeTab]);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only close if click is outside any menu button or menu
      if (!(e.target instanceof HTMLElement)) return;
      if (!e.target.closest('.boq-menu-btn') && !e.target.closest('.boq-menu-dropdown')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  


  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editedRoomName, setEditedRoomName] = useState<string>("");
  const { activeSite } = useSite();
  const { user } = useAuth();
  const [selectedCategory] = useState<"furniture" | "services" | "all">("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);


  // ✅ DUMMY DATA for BOQ Library
useEffect(() => {
  if (activeTab === "library") {
    setLibraryItems([
      {
        id: "lib1",
        title: "Queen Size Bed with Storage",
        category: "Beds",
        type: "Custom",
        rate: 35000,
        unit: "Nos",
        image:
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
      },
      {
        id: "lib2",
        title: "Sliding Wardrobe",
        category: "Wardrobes",
        type: "Generic",
        rate: 1450,
        unit: "Sq. Ft.",
        image:
          "https://images.unsplash.com/photo-1615874959474-d609969a20ed",
      },
    ]);
  }
}, [activeTab]);


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
  const canApproveItems = user && ['ADMIN', 'CLIENT'].includes(user.role);
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
          roomMap[roomName].items.push({
            id: item._id,
            name: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.totalCost,
            category: 'furniture', // TODO: determine from item or add to backend
            comments: item.comments,
            status: item.status,
          });
          roomMap[roomName].subtotal += item.totalCost;
        }
      });

    return Object.values(roomMap);
  }, [boqItems]);



  useEffect(() => {
    if (activeSite) {
      fetchBOQItems();
    }
  }, [activeSite]);

  const fetchBOQItems = async () => {
    const token = localStorage.getItem('authToken');
    if (!token || !activeSite) return;
    try {
      const response = await boqApi.getBOQItemsBySite(activeSite.id, token);
      const { boqItems: items } = response as { boqItems: Record<string, any[]>; stats: any };
      setBoqItems(Object.values(items).flat());
    } catch (error) {
      console.error('Failed to fetch BOQ items', error);
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;
    const token = localStorage.getItem('authToken');
    if (!token || !activeSite) return;
    const dummyItem = {
      roomName: newRoomName,
      itemName: 'Room Added',
      quantity: 1,
      unit: 'Nos',
      rate: 0,
      totalCost: 0,
      comments: '',
      siteId: activeSite.id,
    };
    try {
      await boqApi.addBOQItem(dummyItem, token);
      setNewRoomName('');
      setShowAddRoomModal(false);
      fetchBOQItems();
    } catch (error) {
      console.error('Failed to add room', error);
    }
  };

  const handleSubmitBOQItem = async (e: React.FormEvent, keepModalOpen = false) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    if (!token || !activeSite) return;

    const totalCost = parseFloat(boqForm.quantity) * parseFloat(boqForm.rate) || 0;

    const itemData = {
      roomName: boqForm.roomName,
      itemName: boqForm.itemName,
      quantity: parseFloat(boqForm.quantity),
      unit: boqForm.unit,
      rate: parseFloat(boqForm.rate),
      totalCost,
      comments: boqForm.comments,
      siteId: activeSite.id,
    };

    // Handle image upload
    if (boqForm.referenceImage) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const imageData = {
          ...itemData,
          referenceImageBase64: base64,
          referenceImageFilename: boqForm.referenceImage!.name,
        };
        try {
          await boqApi.addBOQItem(imageData, token);
          if (!keepModalOpen) {
            setShowAddModal(false);
          }
          setBoqForm({
            roomName: '',
            itemName: '',
            quantity: '',
            unit: 'Sq.ft',
            rate: '',
            comments: '',
            referenceImage: null,
          });
          fetchBOQItems();
        } catch (error) {
          console.error('Failed to add BOQ item', error);
        }
      };
      reader.readAsDataURL(boqForm.referenceImage);
    } else {
      try {
        await boqApi.addBOQItem(itemData, token);
        if (!keepModalOpen) {
          setShowAddModal(false);
        }
        setBoqForm({
          roomName: '',
          itemName: '',
          quantity: '',
          unit: 'Sq.ft',
          rate: '',
          comments: '',
          referenceImage: null,
        });
        fetchBOQItems();
      } catch (error) {
        console.error('Failed to add BOQ item', error);
      }
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

      // Set font
      pdf.setFont('helvetica', 'normal');

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BILL OF QUANTITIES', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Company/Project Info
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Project: ${activeSite?.name || 'N/A'}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Room: ${room.name}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 15;

      console.log('Header section completed, yPosition:', yPosition);

      // Table Header
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');

      // Draw table header background
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 12, 'F');

      // Draw header border
      pdf.setLineWidth(0.5);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 12);

      // Define column positions
      const colPositions = {
        sno: margin + 5,
        item: margin + 20,
        quantity: margin + 100,
        unit: margin + 130,
        rate: margin + 150,
        amount: pageWidth - margin - 35
      };

      // Draw vertical lines for table columns
      const columnLines = [
        margin, // Left border
        margin + 15, // After S.No
        margin + 90, // After Item Description
        margin + 125, // After Quantity
        margin + 145, // After Unit
        margin + 175, // After Rate
        pageWidth - margin // Right border
      ];

      // Table content
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      room.items.forEach((item, index) => {
        console.log(`Processing item ${index + 1}:`, {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          status: item.status
        });

        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;

          // Redraw header on new page
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 12, 'F');

          // Draw header border
          pdf.setLineWidth(0.5);
          pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 12);

          pdf.text('S.No', colPositions.sno, yPosition + 2);
          pdf.text('Item Description', colPositions.item, yPosition + 2);
          pdf.text('Quantity', colPositions.quantity, yPosition + 2);
          pdf.text('Unit', colPositions.unit, yPosition + 2);
          pdf.text('Rate (₹)', colPositions.rate, yPosition + 2);
          pdf.text('Amount (₹)', colPositions.amount, yPosition + 2);

          yPosition += 15;
          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3);

          // Redraw vertical lines
          pdf.setLineWidth(0.3);
          columnLines.forEach(x => {
            pdf.line(x, yPosition - 18, x, yPosition - 3);
          });

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
        }

        const isEvenRow = index % 2 === 0;

        // Alternate row background
        // Item name (with word wrap)
        const itemName = item.name;
        const maxItemWidth = 70; // Width available for item description
        const lines = pdf.splitTextToSize(itemName, maxItemWidth);

        // Calculate row height based on text lines
        const lineHeight = 5;
        const rowHeight = Math.max(12, lines.length * lineHeight);

        if (isEvenRow) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, rowHeight, 'F');
        }
        // Draw row borders
        pdf.setLineWidth(0.3);
        pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, rowHeight);
        // Serial number
        pdf.text((index + 1).toString(), colPositions.sno, yPosition + 2);

        pdf.text(lines, colPositions.item, yPosition + 2);

        // Quantity
        pdf.text(item.quantity.toString(), colPositions.quantity, yPosition + 2);

        // Unit
        pdf.text(item.unit, colPositions.unit, yPosition + 2);

        // Rate (right-aligned)
        const rateText = formatCurrency(item.rate).replace('₹', '').trim();
        const rateWidth = pdf.getTextWidth(rateText);
        pdf.text(rateText, colPositions.rate + 20 - rateWidth, yPosition + 2);

        // Amount (right-aligned)
        const amountText = formatCurrency(item.amount).replace('₹', '').trim();
        const amountWidth = pdf.getTextWidth(amountText);
        pdf.text(amountText, colPositions.amount + 30 - amountWidth, yPosition + 2);

        yPosition += rowHeight;
      });

      // Total
      yPosition += 10;
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }

      // Draw total line
      pdf.setLineWidth(1);
      pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('TOTAL AMOUNT:', pageWidth - margin - 80, yPosition + 5);
      pdf.text(formatCurrency(room.subtotal).replace('₹', ''), pageWidth - margin - 25, yPosition + 5);

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


  const handleApproveItem = async (itemId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      await boqApi.updateBOQStatus(itemId, 'approved', token);
      fetchBOQItems();
    } catch (error) {
      console.error('Failed to approve BOQ item', error);
    }
  };

  const handleRejectItem = async (itemId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      await boqApi.updateBOQStatus(itemId, 'rejected', token);
      fetchBOQItems();
    } catch (error) {
      console.error('Failed to reject BOQ item', error);
    }
  };

  const handleDeleteBOQItem = async (itemId: string) => {
    const token = localStorage.getItem("authToken");
    if (!token || !isAdmin) return;

    const ok = window.confirm("Are you sure you want to delete this BOQ item?");
    if (!ok) return;

    try {
      await boqApi.deleteBOQItem(itemId, token);
      fetchBOQItems(); // reload list
    } catch (error) {
      console.error("Failed to delete BOQ item", error);
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

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-5 py-6 pb-28 relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-slate-400 tracking-wide">✨ GOOD EVENING</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {user?.name || "Alex Johnson"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow">
              +
            </button>
            <img
              src="https://i.pravatar.cc/100"
              className="w-10 h-10 rounded-full object-cover"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 bg-white rounded-2xl px-5 py-4 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 font-semibold">PROJECT</p>
              <p className="font-semibold text-slate-900">
                {activeSite?.name || "Skyline Villa Renovation"}
              </p>
            </div>
            <span className="text-slate-400">⌄</span>
          </div>

          <button className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
            🔍
          </button>
        </div>
      <div className="flex justify-center mb-6">
  <div className="bg-white rounded-full p-1 shadow-sm flex gap-1 w-full max-w-md">
    {["boq", "material", "library"].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab as any)}
        className={`flex-1 py-2 rounded-full text-sm font-semibold transition
          ${activeTab === tab
            ? "bg-slate-900 text-white"
            : "text-slate-400 hover:text-slate-600"
          }`}
      >
        {tab === "boq" && "BOQ"}
        {tab === "material" && "Material Used"}
        {tab === "library" && "Library"}
      </button>
    ))}
  </div>
</div>


{activeTab === "library" && (
  <div className="grid grid-cols-2 gap-4">
    {libraryItems.map((item) => (
      <div
        key={item.id}
        className="bg-white rounded-2xl shadow-sm border p-3"
      >
        <img
          src={item.image}
          alt={item.title}
          className="h-32 w-full object-cover rounded-xl mb-3"
        />

        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
          {item.category}
        </span>

        <h3 className="font-semibold text-sm mt-2">
          {item.title}
        </h3>

        <p className="text-xs text-slate-500">{item.type}</p>

        <p className="mt-2 font-bold">
          ₹{item.rate.toLocaleString()} / {item.unit}
        </p>

        <button className="mt-3 w-full bg-slate-900 text-white py-2 rounded-xl text-sm font-semibold">
          Add to BOQ
        </button>
      </div>
    ))}
  </div>
)}


{activeTab === "material" && materials.length > 0 && materials.map((item) => (
  <div
    key={item.id}
    onClick={() => handleOpenMaterial(item)}
    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100
               cursor-pointer transition hover:shadow-md hover:-translate-y-0.5"
  >
    {/* HEADER */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-slate-400">
          HARDWARE
        </span>
        <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
          ✅ Warranty
        </span>
      </div>

      <button
        onClick={(e) => e.stopPropagation()}
        className="text-slate-400 hover:text-slate-600"
      >
        ⋮
      </button>
    </div>

    <h3 className="text-lg font-bold">Soft Close Hinge</h3>
    <p className="text-sm text-slate-500 mb-4">
      Hettich • Sensys 8645i
    </p>

    <div className="flex gap-3 mt-4">
      <button
        onClick={(e) => e.stopPropagation()}
        className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl"
      >
        Invoice
      </button>

      <button
        onClick={(e) => e.stopPropagation()}
        className="flex-1 border border-dashed py-2 rounded-xl"
      >
        Add Photo
      </button>
    </div>
  </div>
))}


        {/* Room Filters + Add Button */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRoom("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedRoom === "all"
                ? "bg-blue-50 text-blue-600 border-2 border-blue-200"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
            >
              All Rooms
            </button>
            {allRoomNames.map((roomName) => (
              <button
                key={roomName}
                onClick={() => setSelectedRoom(roomName.toLowerCase().replace(/\s+/g, '-'))}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedRoom === roomName.toLowerCase().replace(/\s+/g, '-')
                  ? "bg-blue-50 text-blue-600 border-2 border-blue-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {roomName}
              </button>
            ))}
          </div>
          {/* Add Room Button */}
          <button
            className="w-12 h-12 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-700 transition-all flex-shrink-0"
            title="Add Room"
            onClick={() => {
              console.log('Add Room clicked');
              setShowAddRoomModal(true);
            }}
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 opacity-100" onClick={() => setShowAddModal(false)} />
            <div className="relative bg-white rounded-xl w-full max-w-md p-4 sm:p-6 shadow-lg
        overflow-auto max-h-[calc(100vh-8rem)]
        transform transition-all duration-300
        scale-100 translate-y-0 opacity-100
        animate-modalIn">
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
                  <label className="block text-xs text-gray-600">Rate per Unit (₹) *</label>
                  <input
                    type="number"
                    className="w-full mt-1 p-2 border rounded"
                    placeholder="Enter rate per unit"
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
                    onClick={() => handleSubmitBOQItem({ preventDefault: () => { } } as any, true)}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 opacity-100" onClick={() => setShowAddRoomModal(false)} />
            <div className="relative bg-white rounded-xl w-full max-w-md p-4 sm:p-6 shadow-lg
        overflow-auto max-h-[calc(100vh-8rem)]
        transform transition-all duration-300
        scale-100 translate-y-0 opacity-100">
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



        {/* Room Sections */}
        <div className="space-y-4">
          {filteredRooms.map((room) => {
            const filteredItems = filterItemsByCategory(room.items);
            // Show room even if no items

            const roomSubtotal = filteredItems.reduce((sum, item) => sum + item.amount, 0);

            return (
              <div id={`boq-room-${room.id}`} key={room.id} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
                {/* Room Header */}
                <div className="flex items-center justify-between mb-4 ">
                  <div className="flex items-center gap-2">
                    {editingRoomId === room.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedRoomName}
                          onChange={(e) => setEditedRoomName(e.target.value)}
                          className="text-md  text-slate-500 border-1 border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-gray-200 w-3/5"
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
                      className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  )}
                </div>

                {filteredItems.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3 px-2">
                      <div className="flex items-center gap-2 w-[45%]">
                        <span className="text-[10px] font-semibold tracking-wider text-slate-400">
                          ITEM NAME
                        </span>
                      </div>

                      {/* QUANTITY */}
                      <div className="w-[20%] text-center">
                        <span className="text-[10px] font-semibold tracking-wider text-slate-400">
                          QUANTITY
                        </span>
                      </div>

                      {/* AMOUNT */}
                      <div className="w-[35%] text-right pr-6">
                        <span className="text-[10px] font-semibold tracking-wider text-slate-400">
                          AMOUNT
                        </span>
                      </div>
                    </div>


                    <div className="space-y-6">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0"
                        >
                          {/* LEFT: Item name + status */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-1 h-10 rounded-full ${item.category === "furniture" ? "bg-blue-500" : "bg-amber-500"
                                }`}
                            />
                            <span
                              className={`rounded-full w-6 h-6 flex items-center justify-center ${item.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : item.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                                }`}
                            >
                              {item.status === "approved" && <Check className="w-3 h-3" />}
                              {item.status === "pending" && <Clock className="w-3 h-3" />}
                              {item.status === "rejected" && <X className="w-3 h-3" />}
                            </span>

                            <span className="font-semibold text-slate-800 truncate">
                              {item.name}
                            </span>
                          </div>

                          {/* CENTER: Quantity */}
                          <div className="text-center">
                            <span className="font-semibold text-slate-700">
                              {item.quantity} {item.unit}
                            </span>
                            <p className="text-[10px] text-slate-400">Qty</p>
                          </div>

                          {/* RIGHT: Amount + menu */}
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              {formatCurrency(item.amount)}
                            </span>

                            <button
                              className={`p-1 rounded-full hover:bg-slate-100 boq-menu-btn relative ${openMenuId === String(item.id) ? 'bg-slate-100' : ''}`}
                              onClick={() => setOpenMenuId(openMenuId === String(item.id) ? null : String(item.id))}
                              aria-label="More actions"
                            >
                              <MoreVertical className="w-5 h-5 text-slate-500" />
                              {openMenuId === String(item.id) && (
                                <div className="boq-menu-dropdown absolute right-0 top-8 z-10 bg-white border border-slate-200 rounded shadow-md min-w-[120px]">
                                  {canApproveItems && (
                                    <button
                                      onClick={() => { handleApproveItem(item.id.toString()); setOpenMenuId(null); }}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-green-700 hover:bg-green-50"
                                    >
                                      <Check className="w-4 h-4" /> Approve
                                    </button>
                                  )}
                                  {canApproveItems && (
                                    <button
                                      onClick={() => { handleRejectItem(item.id.toString()); setOpenMenuId(null); }}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-red-700 hover:bg-red-50"
                                    >
                                      <X className="w-4 h-4" /> Reject
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => {
                                        handleDeleteBOQItem(item.id.toString());
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
                        </div>
                      ))}
                    </div>

                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">No items added to this room yet.</p>
                    <p className="text-xs mt-1">Click "Add Item" to get started.</p>
                  </div>
                )}

                {/* Subtotal */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Subtotal</span>
                  <span className="text-2xl font-bold text-slate-800">{formatCurrency(roomSubtotal)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleExportPDF(room)}
                    disabled={room.items.length === 0}
                    className={`flex-1 font-semibold py-3 px-2 rounded-xl flex items-center justify-center gap-1 transition-all ${room.items.length === 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-slate-600 text-white hover:bg-slate-700'
                      }`}
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => handleShareBOQ(room)}
                    className="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Share BOQ
                  </button>
                </div>
              </div>
            );
          })}
        </div>


      </div>
    </>

  );
};

export default BOQ;

