import BOQItem from '../models/boqModel.js';
import BOQRoomLock from '../models/boqRoomLockModel.js';
// import Library from '../models/libraryModel.js';
import Site from '../models/siteModel.js';
import PDFDocument from "pdfkit";
import User from '../models/userModel.js';
import { getUploadedFilePath } from '../utils/multer.js';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const REFERENCE_IMAGE_FOLDER = path.join(process.cwd(), 'uploads', 'boq-images');

// Ensure folder exists
try { fs.mkdirSync(REFERENCE_IMAGE_FOLDER, { recursive: true }); } catch (e) { }

export const addBOQItem = async (req, res) => {
  try {
    const { roomName, itemName, quantity, unit, rate, purchaseRate, comments, siteId, referenceImageBase64, referenceImageFilename, category } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === siteId));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    // Calculate effective rate (use purchaseRate if provided, otherwise use rate)
    const effectivePurchaseRate = purchaseRate !== undefined && purchaseRate !== null ? Number(purchaseRate) : Number(rate);
    // Calculate totalCost using purchaseRate if available, otherwise use rate
    const calculatedTotalCost = Number(quantity) * effectivePurchaseRate;

    const boqItem = new BOQItem({
      roomName,
      itemName,
      quantity: Number(quantity),
      unit,
      rate: Number(rate),
      purchaseRate: effectivePurchaseRate,
      totalCost: calculatedTotalCost,
      comments,
      siteId,
      status: ['MANAGER', 'AGENT'].includes(req.user.role) ? 'pending' : 'approved',
      createdBy: req.user._id,
      companyName: req.user.companyName,
      category: category || 'Furniture'
    });

    // Handle file upload or base64 image
    if (req.file) {
      // Using multer file upload
      boqItem.referenceImage = {
        path: getUploadedFilePath(req.file, 'boq-images'),
        filename: req.file.originalname
      };
    } else if (referenceImageBase64 && referenceImageFilename) {
      // Save reference image if provided as base64
      const buffer = Buffer.from(referenceImageBase64, 'base64');
      const safeName = `${Date.now()}-${referenceImageFilename}`.replace(/\s+/g, '_');
      const filePath = path.join(REFERENCE_IMAGE_FOLDER, safeName);
      fs.writeFileSync(filePath, buffer);
      boqItem.referenceImage = { path: `uploads/boq-images/${safeName}`, filename: referenceImageFilename };
    }

    await boqItem.save();

    res.status(201).json({ message: 'BOQ item added', boqItem });
  } catch (error) {
    console.error('Error adding BOQ item', error);
    res.status(500).json({ message: 'Error adding BOQ item', error: error.message });
  }
};

export const getBOQItemsBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === siteId));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    const boqItems = await BOQItem.find({ siteId }).sort({ roomName: 1, createdAt: 1 });

    // Group by roomName
    const groupedItems = {};
    boqItems.forEach(item => {
      if (!groupedItems[item.roomName]) {
        groupedItems[item.roomName] = [];
      }
      groupedItems[item.roomName].push(item);
    });

    // Calculate stats
    const totalItems = boqItems.length;
    const totalCost = boqItems.reduce((sum, item) => sum + item.totalCost, 0);
    const approved = boqItems.filter(item => item.status === 'approved').length;
    const pending = boqItems.filter(item => item.status === 'pending').length;
    const rejected = boqItems.filter(item => item.status === 'rejected').length;
    const roomCount = Object.keys(groupedItems).length;

    res.json({
      boqItems: groupedItems,
      stats: {
        total: totalItems,
        approved,
        pending,
        rejected,
        totalCost,
        roomCount
      }
    });
  } catch (error) {
    console.error('Error fetching BOQ items', error);
    res.status(500).json({ message: 'Error fetching BOQ items', error: error.message });
  }
};

export const updateBOQItem = async (req, res) => {
  try {
    const { boqId } = req.params;
    const { quantity, purchaseRate } = req.body;

    const boqItem = await BOQItem.findById(boqId);
    if (!boqItem) return res.status(404).json({ message: 'BOQ item not found' });

    const site = await Site.findById(boqItem.siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === boqItem.siteId.toString()));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    // Only Admin can update quantity and purchase rate
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update BOQ item quantity and purchase rate' });
    }

    // Update quantity
    if (quantity !== undefined) {
      boqItem.quantity = Number(quantity);
    }

    // Update purchase rate
    if (purchaseRate !== undefined) {
      boqItem.purchaseRate = purchaseRate === null ? null : Number(purchaseRate);
    }

    // Handle file uploads for bill and photo
    if (req.files?.bill) {
      boqItem.bill = `uploads/boq/${req.files.bill[0].filename}`;
    }
    if (req.files?.photo) {
      boqItem.photo = `uploads/boq/${req.files.photo[0].filename}`;
    }

    // Recalculate totalCost using purchaseRate if available, otherwise use rate (base price)
    const effectiveRate = (boqItem.purchaseRate !== null && boqItem.purchaseRate !== undefined)
      ? boqItem.purchaseRate
      : boqItem.rate;
    boqItem.totalCost = boqItem.quantity * effectiveRate;

    await boqItem.save();

    res.json({ message: 'BOQ item updated', boqItem });
  } catch (error) {
    console.error('Error updating BOQ item', error);
    res.status(500).json({ message: 'Error updating BOQ item', error: error.message });
  }
};

