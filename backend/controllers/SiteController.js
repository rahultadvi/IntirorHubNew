import Site from "../models/siteModel.js";
import mongoose from "mongoose";

const sanitizeSite = (siteDoc) => {
  const site = siteDoc.toObject({ getters: true });
  return {
    id: site._id,
    name: site.name,
    description: site.description,
    image: site.image,
    contractValue: site.contractValue || 0,
    clientEmail: site.clientEmail,
    clientPhone: site.clientPhone,
    startDate: site.startDate,
    expectedCompletionDate: site.expectedCompletionDate,
    createdAt: site.createdAt,
    budgetAllocation: site.budgetAllocation || {
      categories: {
        Material: 0,
        Labour: 0,
        Electrical: 0,
        Equipment: 0,
        Transport: 0,
        Miscellaneous: 0,
      },
      emergencyReserve: 0,
      profitMargin: 0,
      emergencyReserveLocked: true,
      profitMarginLocked: true,
    },
  };
};

export const listSites = async (req, res) => {
  try {
    const userId = req.user._id;
    const parentId = req.user.parentId;

    let query;
    if (req.user.role === 'ADMIN') {
      query = parentId ? { $or: [{ userId }, { userId: parentId }] } : { userId };
    } else {
      const accessIds = Array.isArray(req.user.siteAccess) ? req.user.siteAccess : [];
      if (accessIds.length === 0) {
        return res.status(200).json({ sites: [] });
      }
      query = { _id: { $in: accessIds } };
    }

    const sites = await Site.find(query).sort({ createdAt: -1 });

    const payload = sites.map(sanitizeSite);

    return res.status(200).json({ sites: payload });
  } catch (error) {
    console.error("listSites error", error);
    return res.status(500).json({ message: "Unable to fetch sites" });
  }
};

export const createSite = async (req, res) => {
  try {

    const { name, description, image, clientEmail, clientPhone, startDate, expectedCompletionDate } = req.body;
    let { contractValue, budget } = req.body;

    const parseNumber = (v) => {
      if (v === undefined || v === null || v === '') return NaN;
      if (typeof v === 'number') return v;
      const cleaned = String(v).replace(/,/g, '').trim();
      return Number(cleaned);
    };

    const parsedContract = !isNaN(parseNumber(contractValue))
      ? parseNumber(contractValue)
      : !isNaN(parseNumber(budget))
      ? parseNumber(budget)
      : 0;

    const finalContractValue = Number.isFinite(parsedContract) ? parsedContract : 0;


    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Site name is required' });
    }

    const site = await Site.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      image: image || undefined,
      contractValue: finalContractValue,
      clientEmail: clientEmail || undefined,
      clientPhone: clientPhone || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
      companyName: req.user.companyName,
      createdBy: req.user._id,
      userId: req.user._id,
    });

    return res.status(201).json({
      message: 'Site created successfully',
      site: sanitizeSite(site),
    });
  } catch (error) {
    console.error('createSite error', error);
    return res.status(500).json({ message: 'Unable to create site' });
  }
};


// Admin: update contract value
export const updateContractValue = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can update contract value" });
    }
    const { siteId } = req.params;
    const { contractValue } = req.body;
    if (typeof contractValue !== "number" || contractValue < 0) {
      return res.status(400).json({ message: "Invalid contract value" });
    }
    const site = await Site.findByIdAndUpdate(siteId, { contractValue }, { new: true });
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }
    return res.json({ message: "Contract value updated", site: sanitizeSite(site) });
  } catch (error) {
    console.error("updateContractValue error", error);
    return res.status(500).json({ message: "Unable to update contract value" });
  }
};

