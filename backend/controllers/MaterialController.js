import Material from "../models/materialModel.js";
import Site from "../models/siteModel.js";

/* ======================================================
   ADD MATERIAL
====================================================== */
export const addMaterial = async (req, res) => {
  try {
    // Handle FormData - nested fields come as vendor[name], vendor[city], warranty[duration], etc.
    const category = req.body.category;
    const name = req.body.name;
    const description = req.body.description || '';
    const installedAt = req.body.installedAt;
    const vendorName = req.body['vendor[name]'] || req.body.vendor?.name;
    const vendorCity = req.body['vendor[city]'] || req.body.vendor?.city || '';
    const cost = parseFloat(req.body.cost);
    const warrantyDuration = req.body['warranty[duration]'] || req.body.warranty?.duration || '';
    const warrantyModel = req.body['warranty[model]'] || req.body.warranty?.model || '';
    const warrantySince = req.body['warranty[since]'] || req.body.warranty?.since;
    const siteId = req.body.siteId;

    // Validate required fields
    if (!category || !name || !installedAt || !vendorName || !cost || !siteId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check site access
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    // Check if user has access to this site
    const hasAccess =
      site.companyName === req.user.companyName ||
      (req.user.siteAccess &&
        req.user.siteAccess.some(id => id.toString() === siteId));

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Handle file uploads
    const invoice = req.files?.invoice ? req.files.invoice[0].path : null;
    const photo = req.files?.photo ? req.files.photo[0].path : null;
    const warrantyDoc = req.files?.warrantyDoc ? req.files.warrantyDoc[0].path : null;

    const material = await Material.create({
      category,
      name,
      description,
      installedAt,
      vendor: {
        name: vendorName,
        city: vendorCity
      },
      cost,
      warranty: {
        duration: warrantyDuration,
        model: warrantyModel,
        since: warrantySince ? new Date(warrantySince) : null
      },
      invoice,
      photo,
      warrantyDoc,
      siteId,
      createdBy: req.user._id,
      companyName: req.user.companyName
    });

    res.status(201).json({ message: "Material added successfully", material });
  } catch (err) {
    console.error("Error adding material:", err);
    res.status(500).json({ message: "Error adding material", error: err.message });
  }
};

/* ======================================================
   GET MATERIALS BY SITE
====================================================== */
export const getMaterialsBySite = async (req, res) => {
  try {
    const { siteId } = req.params;

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    // Check access
    const hasAccess =
      site.companyName === req.user.companyName ||
      (req.user.siteAccess &&
        req.user.siteAccess.some(id => id.toString() === siteId));

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const materials = await Material.find({ siteId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    res.json({ materials });
  } catch (err) {
    console.error("Error fetching materials:", err);
    res.status(500).json({ message: "Error fetching materials", error: err.message });
  }
};

/* ======================================================
   UPDATE MATERIAL
====================================================== */
export const updateMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    // Handle FormData - nested fields come as vendor[name], vendor[city], warranty[duration], etc.
    const category = req.body.category;
    const name = req.body.name;
    const description = req.body.description;
    const installedAt = req.body.installedAt;
    const vendorName = req.body['vendor[name]'] || req.body.vendor?.name;
    const vendorCity = req.body['vendor[city]'] || req.body.vendor?.city;
    const cost = req.body.cost ? parseFloat(req.body.cost) : undefined;
    const warrantyDuration = req.body['warranty[duration]'] || req.body.warranty?.duration;
    const warrantyModel = req.body['warranty[model]'] || req.body.warranty?.model;
    const warrantySince = req.body['warranty[since]'] || req.body.warranty?.since;

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Check access
    if (material.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Handle file uploads
    if (req.files?.invoice) {
      material.invoice = req.files.invoice[0].path;
    }
    if (req.files?.photo) {
      material.photo = req.files.photo[0].path;
    }
    if (req.files?.warrantyDoc) {
      material.warrantyDoc = req.files.warrantyDoc[0].path;
    }

    // Update fields
    if (category) material.category = category;
    if (name) material.name = name;
    if (description !== undefined) material.description = description;
    if (installedAt) material.installedAt = installedAt;
    if (vendorName) material.vendor.name = vendorName;
    if (vendorCity !== undefined) material.vendor.city = vendorCity;
    if (cost !== undefined) material.cost = cost;
    if (warrantyDuration !== undefined) material.warranty.duration = warrantyDuration;
    if (warrantyModel !== undefined) material.warranty.model = warrantyModel;
    if (warrantySince) material.warranty.since = new Date(warrantySince);

    await material.save();

    res.json({ message: "Material updated successfully", material });
  } catch (err) {
    console.error("Error updating material:", err);
    res.status(500).json({ message: "Error updating material", error: err.message });
  }
};

/* ======================================================
   DELETE MATERIAL
====================================================== */
export const deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Check access - only admin or creator can delete
    if (material.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Only admin or the creator can delete
    const isAdmin = req.user.role === 'ADMIN';
    const isCreator = material.createdBy.toString() === req.user._id.toString();
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Only admin or creator can delete materials" });
    }

    await Material.findByIdAndDelete(materialId);

    res.json({ message: "Material deleted successfully" });
  } catch (err) {
    console.error("Error deleting material:", err);
    res.status(500).json({ message: "Error deleting material", error: err.message });
  }
};

/* ======================================================
   GET SINGLE MATERIAL
====================================================== */
export const getMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;

    const material = await Material.findById(materialId)
      .populate("createdBy", "name email")
      .populate("siteId", "name");

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Check access
    if (material.companyName !== req.user.companyName) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ material });
  } catch (err) {
    console.error("Error fetching material:", err);
    res.status(500).json({ message: "Error fetching material", error: err.message });
  }
};