export const updateBOQStatus = async (req, res) => {
  try {
    const { boqId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const boqItem = await BOQItem.findById(boqId);
    if (!boqItem) return res.status(404).json({ message: 'BOQ item not found' });

    const site = await Site.findById(boqItem.siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === boqItem.siteId.toString()));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    // Check permissions: Admin and Client can approve/reject, others cannot change status
    if (status !== 'pending' && !['ADMIN', 'CLIENT'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to approve or reject BOQ items' });
    }

    boqItem.status = status;
    await boqItem.save();

    res.json({ message: 'BOQ item status updated', boqItem });
  } catch (error) {
    console.error('Error updating BOQ status', error);
    res.status(500).json({ message: 'Error updating BOQ status', error: error.message });
  }
};

export const deleteBOQItem = async (req, res) => {
  try {
    const { boqId } = req.params;

    const boqItem = await BOQItem.findById(boqId);
    if (!boqItem) return res.status(404).json({ message: 'BOQ item not found' });

    const site = await Site.findById(boqItem.siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === boqItem.siteId.toString()));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    // Only Admin can delete
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete BOQ items' });
    }

    await BOQItem.findByIdAndDelete(boqId);

    res.json({ message: 'BOQ item deleted' });
  } catch (error) {
    console.error('Error deleting BOQ item', error);
    res.status(500).json({ message: 'Error deleting BOQ item', error: error.message });
  }
};

export const getBOQImage = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(REFERENCE_IMAGE_FOLDER, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving BOQ image', error);
    res.status(500).json({ message: 'Error serving image' });
  }
};

// ✅ LIBRARY FUNCTIONS

export const addLibraryItem = async (req, res) => {
  try {
    const { category, subCategory, name, baseRate, unit } = req.body;
    const companyName = req.user.companyName;

    if (!category || !name || !baseRate || !unit) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const libraryItem = new Library({
      company: req.user._id,
      category,
      subCategory,
      name,
      baseRate: Number(baseRate),
      unit,
      image: req.file ? getUploadedFilePath(req.file, 'boq-images') : null
    });

    await libraryItem.save();
    res.status(201).json({ message: 'Library item added', libraryItem });
  } catch (error) {
    console.error('Error adding library item', error);
    res.status(500).json({ message: 'Error adding library item', error: error.message });
  }
};

export const getLibraryItems = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { company: req.user._id };

    if (category) {
      filter.category = category;
    }

    const libraryItems = await Library.find(filter).sort({ category: 1, name: 1 });

    // Group by category
    const groupedItems = {};
    libraryItems.forEach(item => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push(item);
    });

    res.json({
      libraryItems: category ? libraryItems : groupedItems,
      count: libraryItems.length
    });
  } catch (error) {
    console.error('Error fetching library items', error);
    res.status(500).json({ message: 'Error fetching library items', error: error.message });
  }
};

export const updateLibraryItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { category, subCategory, name, baseRate, unit } = req.body;

    const libraryItem = await Library.findById(itemId);
    if (!libraryItem) {
      return res.status(404).json({ message: 'Library item not found' });
    }

    // Check ownership
    if (libraryItem.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to update this item' });
    }

    if (category) libraryItem.category = category;
    if (subCategory !== undefined) libraryItem.subCategory = subCategory;
    if (name) libraryItem.name = name;
    if (baseRate) libraryItem.baseRate = Number(baseRate);
    if (unit) libraryItem.unit = unit;
    if (req.file) libraryItem.image = getUploadedFilePath(req.file, 'boq-images');

    await libraryItem.save();
    res.json({ message: 'Library item updated', libraryItem });
  } catch (error) {
    console.error('Error updating library item', error);
    res.status(500).json({ message: 'Error updating library item', error: error.message });
  }
};

export const deleteLibraryItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const libraryItem = await Library.findById(itemId);
    if (!libraryItem) {
      return res.status(404).json({ message: 'Library item not found' });
    }

    // Check ownership
    if (libraryItem.company.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to delete this item' });
    }

    await Library.findByIdAndDelete(itemId);
    res.json({ message: 'Library item deleted' });
  } catch (error) {
    console.error('Error deleting library item', error);
    res.status(500).json({ message: 'Error deleting library item', error: error.message });
  }
};

export const addBOQFromLibrary = async (req, res) => {
  try {
    const { libraryItemId, roomName, quantity, siteId } = req.body;

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === siteId));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    const libraryItem = await Library.findById(libraryItemId);
    if (!libraryItem) return res.status(404).json({ message: 'Library item not found' });

    const totalCost = libraryItem.baseRate * quantity;

    const boqItem = new BOQItem({
      roomName,
      itemName: libraryItem.name,
      quantity: Number(quantity),
      unit: libraryItem.unit,
      rate: libraryItem.baseRate,
      totalCost,
      comments: `Added from library - ${libraryItem.category}`,
      siteId,
      status: ['MANAGER', 'AGENT'].includes(req.user.role) ? 'pending' : 'approved',
      createdBy: req.user._id,
      companyName: req.user.companyName
    });

    await boqItem.save();
    res.status(201).json({ message: 'BOQ item added from library', boqItem });
  } catch (error) {
    console.error('Error adding BOQ from library', error);
    res.status(500).json({ message: 'Error adding BOQ from library', error: error.message });
  }
};

