import BOQItem from '../models/boqModel.js';
// import Library from '../models/libraryModel.js';
import Site from '../models/siteModel.js';
import User from '../models/userModel.js';
import { getUploadedFilePath } from '../utils/multer.js';
import fs from 'fs';
import path from 'path';

const REFERENCE_IMAGE_FOLDER = path.join(process.cwd(), 'uploads', 'boq-images');

// Ensure folder exists
try { fs.mkdirSync(REFERENCE_IMAGE_FOLDER, { recursive: true }); } catch (e) {}

export const addBOQItem = async (req, res) => {
  try {
    const { roomName, itemName, quantity, unit, rate, purchaseRate, comments, siteId, referenceImageBase64, referenceImageFilename } = req.body;

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
      companyName: req.user.companyName
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
      boqItem.referenceImage = { path: `/uploads/boq-images/${safeName}`, filename: referenceImageFilename };
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
      boqItem.bill = process.env.BACKEND_URL + `/uploads/boq/${req.files.bill[0].filename}`;
    }
    if (req.files?.photo) {
      boqItem.photo = process.env.BACKEND_URL + `/uploads/boq/${req.files.photo[0].filename}`;
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