// Admin: update site details (name, description, contractValue)
export const updateSite = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can update site" });
    }

    const { siteId } = req.params;
    const { name, description, contractValue, clientEmail, clientPhone, startDate, expectedCompletionDate } = req.body;

    const update = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof description === "string") update.description = description.trim() || undefined;
    if (contractValue !== undefined) {
      const num = Number(String(contractValue).replace(/,/g, "").trim());
      if (Number.isNaN(num) || num < 0) {
        return res.status(400).json({ message: "Invalid contractValue" });
      }
      update.contractValue = num;
    }
    if (clientEmail !== undefined) update.clientEmail = clientEmail;
    if (clientPhone !== undefined) update.clientPhone = clientPhone;
    if (startDate !== undefined) update.startDate = startDate ? new Date(startDate) : undefined;
    if (expectedCompletionDate !== undefined) update.expectedCompletionDate = expectedCompletionDate ? new Date(expectedCompletionDate) : undefined;

    const site = await Site.findByIdAndUpdate(siteId, update, { new: true });
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    return res.json({ message: "Site updated", site: sanitizeSite(site) });
  } catch (error) {
    console.error("updateSite error", error);
    return res.status(500).json({ message: "Unable to update site" });
  }
};

// Save or update budget allocation
export const saveBudgetAllocation = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admin can save budget allocation" });
    }

    const { siteId } = req.params;
    const { categories, emergencyReserve, profitMargin, emergencyReserveLocked, profitMarginLocked } = req.body;

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({ message: "Invalid site ID" });
    }

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    // Check if user has access to this site
    if (site.userId.toString() !== req.user._id.toString() && 
        (!req.user.parentId || site.userId.toString() !== req.user.parentId.toString())) {
      return res.status(403).json({ message: "Access denied to this site" });
    }

    // Update budget allocation
    const updateData = {};
    if (categories) {
      updateData["budgetAllocation.categories"] = {
        Material: Number(categories.Material) || 0,
        Labour: Number(categories.Labour) || 0,
        Electrical: Number(categories.Electrical) || 0,
        Equipment: Number(categories.Equipment) || 0,
        Transport: Number(categories.Transport) || 0,
        Miscellaneous: Number(categories.Miscellaneous) || 0,
      };
    }
    if (emergencyReserve !== undefined) {
      updateData["budgetAllocation.emergencyReserve"] = Number(emergencyReserve) || 0;
    }
    if (profitMargin !== undefined) {
      updateData["budgetAllocation.profitMargin"] = Number(profitMargin) || 0;
    }
    if (emergencyReserveLocked !== undefined) {
      updateData["budgetAllocation.emergencyReserveLocked"] = Boolean(emergencyReserveLocked);
    }
    if (profitMarginLocked !== undefined) {
      updateData["budgetAllocation.profitMarginLocked"] = Boolean(profitMarginLocked);
    }

    const updatedSite = await Site.findByIdAndUpdate(
      siteId,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      message: "Budget allocation saved successfully",
      budgetAllocation: updatedSite.budgetAllocation || {
        categories: {
          Material: 0,
          Labour: 0,
          Electrical: 0,
          Equipment: 0,
          Transport: 0,
          Miscellaneous: 0,
        },
        emergencyReserve: 0,
        profitMargin: 0,
        emergencyReserveLocked: true,
        profitMarginLocked: true,
      },
    });
  } catch (error) {
    console.error("saveBudgetAllocation error", error);
    return res.status(500).json({ message: "Unable to save budget allocation" });
  }
};

// Get budget allocation (All users can read for validation, but only admin can modify)
export const getBudgetAllocation = async (req, res) => {
  try {
    const { siteId } = req.params;

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({ message: "Invalid site ID" });
    }

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    // Check if user has access to this site
    const userId = req.user._id;
    const parentId = req.user.parentId;
    
    let hasAccess = site.userId.toString() === userId.toString() || 
                    (parentId && site.userId.toString() === parentId.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this site" });
    }

    const budgetAllocation = site.budgetAllocation || {
      categories: {
        Material: 0,
        Labour: 0,
        Electrical: 0,
        Equipment: 0,
        Transport: 0,
        Miscellaneous: 0,
      },
      emergencyReserve: 0,
      profitMargin: 0,
      emergencyReserveLocked: true,
      profitMarginLocked: true,
    };

    return res.status(200).json({ budgetAllocation });
  } catch (error) {
    console.error("getBudgetAllocation error", error);
    return res.status(500).json({ message: "Unable to fetch budget allocation" });
  }
};

export default {
  listSites,
  createSite,
};