export const getLibraryItemsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const validCategories = ['Furniture', 'Finishes', 'Hardware', 'Electrical'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const items = await Library.find({
      company: req.user._id,
      category
    }).sort({ name: 1 });

    res.json({ category, items, count: items.length });
  } catch (error) {
    console.error('Error fetching library items by category', error);
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

// Lock a BOQ room (Admin only)
export const lockBOQRoom = async (req, res) => {
  try {
    const { siteId, roomName } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can lock rooms' });
    }

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === siteId));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    // Check if room is already locked
    const existingLock = await BOQRoomLock.findOne({ siteId, roomName });
    if (existingLock) {
      return res.json({ message: 'Room is already locked', locked: true });
    }

    // Create lock
    const roomLock = new BOQRoomLock({
      siteId,
      roomName,
      companyName: req.user.companyName,
      lockedBy: req.user._id
    });

    await roomLock.save();

    res.json({ message: 'Room locked successfully', locked: true });
  } catch (error) {
    console.error('Error locking BOQ room', error);
    if (error.code === 11000) {
      // Duplicate key error
      return res.json({ message: 'Room is already locked', locked: true });
    }
    res.status(500).json({ message: 'Error locking room', error: error.message });
  }
};

// 🔥 Delete all BOQ items of a room (Admin only)
export const deleteBOQItemsByRoom = async (req, res) => {
  try {
    const { roomName, siteId } = req.params;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete room materials' });
    }

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess =
      site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === siteId));

    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this site' });
    }

    const result = await BOQItem.deleteMany({
      siteId,
      roomName
    });

    res.json({
      message: `Deleted ${result.deletedCount} items from room ${roomName}`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error deleting BOQ items by room', error);
    res.status(500).json({ message: 'Error deleting room materials', error: error.message });
  }
};


// Unlock a BOQ room (Admin only)
export const unlockBOQRoom = async (req, res) => {
  try {
    const { siteId, roomName } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can unlock rooms' });
    }

    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const hasAccess = site.companyName === req.user.companyName ||
      (req.user.siteAccess && req.user.siteAccess.some(id => id.toString() === siteId));
    if (!hasAccess) return res.status(403).json({ message: 'You do not have access to this site' });

    // Remove lock
    const result = await BOQRoomLock.deleteOne({ siteId, roomName });

    if (result.deletedCount === 0) {
      return res.json({ message: 'Room was not locked', locked: false });
    }

    res.json({ message: 'Room unlocked successfully', locked: false });
  } catch (error) {
    console.error('Error unlocking BOQ room', error);
    res.status(500).json({ message: 'Error unlocking room', error: error.message });
  }
};



export const exportAllBOQToPDF = async (req, res) => {
  // This function has been moved to frontend - PDF generation now happens client-side
  return res.status(410).json({ 
    message: 'PDF export has been moved to frontend. Please use the frontend export functionality.' 
  });
};

