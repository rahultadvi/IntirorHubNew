import Library from "../models/libraryModel.js";

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
 * ✅ GET ALL LIBRARY ITEMS (Company wise)
 * GET /library
 */
export const getLibraryItems = async (req, res) => {
  try {
    const { category, search } = req.query;

    // ✅ COMPANY WISE FILTER (MOST IMPORTANT)
    const filter = {
      companyName: req.user.companyName,
    };

    if (category) {
      filter.Category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const libraryItems = await Library.find(filter).sort({ createdAt: -1 });

    res.json({
      data: {
        items: libraryItems,
        count: libraryItems.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch library",
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
    if (item.CompanyName !== req.user.CompanyName) {
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
