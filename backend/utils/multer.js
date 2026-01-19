import multer from "multer";
import path from "path";
import fs from "fs";

/* ================= ALLOWED FILE TYPES ================= */

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp3",
  "audio/m4a",
  "video/webm", // WebM can be video or audio
];

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
];

/* ================= STORAGE ================= */

const storage = (folderName) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = `uploads/${folderName}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });

/* ================= FILE FILTERS ================= */

// Images only
const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Attachments (audio + documents)
const attachmentFileFilter = (req, file, cb) => {
  const isAudio =
    ALLOWED_AUDIO_TYPES.includes(file.mimetype) ||
    file.originalname.match(/\.(mp3|wav|ogg|webm|m4a)$/i);

  const isDocument =
    ALLOWED_DOCUMENT_TYPES.includes(file.mimetype) ||
    file.originalname.match(/\.(pdf|doc|docx|csv)$/i);

  if (isAudio || isDocument) {
    cb(null, true);
  } else {
    cb(new Error("Only audio and document files are allowed"), false);
  }
};

// Feed (image + audio + document)
const feedFileFilter = (req, file, cb) => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isAudio =
    ALLOWED_AUDIO_TYPES.includes(file.mimetype) ||
    file.originalname.match(/\.(mp3|wav|ogg|webm|m4a)$/i);
  const isDocument =
    ALLOWED_DOCUMENT_TYPES.includes(file.mimetype) ||
    file.originalname.match(/\.(pdf|doc|docx)$/i);

  if (isImage || isAudio || isDocument) {
    cb(null, true);
  } else {
    console.error("Feed file filter rejected:", {
      filename: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    cb(new Error(`Invalid feed file type: ${file.mimetype || 'unknown'} for ${file.originalname}`), false);
  }
};

/* ================= SIZE LIMITS ================= */

const SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  attachment: 20 * 1024 * 1024, // 20MB (audio + docs)
};

/* ================= UPLOADERS ================= */

// Multiple images
export const uploadImages = (folder = "images", max = 5) =>
  multer({
    storage: storage(folder),
    fileFilter: imageFileFilter,
    limits: { fileSize: SIZE_LIMITS.image },
  }).array("images", max);

// Single image
export const uploadSingleImage = (folder = "images") =>
  multer({
    storage: storage(folder),
    fileFilter: imageFileFilter,
    limits: { fileSize: SIZE_LIMITS.image },
  }).single("image");

// Attachments (audio + documents)
export const uploadAttachments = (folder = "attachments") =>
  multer({
    storage: storage(folder),
    fileFilter: attachmentFileFilter,
    limits: { fileSize: SIZE_LIMITS.attachment },
  }).array("attachments", 10);

// Feed files (image + audio + docs)
export const uploadFeedFiles = (folder = "feed-files") =>
  multer({
    storage: storage(folder),
    fileFilter: feedFileFilter,
    limits: { fileSize: SIZE_LIMITS.attachment },
  }).fields([
    { name: "images", maxCount: 5 },
    { name: "attachments", maxCount: 5 },
  ]);

// Single file
export const uploadSingleFile = (folder = "files", fieldName = "file") =>
  multer({
    storage: storage(folder),
    fileFilter: feedFileFilter,
    limits: { fileSize: SIZE_LIMITS.attachment },
  }).single(fieldName);

// Material files (invoice, photo, warrantyDoc)
export const uploadMaterialFiles = (folder = "materials") =>
  multer({
    storage: storage(folder),
    fileFilter: (req, file, cb) => {
      // Allow images and PDFs
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
      const isPDF = file.mimetype === "application/pdf";
      const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.mimetype);
      
      if (isImage || isPDF || isDocument) {
        cb(null, true);
      } else {
        cb(new Error("Only images, PDFs, and documents are allowed"), false);
      }
    },
    limits: { fileSize: SIZE_LIMITS.attachment },
  }).fields([
    { name: "invoice", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "warrantyDoc", maxCount: 1 },
  ]);

// BOQ files (bill, photo)
export const uploadBOQFiles = (folder = "boq") =>
  multer({
    storage: storage(folder),
    fileFilter: (req, file, cb) => {
      // Allow images and PDFs
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
      const isPDF = file.mimetype === "application/pdf";
      const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.mimetype);
      
      if (isImage || isPDF || isDocument) {
        cb(null, true);
      } else {
        cb(new Error("Only images, PDFs, and documents are allowed"), false);
      }
    },
    limits: { fileSize: SIZE_LIMITS.attachment },
  }).fields([
    { name: "bill", maxCount: 1 },
    { name: "photo", maxCount: 1 },
  ]);


  // ================= COMPANY LOGO UPLOAD =================

export const uploadCompanyLogo = (folder = "company-logos") =>
  multer({
    storage: storage(folder),
    fileFilter: imageFileFilter,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  }).single("logo");


/* ================= HELPERS ================= */

export const getUploadedImagePaths = (files, folder = "images") => {
  if (!files || files.length === 0) return [];
  return files.map((f) => `/uploads/${folder}/${f.filename}`);
};

export const getUploadedFilePath = (file, folder = "images") => {
  if (!file) return null;
  return `/uploads/${folder}/${file.filename}`;
};

export const getUploadedAttachmentPaths = (
  files,
  folder = "attachments"
) => {
  if (!files || files.length === 0) return [];
  return files.map((f) => ({
    url: `/uploads/${folder}/${f.filename}`,
    name: f.originalname,
    type: f.mimetype,
    size: f.size,
  }));
};

/* ================= DEFAULT EXPORT ================= */

export default uploadAttachments("attachments");