/**
 * Calculate totals for BOQ items
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

  // Build logo URL (matching frontend format exactly)
  // Frontend uses: VITE_BACKEND_URL || VITE_API_BASE_URL
  // Backend should use the same base URL
  const BACKEND_URL = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:2001';
  const logoUrl = companyLogo ? (companyLogo.startsWith('http') ? companyLogo : `${BACKEND_URL}${companyLogo}`) : '';
  const logoText = (companyName || 'LOGO').substring(0, 8).toUpperCase();
  const dummyLogoSvg = `<svg width="120" height="60" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="60" fill="#1e293b" rx="8"/><text x="60" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">${logoText}</text></svg>`;
  const dummyLogo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dummyLogoSvg)}`;

  // Generate category summary rows (matching frontend format)
  const categoryRows = Object.entries(categorySummary).map(([category, summary]) => {
    const categoryDisplay = category.charAt(0).toUpperCase() + category.slice(1);
    return `
      <div style="display: flex; justify-content: space-between; padding: 22px 26px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="color: #111827; padding: 4px 12px; border-radius: 16px; font-size: 22px; font-weight: 600;">${categoryDisplay}</span>
          <div style="font-weight: 600; color: #111827; font-size: 24px;">${summary.count} items</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 19px; color: #6b7280; margin-bottom: 2px;">Base: ${formatCurrency(summary.base)}</div>
          <div style="font-weight: 600; color: #059669; font-size: 24px;">Purchase: ${formatCurrency(summary.purchase)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Generate HTML for all rooms
  let roomsHTML = '';
  rooms.forEach((roomName, roomIndex) => {
    const roomItems = groupedByRoom[roomName];
    
    // Generate item rows for this room
    const itemRows = roomItems.map((item, index) => {
      const baseAmount = item.quantity * item.rate;
      const purchaseRate = item.purchaseRate !== null && item.purchaseRate !== undefined ? item.purchaseRate : item.rate;
      const purchaseAmount = item.quantity * purchaseRate;
      const categoryDisplay = typeof item.category === 'string' ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : (item.category || 'N/A');
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb; background-color: ${rowBg};">
          <td style="padding: 22px 20px; text-align: center; font-size: 21px; color: #6b7280; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 50px;">${index + 1}</td>
          <td style="padding: 22px 20px; font-size: 21px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 150px;">
            <div style="font-weight: 600; margin-bottom: 4px; color: #111827; line-height: 1.4; font-size: 21px;">${(item.itemName || 'N/A').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <div style="font-size: 17px; color: #6b7280; margin-top: 4px;">
              <span style="color: #111827; padding: 2px 8px; border-radius: 10px; font-weight: 500; display: inline-block; font-size: 17px;">${categoryDisplay}</span>
            </div>
          </td>
          <td style="padding: 22px 20px; text-align: center; font-size: 21px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 100px;">
            <div style="font-weight: 600; margin-bottom: 2px; font-size: 21px;">${item.quantity}</div>
            <div style="font-size: 17px; color: #6b7280;">${formatUnit(item.unit)}</div>
          </td>
          <td style="padding: 22px 20px; text-align: right; font-size: 21px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 100px; white-space: nowrap;">${formatCurrency(item.rate)}</td>
          <td style="padding: 22px 20px; text-align: right; font-size: 21px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 100px; white-space: nowrap;">${formatCurrency(purchaseRate)}</td>
          <td style="padding: 22px 20px; text-align: right; font-size: 21px; color: #111827; font-weight: 500; vertical-align: middle; border-right: 1px solid #e5e7eb; width: 110px; white-space: nowrap;">${formatCurrency(baseAmount)}</td>
          <td style="padding: 22px 20px; text-align: right; font-size: 21px; color: #059669; font-weight: 600; vertical-align: middle; width: 120px; white-space: nowrap;">${formatCurrency(purchaseAmount)}</td>
        </tr>
      `;
    }).join('');

    roomsHTML += `
      ${roomIndex === 0 ? `
        <div style="margin-bottom: 24px; padding: 0 40px;">
          <h3 style="font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 18px 0; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">Detailed Items</h3>
        </div>
      ` : ''}
      <div style="margin-bottom: 24px; padding: 0 40px;">
        <h4 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">${roomName}</h4>
        <div style="overflow-x: visible; border: none; border-radius: 6px; background: white;">
          <table style="width: 100%; border-collapse: collapse; background: white; table-layout: fixed;">
            <thead>
              <tr style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%);">
                <th style="padding: 20px 18px; text-align: center; font-size: 19px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 50px;">S.No</th>
                <th style="padding: 20px 18px; text-align: left; font-size: 19px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 150px;">Item Description</th>
                <th style="padding: 20px 18px; text-align: center; font-size: 19px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 100px;">Quantity</th>
                <th style="padding: 20px 18px; text-align: right; font-size: 19px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 100px;">Base Rate</th>
                <th style="padding: 20px 18px; text-align: right; font-size: 19px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 100px;">Purchase Rate</th>
                <th style="padding: 20px 18px; text-align: right; font-size: 19px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); width: 110px;">Base Amount</th>
                <th style="padding: 20px 18px; text-align: right; font-size: 19px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; width: 120px;">Purchase Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BOQ Report - ${site.name}</title>
      <style>
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="width: 100%; margin: 0; background: white; padding: 0; border: none;">
        <!-- Professional Header with Logo at Top Right -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px 40px; margin-top: 8px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding: 0;">
            <!-- Left Side: BOQ Title -->
            <div style="flex: 1;">
              <h1 style="font-size: 48px; font-weight: 800; margin: 0 0 4px 0; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Bill of Quantities</h1>
              <div style="width: 50px; height: 3px; background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%); margin-top: 6px; border-radius: 2px;"></div>
            </div>
            <!-- Right Side: Logo at Top -->
            <div style="flex-shrink: 0; margin-left: 24px;">
              ${logoUrl ? `
                <img src="${logoUrl}" alt="${companyName}" style="max-height: 110px; max-width: 240px; object-fit: contain; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
              ` : `
                <img src="${dummyLogo}" alt="Company Logo" style="max-height: 110px; max-width: 240px; object-fit: contain; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
              `}
            </div>
          </div>
          <!-- Site and Company Info Row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; padding: 0;">
            <div style="flex: 1;">
              <div style="margin-bottom: 8px;">
                <p style="font-size: 17px; margin: 0 0 1px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Site / Project</p>
                <p style="font-size: 28px; font-weight: 700; margin: 0; color: #0f172a; line-height: 1.2;">${site.name || 'N/A'}</p>
              </div>
              <div>
                <p style="font-size: 17px; margin: 0 0 1px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Company</p>
                <p style="font-size: 26px; margin: 0; color: #475569; font-weight: 600;">${companyName || 'N/A'}</p>
              </div>
            </div>
            <!-- Document Date on Right -->
            <div style="flex-shrink: 0; margin-left: 24px; text-align: right; padding: 10px 18px; border-radius: 6px; border: none; box-shadow: none;">
              <p style="font-size: 16px; margin: 0 0 3px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Document Date</p>
              <p style="font-size: 24px; margin: 0; color: #0f172a; font-weight: 700;">${generatedDate}</p>
            </div>
          </div>
        </div>
        
        <!-- Report Content -->
        <div style="padding: 32px 0; border: none;">
          <!-- Room Info Section -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; padding: 0 40px 20px 40px; border-bottom: 1px solid #e5e7eb;">
            <!-- Room Section -->
            <div style="background: #f8fafc; padding: 20px 24px; border-radius: 6px; border: none;">
              <p style="font-size: 17px; margin: 0 0 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Room / Area</p>
              <p style="font-size: 26px; margin: 0; color: #0f172a; font-weight: 700; line-height: 1.3;">All Rooms</p>
            </div>
            <!-- Total Items Section -->
            <div style="background: #f8fafc; padding: 20px 24px; border-radius: 6px; border: none;">
              <p style="font-size: 17px; margin: 0 0 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Items</p>
              <p style="font-size: 26px; margin: 0; color: #0f172a; font-weight: 700; line-height: 1.3;">${totalItems}</p>
            </div>
          </div>

          <!-- Category Summary -->
          <div style="margin-bottom: 24px; padding: 0 40px;">
            <h3 style="font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 18px 0; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">Summary by Category</h3>
            <div style="background: white; border: none; border-radius: 6px; overflow: hidden;">
              ${categoryRows}
            </div>
          </div>
          
          ${roomsHTML}
          
          <!-- Total Amounts Section -->
          <div style="margin-top: 24px; padding: 0 40px;">
            <div style="padding: 28px 40px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 6px; border: none; box-shadow: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #86efac;">
                <div style="font-size: 26px; font-weight: 600; color: #166534;">Total Base Amount:</div>
                <div style="font-size: 30px; font-weight: 700; color: #166534;">${formatCurrency(totals.totalBase)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 28px; font-weight: 700; color: #166534;">Total Purchase Amount:</div>
                <div style="font-size: 46px; font-weight: 800; color: #059669; letter-spacing: -0.5px;">${formatCurrency(totals.totalPurchase)}</div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center; color: #9ca3af; font-size: 10px; margin-bottom: 8px;">
              <p style="margin: 0 0 4px 0;">This is a computer-generated Bill of Quantities. No signature required.</p>
              <p style="margin: 0;">Generated on ${generatedDateTime} by SiteZero</p>
            </div>
            <div style="text-align: center; padding-top: 12px; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; color: #6b7280; font-size: 10px; font-weight: 500; letter-spacing: 0.5px;">Powered by <span style="color: #667eea; font-weight: 600;">SiteZero</span></p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};

export const exportAllBOQToPDF = async (req, res) => {
  const { siteId } = req.body;

  // Validate request
  if (!siteId) {
    return res.status(400).json({ message: 'siteId is required' });
  }

  let browser = null;

  try {
    // Fetch site data
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Check access permissions
    const hasAccess = 
      site.companyName === req.user.companyName ||
      req.user.siteAccess?.some(id => id.toString() === siteId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch user data for company logo and name
    const user = await User.findById(req.user._id).select('companyName companyLogo');
    const companyName = user?.companyName || req.user.companyName || '';
    const companyLogo = user?.companyLogo || req.user.companyLogo || '';

    // Fetch BOQ items
    const items = await BOQItem.find({ siteId }).sort({
      roomName: 1,
      createdAt: 1
    });

    if (!items.length) {
      return res.status(404).json({ message: 'No BOQ items found' });
    }

    // Calculate totals
    const totals = calculateBOQTotals(items);
    const categorySummary = calculateCategorySummary(items);
    const groupedByRoom = groupItemsByRoom(items);
    const rooms = Object.keys(groupedByRoom).sort();
    
    // Calculate total items
    const totalItems = items.length;

    // Generate HTML
    const html = generateAllBOQHTML(site, companyName, companyLogo, items, totals, categorySummary, groupedByRoom, rooms, totalItems);

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content and wait for resources to load
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      },
      preferCSSPageSize: true
    });

    // Close browser
    await browser.close();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="BOQ_Report_${site.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`
    );

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Export Error:', error);
    
    // Clean up browser if it was opened
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }

    // Only send error response if headers not already sent
    if (!res.headersSent) {
      res.status(500).json({
        message: 'PDF Export failed',
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message
      });
    }
  }
};

/**
 * Calculate totals for BOQ items
    const hasAccess = 
      site.companyName === req.user.companyName ||
      req.user.siteAccess?.some(id => id.toString() === siteId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch user data for company logo and name
    const user = await User.findById(req.user._id).select('companyName companyLogo');
    const companyName = user?.companyName || req.user.companyName || '';
    const companyLogo = user?.companyLogo || req.user.companyLogo || '';

    // Fetch BOQ items
    const items = await BOQItem.find({ siteId }).sort({
      roomName: 1,
      createdAt: 1
    });

    if (!items.length) {
      return res.status(404).json({ message: 'No BOQ items found' });
    }

    // Calculate totals
    const totals = calculateBOQTotals(items);
    const categorySummary = calculateCategorySummary(items);
    const groupedByRoom = groupItemsByRoom(items);
    const rooms = Object.keys(groupedByRoom).sort();
    
    // Calculate total items
    const totalItems = items.length;

    // PDF Configuration
    const PDF_CONFIG = {
      PAGE_MARGIN: 40,
      PAGE_WIDTH: 595, // A4 width in points
      PAGE_HEIGHT: 842, // A4 height in points
      PRIMARY_COLOR: '#2563eb',
      SECONDARY_COLOR: '#64748b',
      BACKGROUND_COLOR: '#f8fafc',
      BORDER_COLOR: '#e5e7eb',
      TABLE_HEADER_COLOR: '#2563eb',
      TABLE_STRIPE_COLOR: '#f1f5f9',
      FONT_PRIMARY: 'Helvetica',
      FONT_BOLD: 'Helvetica-Bold',
      FONT_SIZES: {
        TITLE: 14,
        SUBTITLE: 11,
        BODY: 9,
        SMALL: 8,
        HEADER: 18
      }
    };

    const { PAGE_MARGIN, SIDE_PADDING, PAGE_WIDTH, PAGE_HEIGHT } = PDF_CONFIG;
    const CONTENT_WIDTH = PAGE_WIDTH - SIDE_PADDING * 2;

    // Initialize PDF document - no margins, full width
    doc = new PDFDocument({ 
      size: 'A4', 
      margin: 0,
      info: {
        Title: `All Rooms BOQ Report - ${site.name}`,
        Author: 'BOQ Management System',
        Subject: `BOQ Report for ${site.projectType} - ${site.name}`,
        Keywords: 'BOQ, Report, Quantity, Bill',
        CreationDate: new Date()
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="BOQ_Report_${site.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`
    );

    doc.pipe(res);

    // Page state tracking
    let pageNumber = 1;
    let currentY = 0;

    /**
     * Draw professional header matching frontend format
     * @param {number} pageNo - Current page number
     */
    const drawHeader = (pageNo) => {
      const headerTop = 8;
      const headerHeight = 100;
      
      // Header background (gradient effect - using solid color)
      doc.save()
        .rect(0, headerTop, PAGE_WIDTH, headerHeight)
        .fill('#f8fafc')
        .restore();

      // Left side: BOQ Title and Site Info
      const leftX = SIDE_PADDING;
      let leftY = headerTop + 24;
      
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.TITLE)
        .fillColor('#0f172a')
        .text('BILL OF QUANTITIES', leftX, leftY)
        .restore();

      leftY += 12;
      
      doc.save()
        .font(PDF_CONFIG.FONT_PRIMARY)
        .fontSize(18)
        .fillColor('#64748b')
        .text('Site Name', leftX, leftY)
        .restore();

      leftY += 18;
      
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(20)
        .fillColor('#0f172a')
        .text(site.name || 'N/A', leftX, leftY)
        .restore();

      leftY += 20;
      
      doc.save()
        .font(PDF_CONFIG.FONT_PRIMARY)
        .fontSize(18)
        .fillColor('#64748b')
        .text('Company Name', leftX, leftY)
        .restore();

      leftY += 18;
      
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(20)
        .fillColor('#0f172a')
        .text(companyName || 'N/A', leftX, leftY, { width: 250 })
        .restore();

      // Right side: Document Date and Logo
      const rightX = PAGE_WIDTH - SIDE_PADDING;
      let rightY = headerTop + 24;
      
      // Document Date
      const dateLabelY = rightY;
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(16)
        .fillColor('#64748b')
        .text('DOCUMENT DATE', rightX, dateLabelY, { align: 'right', width: 200 })
        .restore();

      rightY += 18;
      
      const generatedDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(24)
        .fillColor('#0f172a')
        .text(generatedDate, rightX, rightY, { align: 'right', width: 200 })
        .restore();

      // Logo placeholder (if logo exists, would be added here)
      // For now, we'll add a text-based logo fallback
      rightY += 35;
      const logoText = companyName ? companyName.substring(0, 8).toUpperCase() : 'LOGO';
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(14)
        .fillColor('#64748b')
        .text(logoText, rightX, rightY, { align: 'right', width: 200 })
        .restore();

      currentY = headerTop + headerHeight + 32;
    };

    /**
     * Draw page footer
     */
    const drawFooter = () => {
      const bottom = PAGE_HEIGHT - 30;
      
      doc.save()
        .fontSize(PDF_CONFIG.FONT_SIZES.SMALL)
        .fillColor('#666')
        .text(
          `Generated on: ${new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })} | BOQ Management System`,
          PAGE_MARGIN,
          bottom,
          { align: 'center', width: CONTENT_WIDTH }
        )
        .restore();
    };

    /**
     * Format currency value
     * @param {number} value - Amount to format
     * @returns {string} Formatted currency string
     */
