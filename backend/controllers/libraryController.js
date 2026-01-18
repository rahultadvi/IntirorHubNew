import Library from "../models/libraryModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load library data from JSON file
const loadLibraryData = () => {
  try {
    const libraryDataPath = path.join(__dirname, "../models/libraryData.json");
    const fileContent = fs.readFileSync(libraryDataPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error loading library data:", error);
    return [];
  }
};

/**
 * ✅ ADD LIBRARY ITEM
 * POST /library/add
 */
export const addLibraryItem = async (req, res) => {
  try {
    const {
      name,
      qty,
      baseRate,
      ratePerQty,
      description,
      Category,
    } = req.body;

    // 🔒 Validation
    if (!name || qty == null || baseRate == null || ratePerQty == null) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    const libraryItem = new Library({
      companyName: req.user.companyName, // ✅ FIXED
      name,
      qty: Number(qty),
      baseRate: Number(baseRate),
      ratePerQty: Number(ratePerQty),
      description,
      Category,
    });

    await libraryItem.save();

    res.status(201).json({
      message: "Library item added successfully",
      libraryItem,
    });
  } catch (error) {
    console.error("Add Library Item Error:", error);
    res.status(500).json({
      message: "Failed to add library item",
      error: error.message,
    });
  }
};

/**
 * ✅ BULK ADD LIBRARY ITEMS
 * POST /library/bulk
 */
export const bulkAddLibraryItems = async (req, res) => {
  try {
    const { items } = req.body;
    const companyName = req.user.companyName;

    // 🔒 Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items array is required and must not be empty",
      });
    }

    // Validate each item
    const validItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name || item.qty == null || item.baseRate == null || item.ratePerQty == null) {
        continue; // Skip invalid items
      }

      validItems.push({
        companyName: companyName,
        name: item.name.trim(),
        qty: Number(item.qty),
        baseRate: Number(item.baseRate),
        ratePerQty: Number(item.ratePerQty),
        description: item.description || "",
        Category: item.Category || "",
        tag: item.tag || "",
      });
    }

    if (validItems.length === 0) {
      return res.status(400).json({
        message: "No valid items to import",
      });
    }

    // Bulk insert
    const result = await Library.insertMany(validItems);

    res.status(201).json({
      message: `Successfully imported ${result.length} library item(s)`,
      count: result.length,
      items: result,
    });
  } catch (error) {
    console.error("Bulk Add Library Items Error:", error);
    res.status(500).json({
      message: "Failed to bulk import library items",
      error: error.message,
    });
  }
};

/**
 * ✅ GET ALL LIBRARY ITEMS (Company wise)
 * GET /library
 * If company has no data, bulk insert from libraryData.json
 */
