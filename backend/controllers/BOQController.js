import BOQItem from '../models/boqModel.js';
import BOQRoomLock from '../models/boqRoomLockModel.js';
// import Library from '../models/libraryModel.js';
import Site from '../models/siteModel.js';
import PDFDocument from "pdfkit";
import User from '../models/userModel.js';
import { getUploadedFilePath } from '../utils/multer.js';
import fs from 'fs';
import path from 'path';

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



/**
 * Export all BOQ items for a site to PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const exportAllBOQToPDF = async (req, res) => {
  const { siteId } = req.body;
  let doc = null;

  // Validate request
  if (!siteId) {
    return res.status(400).json({ message: 'siteId is required' });
  }

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

    const { PAGE_MARGIN, PAGE_WIDTH, PAGE_HEIGHT } = PDF_CONFIG;
    const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

    // Initialize PDF document
    doc = new PDFDocument({ 
      size: 'A4', 
      margin: PAGE_MARGIN,
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
     * Draw page header
     * @param {number} pageNo - Current page number
     */
    const drawHeader = (pageNo) => {
      const top = 20;
      
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.TITLE)
        .fillColor('#000')
        .text('BILL OF QUANTITIES', PAGE_MARGIN, top)
        .restore();

      doc.save()
        .font(PDF_CONFIG.FONT_PRIMARY)
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY)
        .fillColor(PDF_CONFIG.SECONDARY_COLOR)
        .text(
          `${site.projectType || '2 BHK Interior'} - ${site.name}`,
          PAGE_MARGIN,
          top + 18
        )
        .restore();

      // Page number and date
      const pageInfoX = PAGE_WIDTH - PAGE_MARGIN - 80;
      doc.save()
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY)
        .fillColor('#000')
        .text(`Page ${pageNo}`, pageInfoX, top, { align: 'right' })
        .text(
          new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          pageInfoX,
          top + 15,
          { align: 'right' }
        )
        .restore();

      // Separator line
      doc.save()
        .moveTo(PAGE_MARGIN, top + 35)
        .lineTo(PAGE_WIDTH - PAGE_MARGIN, top + 35)
        .strokeColor('#ccc')
        .lineWidth(0.5)
        .stroke()
        .restore();

      currentY = top + 55;
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
      if (currentY + requiredHeight > PAGE_HEIGHT - PAGE_MARGIN) {
        drawFooter();
        doc.addPage();
        pageNumber++;
        drawHeader(pageNumber);
        return true;
      }
      return false;
    };

    /**
     * Draw project info card
     * @param {number} y - Starting Y position
     * @returns {number} New Y position
     */
    const drawProjectInfoCard = (y) => {
      const cardHeight = 80;
      
      doc.save()
        .roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, cardHeight, 8)
        .fill(PDF_CONFIG.BACKGROUND_COLOR)
        .stroke(PDF_CONFIG.BORDER_COLOR)
        .stroke()
        .restore();

      // Project/Site info
      doc.save()
        .fillColor(PDF_CONFIG.SECONDARY_COLOR)
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY)
        .text('PROJECT / SITE', PAGE_MARGIN + 20, y + 15)
        .restore();

      doc.save()
        .fillColor('#000')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
        .text(`${site.projectType} - ${site.name}`, PAGE_MARGIN + 20, y + 30)
        .restore();

      // Room/Area info
      doc.save()
        .fillColor(PDF_CONFIG.SECONDARY_COLOR)
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY)
        .text('ROOM / AREA', PAGE_MARGIN + 300, y + 15)
        .restore();

      doc.save()
        .fillColor('#000')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
        .text('All Rooms', PAGE_MARGIN + 300, y + 30)
        .restore();

      // Additional info
      const infoItems = [
        { label: 'Total Items', value: items.length },
        { label: 'Total Rooms', value: rooms.length },
        { label: 'Report Type', value: 'Detailed BOQ' }
      ];

      let infoX = PAGE_MARGIN + 20;
      infoItems.forEach((item, index) => {
        if (index > 0) infoX += 120;
        
        doc.save()
          .fillColor(PDF_CONFIG.SECONDARY_COLOR)
          .fontSize(PDF_CONFIG.FONT_SIZES.BODY)
          .text(item.label, infoX, y + 55)
          .restore();

        doc.save()
          .fillColor('#000')
          .font(PDF_CONFIG.FONT_BOLD)
          .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
          .text(String(item.value), infoX, y + 70)
          .restore();
      });

      return y + cardHeight + 20;
    };

    /**
     * Draw totals summary box
     * @param {number} y - Starting Y position
     * @param {Object} totals - Total amounts
     * @returns {number} New Y position
     */
    const drawTotalsBox = (y, totals) => {
      const boxHeight = 70;
      
      doc.save()
        .roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, 10)
        .fill('#dcfce7')
        .stroke('#86efac')
        .stroke()
        .restore();

      // Base Amount
      doc.save()
        .fillColor('#166534')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
        .text('Total Base Amount:', PAGE_MARGIN + 20, y + 20)
        .text(
          formatCurrency(totals.totalBase),
          PAGE_WIDTH - PAGE_MARGIN - 20,
          y + 20,
          { align: 'right' }
        )
        .restore();

      // Purchase Amount
      doc.save()
        .fillColor('#166534')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
        .text('Total Purchase Amount:', PAGE_MARGIN + 20, y + 45)
        .text(
          formatCurrency(totals.totalPurchase),
          PAGE_WIDTH - PAGE_MARGIN - 20,
          y + 45,
          { align: 'right' }
        )
        .restore();

      return y + boxHeight + 20;
    };

    /**
     * Draw dashboard-style header
     */
    const drawDashboardHeader = () => {
      const bannerTop = currentY + 10;
      const bannerHeight = 90;

      // Banner background
      doc.save()
        .rect(PAGE_MARGIN, bannerTop, CONTENT_WIDTH, bannerHeight)
        .fill('#1e293b')
        .restore();

      // Main title
      doc.save()
        .fillColor('#fff')
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.HEADER)
        .text('BILL OF QUANTITIES', PAGE_MARGIN + 20, bannerTop + 20)
        .restore();

      // Subtitle
      doc.save()
        .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
        .font(PDF_CONFIG.FONT_PRIMARY)
        .fillColor('#fff')
        .text(
          `${site.projectType || '2 BHK Interior'} - ${site.name}`,
          PAGE_MARGIN + 20,
          bannerTop + 45
        )
        .restore();

      // Date card
      const dateCardWidth = 140;
      const dateCardHeight = 40;
      const dateCardX = PAGE_WIDTH - PAGE_MARGIN - dateCardWidth - 20;
      
      doc.save()
        .rect(dateCardX, bannerTop + 20, dateCardWidth, dateCardHeight)
        .fill('#334155')
        .restore();

      doc.save()
        .fillColor('#fff')
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY)
        .text('DOCUMENT DATE', dateCardX + 15, bannerTop + 25)
        .restore();

      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
        .fillColor('#fff')
        .text(
          new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          dateCardX + 15,
          bannerTop + 40
        )
        .restore();

      currentY = bannerTop + bannerHeight + 30;
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
     * Draw table row
     * @param {number} y - Y position
     * @param {Array} row - Row data
     * @param {number} index - Row index
     * @param {Array} colWidths - Column widths
     */
    const drawTableRow = (y, row, index, colWidths) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.save()
          .rect(PAGE_MARGIN, y - 2, CONTENT_WIDTH, 18)
          .fill(PDF_CONFIG.TABLE_STRIPE_COLOR)
          .restore();
      }

      let x = PAGE_MARGIN;
      doc.save()
        .fillColor('#000')
        .font(PDF_CONFIG.FONT_PRIMARY)
        .fontSize(PDF_CONFIG.FONT_SIZES.BODY);

      row.forEach((cell, colIndex) => {
        const align = colIndex >= 5 && colIndex <= 8 ? 'right' : 'left';
        doc.text(String(cell), x + 2, y, { 
          width: colWidths[colIndex], 
          align 
        });
        x += colWidths[colIndex];
      });

      doc.restore();
    };

    /**
     * Draw category summary
     */
    const drawCategorySummary = () => {
      checkAndAddPage(150);
      
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
        .fillColor(PDF_CONFIG.PRIMARY_COLOR)
        .text('Category Summary', PAGE_MARGIN, currentY)
        .restore();

      currentY += 20;

      // Summary table headers
      const summaryHeaders = ['Category', 'Items', 'Base Amount', 'Purchase Amount'];
      const summaryWidths = [150, 80, 120, 120];
      
      let x = PAGE_MARGIN;
      doc.save()
        .fillColor(PDF_CONFIG.PRIMARY_COLOR)
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
      currentY += 20;

      // Summary rows
      Object.entries(categorySummary).forEach(([category, data]) => {
        if (checkAndAddPage(20)) {
          currentY += 20;
        }

        x = PAGE_MARGIN;
        const rowData = [
          category,
          data.count.toString(),
          formatCurrency(data.base),
          formatCurrency(data.purchase)
        ];

        doc.save()
          .fillColor('#000')
          .font(PDF_CONFIG.FONT_PRIMARY)
          .fontSize(PDF_CONFIG.FONT_SIZES.BODY);

        rowData.forEach((cell, index) => {
          doc.text(cell, x, currentY, { 
            width: summaryWidths[index], 
            align: index > 0 ? 'right' : 'left' 
          });
          x += summaryWidths[index];
        });

        doc.restore();
        currentY += 15;
      });

      currentY += 20;
    };

    // === MAIN PDF GENERATION FLOW ===

    // First page header
    drawHeader(pageNumber);
    drawDashboardHeader();
    
    // Project info card
    checkAndAddPage(100);
    currentY = drawProjectInfoCard(currentY);
    
    // Category summary
    drawCategorySummary();

    // Room-wise tables
    rooms.forEach((room, roomIndex) => {
      // Check if we need a new page for the room header
      checkAndAddPage(50);
      
      // Room title
      doc.save()
        .font(PDF_CONFIG.FONT_BOLD)
        .fontSize(PDF_CONFIG.FONT_SIZES.SUBTITLE)
        .fillColor(PDF_CONFIG.PRIMARY_COLOR)
        .text(`Room: ${room}`, PAGE_MARGIN, currentY)
        .restore();
      
      currentY += 25;

      // Table header
      const colWidths = drawTableHeader(currentY);
      currentY += 25;

      // Table rows
      groupedByRoom[room].forEach((item, itemIndex) => {
        // Check page break for each row
        if (checkAndAddPage(20)) {
          // Redraw table header on new page
          drawTableHeader(currentY);
          currentY += 25;
        }

        const baseAmount = item.quantity * item.rate;
        const purchaseAmount = item.quantity * (item.purchaseRate ?? item.rate);

        const row = [
          (itemIndex + 1).toString(),
          item.itemName,
          item.category,
          item.quantity.toString(),
          item.unit,
          formatCurrency(item.rate),
          formatCurrency(item.purchaseRate ?? item.rate),
          formatCurrency(baseAmount),
          formatCurrency(purchaseAmount),
          item.status || 'Pending'
        ];

        drawTableRow(currentY, row, itemIndex, colWidths);
        currentY += 20;
      });

      currentY += 30;
    });

    // Grand total box
    checkAndAddPage(100);
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
  