const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "₹ 0.00";
  return "₹ " + Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
    /**
     * Check if we need a new page and add if necessary
     * @param {number} requiredHeight - Height needed for next element
     */
    const checkAndAddPage = (requiredHeight = 100) => {
      const footerHeight = 50;
      if (currentY + requiredHeight > PAGE_HEIGHT - footerHeight) {
        drawFooter();
        doc.addPage();
        pageNumber++;
        drawHeader(pageNumber);
        return true;
      }
      return false;
    };

    /**
     * Draw room info section matching frontend format
     * @param {number} y - Starting Y position
     * @returns {number} New Y position
     */
    const drawRoomInfoSection = (y) => {
      const boxHeight = 80;
      const boxWidth = (CONTENT_WIDTH - 24) / 2; // Two boxes with gap
      const box1X = SIDE_PADDING;
      const box2X = SIDE_PADDING + boxWidth + 24;
      
      // Box 1: Room / Area
      doc.save()
        .roundedRect(box1X, y, boxWidth, boxHeight, 6)
        .fill('#f8fafc')
        .stroke('#e5e7eb')
        .lineWidth(0.5)
        .stroke()
        .restore();

      doc.save()
        .fillColor('#64748b')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.ROOM_LABEL)
        .text('ROOM / AREA', box1X + 24, y + 20)
        .restore();

      doc.save()
        .fillColor('#0f172a')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.ROOM_INFO)
        .text('All Rooms', box1X + 24, y + 45)
        .restore();

      // Box 2: Total Items
      doc.save()
        .roundedRect(box2X, y, boxWidth, boxHeight, 6)
        .fill('#f8fafc')
        .stroke('#e5e7eb')
        .lineWidth(0.5)
        .stroke()
        .restore();

      doc.save()
        .fillColor('#64748b')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.ROOM_LABEL)
        .text('TOTAL ITEMS', box2X + 24, y + 20)
        .restore();

      doc.save()
        .fillColor('#0f172a')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.ROOM_INFO)
        .text(String(totalItems), box2X + 24, y + 45)
        .restore();

      // Separator line
      doc.save()
        .moveTo(SIDE_PADDING, y + boxHeight + 20)
        .lineTo(PAGE_WIDTH - SIDE_PADDING, y + boxHeight + 20)
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .stroke()
        .restore();

      return y + boxHeight + 44;
    };

    /**
     * Draw totals summary box matching frontend format
     * @param {number} y - Starting Y position
     * @param {Object} totals - Total amounts
     * @returns {number} New Y position
     */
    const drawTotalsBox = (y, totals) => {
      const boxHeight = 120;
      
      doc.save()
        .roundedRect(SIDE_PADDING, y, CONTENT_WIDTH, boxHeight, 6)
        .fill('#f0fdf4')
        .stroke('#86efac')
        .lineWidth(0.5)
        .stroke()
        .restore();

      // Base Amount row
      doc.save()
        .fillColor('#166534')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.TOTAL_LABEL)
        .text('Total Base Amount:', SIDE_PADDING + 40, y + 28)
        .restore();

      doc.save()
        .fillColor('#166534')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.TOTAL_VALUE)
        .text(
          formatCurrency(totals.totalBase),
          PAGE_WIDTH - SIDE_PADDING - 40,
          y + 28,
          { align: 'right', width: 200 }
        )
        .restore();

      // Separator line
      doc.save()
        .moveTo(SIDE_PADDING + 40, y + 60)
        .lineTo(PAGE_WIDTH - SIDE_PADDING - 40, y + 60)
        .strokeColor('#86efac')
        .lineWidth(1)
        .stroke()
        .restore();

      // Purchase Amount row
      doc.save()
        .fillColor('#166534')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.TOTAL_LABEL + 2)
        .text('Total Purchase Amount:', SIDE_PADDING + 40, y + 75)
        .restore();

      doc.save()
        .fillColor('#059669')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.TOTAL_PURCHASE)
        .text(
          formatCurrency(totals.totalPurchase),
          PAGE_WIDTH - SIDE_PADDING - 40,
          y + 75,
          { align: 'right', width: 200 }
        )
        .restore();

      return y + boxHeight + 24;
    };


    /**
     * Draw table header
     * @param {number} y - Y position
     */
    const drawTableHeader = (y) => {
      const headers = [
        'Sr', 'Item', 'Category', 'Qty', 'Unit',
        'Base Rate', 'Purchase Rate', 'Base Amt',
        'Purchase Amt', 'Status'
      ];
      
      const colWidths = [25, 120, 65, 35, 35, 60, 65, 60, 70, 45];

      // Header background
      doc.save()
        .rect(PAGE_MARGIN, y - 4, CONTENT_WIDTH, 20)
        .fill(PDF_CONFIG.TABLE_HEADER_COLOR)
        .restore();

      // Header text
      let x = PAGE_MARGIN;
      doc.save()
        .fillColor('#fff')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY);
      
      headers.forEach((header, index) => {
        doc.text(header, x + 2, y, { 
          width: colWidths[index], 
          align: index >= 5 && index <= 8 ? 'right' : 'center' 
        });
        x += colWidths[index];
      });
      
      doc.restore();
      return colWidths;
    };

    /**
     * Draw table row matching frontend format (no Status column)
     * @param {number} y - Y position
     * @param {Array} row - Row data (7 columns: S.No, Item, Category badge, Qty, Base Rate, Purchase Rate, Base Amt, Purchase Amt)
     * @param {number} index - Row index
     * @param {Array} colWidths - Column widths
     */
    const drawTableRow = (y, row, index, colWidths) => {
      const rowHeight = 24;
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.save()
          .rect(SIDE_PADDING, y - 2, CONTENT_WIDTH, rowHeight)
          .fill(PDF_CONFIG.TABLE_STRIPE_COLOR)
          .restore();
      }

      let x = SIDE_PADDING;
      doc.save()
        .fillColor('#0f172a')
        .font(PDF_CONFIG.FONT_PRIMARY)
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY);

      row.forEach((cell, colIndex) => {
        const align = colIndex === 0 ? 'center' : (colIndex === 1 ? 'left' : 'right');
        doc.text(String(cell), x + 18, y + 4, { 
          width: colWidths[colIndex], 
          align: align
        });
        x += colWidths[colIndex];
      });

      doc.restore();
    };

    /**
     * Draw category summary matching frontend format
     */
    const drawCategorySummary = () => {
      checkAndAddPage(200);
      
      // Section title
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(28)
        .fillColor('#111827')
        .text('Summary by Category', SIDE_PADDING, currentY)
        .restore();

      currentY += 28;

      // Separator line
      doc.save()
        .moveTo(SIDE_PADDING, currentY)
        .lineTo(PAGE_WIDTH - SIDE_PADDING, currentY)
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .stroke()
        .restore();

      currentY += 18;

      // Summary table headers
      const summaryHeaders = ['Category', 'Items', 'Base Amount', 'Purchase Amount'];
      const summaryWidths = [200, 100, 140, 140];
      
      let x = SIDE_PADDING;
      doc.save()
        .fillColor('#1e293b')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY);
      
      summaryHeaders.forEach((header, index) => {
        doc.text(header, x, currentY, { 
          width: summaryWidths[index], 
          align: index > 0 ? 'right' : 'left' 
        });
        x += summaryWidths[index];
      });
      
      doc.restore();
      currentY += 25;

      // Summary rows
      Object.entries(categorySummary).forEach(([category, data]) => {
        if (checkAndAddPage(30)) {
          currentY += 25;
        }

        x = SIDE_PADDING;
        const rowData = [
          category,
          data.count.toString(),
          formatCurrency(data.base),
          formatCurrency(data.purchase)
        ];

        doc.save()
          .fillColor('#0f172a')
          .font(PDF_CONFIG.FONT_BOLD)
          .fontSize(PDF_CONFIG.FONT_SIZES.CATEGORY_NAME);

        // Category name (left aligned)
        doc.text(rowData[0], x, currentY, { 
          width: summaryWidths[0], 
          align: 'left' 
        });
        x += summaryWidths[0];

        doc.restore();

        // Other columns (right aligned)
        doc.save()
          .fillColor('#0f172a')
          .font(PDF_CONFIG.FONT_PRIMARY)
          .fontSize(PDF_CONFIG.FONT_SIZES.BODY);

        for (let i = 1; i < rowData.length; i++) {
          doc.text(rowData[i], x, currentY, { 
            width: summaryWidths[i], 
            align: 'right' 
          });
          x += summaryWidths[i];
        }

        doc.restore();
        currentY += 22;
      });

      currentY += 24;
    };

    // === MAIN PDF GENERATION FLOW ===

    // First page header
    drawHeader(pageNumber);
    
    // Room info section (Total Rooms and Total Items)
    checkAndAddPage(100);
    currentY = drawRoomInfoSection(currentY);
    
    // Category summary
    drawCategorySummary();

    // Room-wise tables
    rooms.forEach((room, roomIndex) => {
      // Check if we need a new page for the room section
      checkAndAddPage(80);
      
      // Section title: Detailed Items
      if (roomIndex === 0) {
        doc.save()
          .font(PDF_CONFIG.FONT_BOLD)
          .fontSize(28)
          .fillColor('#111827')
          .text('Detailed Items', SIDE_PADDING, currentY)
          .restore();

        currentY += 28;

        // Separator line
        doc.save()
          .moveTo(SIDE_PADDING, currentY)
          .lineTo(PAGE_WIDTH - SIDE_PADDING, currentY)
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .stroke()
          .restore();

        currentY += 18;
      }
      
      // Room title
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.CATEGORY_NAME)
        .fillColor('#111827')
        .text(room, SIDE_PADDING, currentY)
        .restore();
      
      currentY += 30;

      // Table header
      const colWidths = drawTableHeader(currentY);
      currentY += 32;

      // Table rows
      groupedByRoom[room].forEach((item, itemIndex) => {
        // Check page break for each row (prevent cutting)
        if (checkAndAddPage(30)) {
          // Redraw table header on new page
          drawTableHeader(currentY);
          currentY += 32;
        }

        const baseAmount = item.quantity * item.rate;
        const purchaseAmount = item.quantity * (item.purchaseRate ?? item.rate);

        // Row data matching frontend (7 columns, no Status)
        const row = [
          (itemIndex + 1).toString(),
          item.itemName + (item.category ? ` (${item.category})` : ''),
          `${item.quantity} ${item.unit}`,
          formatCurrency(item.rate),
          formatCurrency(item.purchaseRate ?? item.rate),
          formatCurrency(baseAmount),
          formatCurrency(purchaseAmount)
        ];

        drawTableRow(currentY, row, itemIndex, colWidths);
        currentY += 24;
      });

      currentY += 24;
    });

    // Grand total box
    checkAndAddPage(150);
    drawTotalsBox(currentY, totals);

    // Final footer
    drawFooter();
    doc.end();

  } catch (error) {
    console.error('PDF Export Error:', error);
    
    // Clean up PDF stream if document was created
    if (doc) {
      try {
        doc.end();
      } catch (e) {
        console.error('Error ending PDF document:', e);
      }
    }

    // Only send error response if headers not already sent
    if (!res.headersSent) {
      res.status(500).json({
        message: 'PDF Export failed',
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message
      });
    }
  }
};

