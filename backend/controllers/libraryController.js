import Library from "../models/libraryModel.js";
import fs from "fs";
import csv from "csv-parser";

/* =========================
   GET LIBRARY ITEMS
========================= */
export const getLibraryItems = async (req, res) => {
  try {
    const filter = {
      company: req.user.companyId
    };

    if (req.query.category && req.query.category !== "All") {
      filter.category = req.query.category;
    }

    const items = await Library.find(filter).sort({ createdAt: -1 });
    res.json(items);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   IMPORT CSV TO LIBRARY
========================= */
export const importLibraryCSV = async (req, res) => {
  try {
    const items = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        items.push({
          company: req.user.companyId,
          category: row.category,
          subCategory: row.subCategory,
          name: row.name,
          baseRate: Number(row.baseRate),
          unit: row.unit
        });
      })
      .on("end", async () => {
        await Library.insertMany(items);
        fs.unlinkSync(req.file.path);

        res.json({
          message: "Library CSV imported successfully",
          count: items.length
        });
      });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