export const getLibraryItems = async (req, res) => {
  try {
    const { category, search } = req.query;
    const companyName = req.user.companyName;

    // ✅ COMPANY WISE FILTER (MOST IMPORTANT)
    const filter = {
      companyName: companyName,
    };

    if (category && category !== "All") {
      filter.Category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    // Check if company has any library items
    const existingCount = await Library.countDocuments({ companyName });

    // If no data exists for this company, bulk insert from libraryData.json
    if (existingCount === 0 && false) {
      console.log(`No library data found for company: ${companyName}. Bulk inserting...`);
      
      const libraryData = loadLibraryData();
      
      // Map libraryData.json to Library model format
      const itemsToInsert = libraryData.map((item) => {
        // Extract numeric value from rate strings (e.g., "₹18,000" -> 18000)
        const extractNumber = (str) => {
          if (!str) return 0;
          const numStr = str.toString().replace(/[₹,\s]/g, "");
          return parseFloat(numStr) || 0;
        };

        // Map tag to Category (normalize tag by trimming and converting to uppercase)
        const normalizeTag = (tag) => (tag || "").trim().toUpperCase();
        const normalizedTag = normalizeTag(item.tag);
        
        const tagToCategory = {
          "BEDS": "Furniture",
          "WARDROBE": "Furniture",
          "WAREDROBES": "Furniture",
          "TV UNIT": "Furniture",
          "SHOE RACK": "Furniture",
          "APPLICES": "Electronics",
          "ELECTRICAL": "Electrical",
          "CELLIGN LIGHTS  (ELECTRICAL)": "Electrical",
          "DOORS": "Hardware",
          "WALL PANNELS": "Finishes",
          " FALSE CELLING": "Finishes",
          "FLOOR": "Finishes",
          "BATHROOM ASSC.": "Hardware",
          "SERVICES": "Services",
        };

        // Determine category from tag
        let category = "Furniture"; // Default
        if (tagToCategory[normalizedTag]) {
          category = tagToCategory[normalizedTag];
        } else if (normalizedTag.includes("ELECTRICAL") || normalizedTag.includes("LIGHT")) {
          category = "Electrical";
        } else if (normalizedTag.includes("DOOR") || normalizedTag.includes("BATHROOM")) {
          category = "Hardware";
        } else if (normalizedTag.includes("FLOOR") || normalizedTag.includes("WALL") || normalizedTag.includes("CELLING")) {
          category = "Finishes";
        }

        return {
          companyName: companyName,
          name: item.name,
          qty: item.qty || 1,
          baseRate: extractNumber(item.baseRate),
          ratePerQty: extractNumber(item.baseRate), // Use baseRate as ratePerQty initially
          description: item.description || "",
          tag: item.tag || "",
          Category: category,
        };
      });

      // Bulk insert
      if (itemsToInsert.length > 0) {
        await Library.insertMany(itemsToInsert);
        console.log(`Bulk inserted ${itemsToInsert.length} library items for company: ${companyName}`);
      }
    }

    // Now fetch the library items
    const libraryItems = await Library.find(filter).sort({ createdAt: -1 });

    res.json({
      items: libraryItems,
      count: libraryItems.length,
    });
  } catch (err) {
    console.error("Get Library Items Error:", err);
    res.status(500).json({
      message: "Failed to fetch library",
      error: err.message,
    });
  }
};

/**
 * ✅ GET SINGLE LIBRARY ITEM
 * GET /library/:id
 */
export const getLibraryItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Library.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Library item not found",
      });
    }

    // 🔐 Ownership check (FIXED)
    if (item.companyName !== req.user.companyName) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    res.json(item);
  } catch (error) {
    console.error("Get Library Item Error:", error);
    res.status(500).json({
      message: "Failed to fetch item",
      error: error.message,
    });
  }
};

/**
 * ✅ UPDATE LIBRARY ITEM
 * PUT /library/:id
 */
export const updateLibraryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Library.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Library item not found",
      });
    }

    // 🔐 Ownership check (FIXED)
    if (item.companyName !== req.user.companyName) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const {
      name,
      qty,
      baseRate,
      ratePerQty,
      description,
      Category,
    } = req.body;

    if (name !== undefined) item.name = name;
    if (qty !== undefined) item.qty = Number(qty);
    if (baseRate !== undefined) item.baseRate = Number(baseRate);
    if (ratePerQty !== undefined) item.ratePerQty = Number(ratePerQty);
    if (description !== undefined) item.description = description;
    if (Category !== undefined) item.Category = Category;

    await item.save();

    res.json({
      message: "Library item updated successfully",
      item,
    });
  } catch (error) {
    console.error("Update Library Item Error:", error);
    res.status(500).json({
      message: "Failed to update library item",
      error: error.message,
    });
  }
};

/**
 * ✅ DELETE LIBRARY ITEM
 * DELETE /library/:id
 */
export const deleteLibraryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Library.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Library item not found",
      });
    }

    // 🔐 Ownership check (FIXED)
    if (item.companyName !== req.user.companyName) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    await Library.findByIdAndDelete(id);

    res.json({
      message: "Library item deleted successfully",
    });
  } catch (error) {
    console.error("Delete Library Item Error:", error);
    res.status(500).json({
      message: "Failed to delete library item",
      error: error.message,
    });
  }
};