/**
 * Calculate totals for BOQ items
 * @param {Array} items - BOQ items
 * @returns {Object} Totals object
 */
const calculateBOQTotals = (items) => {
  return items.reduce(
    (totals, item) => {
      const base = item.quantity * item.rate;
      const purchase = item.quantity * (item.purchaseRate ?? item.rate);
      
      totals.totalBase += base;
      totals.totalPurchase += purchase;
      return totals;
    },
    { totalBase: 0, totalPurchase: 0 }
  );
};

/**
 * Calculate category-wise summary
 * @param {Array} items - BOQ items
 * @returns {Object} Category summary
 */
const calculateCategorySummary = (items) => {
  const summary = {};
  
  items.forEach(item => {
    if (!item.category) return;
    
    if (!summary[item.category]) {
      summary[item.category] = { 
        count: 0, 
        base: 0, 
        purchase: 0 
      };
    }
    
    const base = item.quantity * item.rate;
    const purchase = item.quantity * (item.purchaseRate ?? item.rate);
    
    summary[item.category].count++;
    summary[item.category].base += base;
    summary[item.category].purchase += purchase;
  });
  
  return summary;
};

/**
 * Group items by room name
 * @param {Array} items - BOQ items
 * @returns {Object} Grouped items
 */
const groupItemsByRoom = (items) => {
  return items.reduce((grouped, item) => {
    const room = item.roomName?.trim() || 'Uncategorized';
    
    if (!grouped[room]) {
      grouped[room] = [];
    }
    
    grouped[room].push(item);
    return grouped;
  }, {});
};


/**
 * Export all BOQ items for a site to HTML
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const exportAllBOQToHTML = async (req, res) => {
  const { siteId } = req.body;

  if (!siteId) {
    return res.status(400).json({ message: "siteId is required" });
  }

  try {
    const site = await Site.findById(siteId);
    if (!site) return res.status(404).json({ message: "Site not found" });

    const hasAccess =
      site.companyName === req.user.companyName ||
      req.user.siteAccess?.some(id => id.toString() === siteId);

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const items = await BOQItem.find({ siteId }).sort({
      roomName: 1,
      createdAt: 1
    });

    if (!items.length) {
      return res.status(404).json({ message: "No BOQ items found" });
    }

    const totals = calculateBOQTotals(items);
    const categorySummary = calculateCategorySummary(items);
    const groupedByRoom = groupItemsByRoom(items);
    const rooms = Object.keys(groupedByRoom).sort();

    // Sirf data bhejo
    res.json({
      site: {
        id: site._id,
        name: site.name,
        projectType: site.projectType || "Interior Project"
      },
      stats: {
        totalItems: items.length,
        totalRooms: rooms.length
      },
      totals,
      categorySummary,
      rooms,
      groupedByRoom,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error("HTML BOQ Data Error:", error);
    res.status(500).json({
      message: "Failed to fetch BOQ data",
      error: error.message
    });
  }
};
  