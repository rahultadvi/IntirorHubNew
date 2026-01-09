import mongoose from "mongoose";
import path from "path";
import Feed from "../models/feedModel.js";
import Site from "../models/siteModel.js";

const buildAvatarSeed = (user) => {
  if (!user) return "User";
  return encodeURIComponent(user.email || user.name || user.companyName || "User");
};

const sanitizeFeedItem = (doc, currentUserId = null) => {
  const item = doc.toObject({ getters: true });

  const createdBy = item.createdBy || {};
  const site = item.site || {};

  const likedBy = Array.isArray(item.likedBy) ? item.likedBy.map(String) : [];
  const liked = currentUserId ? likedBy.includes(String(currentUserId)) : false;

  return {
    id: item._id,
    type: item.type,
    title: item.title || "",
    content: item.content,
    images: item.images || [],
    attachments: item.attachments || [],
    timestamp: item.createdAt,
    likes: (item.likes ?? 0) || likedBy.length,
    comments: item.commentsCount ?? 0,
    liked,
    siteId: site._id || site.id || site,
    siteName: site.name,
    user: {
      name: createdBy.name || createdBy.email || "User",
      role: createdBy.role || "Member",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${buildAvatarSeed(createdBy)}`,
    },
  };
};

export const listFeed = async (req, res) => {
  try {
    const { siteId } = req.query;

    if (!siteId) {
      return res.status(400).json({ message: "siteId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({ message: "Invalid siteId" });
    }

    // Allow access to sites created by user OR their parent
    const query = req.user.parentId
      ? { _id: siteId, $or: [{ userId: req.user._id }, { userId: req.user.parentId }] }
      : { _id: siteId, userId: req.user._id };

    const site = await Site.findOne(query);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    const items = await Feed.find({
      site: site._id,
      deletedAt: null, // Exclude soft-deleted items
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email role companyName")
      .populate("site", "name");

    const payload = items.map(sanitizeFeedItem);

    return res.status(200).json({ items: payload });
  } catch (error) {
    console.error("listFeed error", error);
    return res.status(500).json({ message: error.message || "Unable to fetch feed" });
  }
};

export const createFeedItem = async (req, res) => {
  try {
    const { siteId, title, content, feedType } = req.body;

    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({ message: "Invalid siteId" });
    }

    const query = req.user.parentId
      ? { _id: siteId, $or: [{ userId: req.user._id }, { userId: req.user.parentId }] }
      : { _id: siteId, userId: req.user._id };

    const site = await Site.findOne(query);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    const trimmedTitle = (title || "").trim();
    const trimmedContent = (content || "").trim();

    // ✅ MULTER FILES (ONLY ONCE)
    console.log("=== FILES RECEIVED ===");
    console.log("req.files:", JSON.stringify(req.files, null, 2));
    console.log("req.files?.images:", req.files?.images);
    console.log("req.files?.attachments:", req.files?.attachments);
    
    const uploadedImages = req.files?.images
      ? req.files.images.map(f => `${process.env.BACKEND_URL || `http://${req.get('host')}`}/uploads/feed-files/${f.filename}`)
      : [];

    // Handle attachments from multer (file uploads)
    let normalizedAttachments = req.files?.attachments
      ? req.files.attachments.map(f => {
          console.log("Processing attachment:", {
            filename: f.filename,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
            fieldname: f.fieldname
          });
          return {
            url: `/uploads/feed-files/${f.filename}`,
            name: f.originalname,
            type: f.mimetype,
            size: f.size,
          };
        })
      : [];
    
    console.log("Normalized attachments from multer:", normalizedAttachments);

    // ✅ Handle attachments from request body (if sent as JSON string or array)
    if (req.body.attachments) {
      console.log("Raw attachments from body:", typeof req.body.attachments, req.body.attachments);
      try {
        let bodyAttachments = req.body.attachments;
        
        // If it's a string, try to parse it
        if (typeof bodyAttachments === 'string') {
          let cleaned = bodyAttachments.trim();
          
          // Handle JavaScript-like string concatenation format
          // Remove string concatenation operators and quotes
          cleaned = cleaned
            .replace(/\+\s*['"]/g, '') // Remove + ' or + "
            .replace(/\+\s*\n/g, '')   // Remove + newline
            .replace(/['"]\s*\+/g, '')   // Remove ' + or " +
            .replace(/\\n/g, ' ')      // Replace \n with space
            .replace(/\n/g, ' ')        // Replace actual newlines with space
            .replace(/\s+/g, ' ')       // Normalize whitespace
            .trim();
          
          // Try JSON.parse first (after converting single quotes to double quotes for JSON)
          try {
            // Convert single quotes to double quotes for JSON compatibility
            let jsonString = cleaned.replace(/'/g, '"');
            bodyAttachments = JSON.parse(jsonString);
          } catch (parseError) {
            // If JSON.parse fails, extract all objects using regex
            // Pattern: { url: '...', name: '...', type: '...', size: ... }
            const objectPattern = /\{\s*url:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]\s*,\s*type:\s*['"]([^'"]+)['"]\s*,\s*size:\s*(\d+)\s*\}/g;
            const matches = [];
            let match;
            
            while ((match = objectPattern.exec(cleaned)) !== null) {
              matches.push({
                url: match[1],
                name: match[2],
                type: match[3],
                size: parseInt(match[4]),
              });
            }
            
            if (matches.length > 0) {
              bodyAttachments = matches;
            } else {
              // Fallback: try to extract at least the URL
              const urlMatch = cleaned.match(/url:\s*['"]([^'"]+)['"]/);
              if (urlMatch) {
                bodyAttachments = [{
                  url: urlMatch[1],
                  name: path.basename(urlMatch[1]),
                  type: 'application/octet-stream',
                  size: 0,
                }];
              } else {
                console.error("Could not parse attachments string:", cleaned);
                throw parseError;
              }
            }
          }
        }
        
        // If it's an array, normalize each item
        if (Array.isArray(bodyAttachments)) {
          const parsedAttachments = bodyAttachments.map(att => {
            // If attachment is already an object with the right structure, use it
            if (typeof att === 'object' && att !== null && att.url) {
              return {
                url: att.url,
                name: att.name || path.basename(att.url),
                type: att.type || 'application/octet-stream',
                size: att.size || 0,
              };
            }
            // If it's a string (URL), convert to object
            if (typeof att === 'string') {
              return {
                url: att,
                name: path.basename(att),
                type: 'application/octet-stream',
                size: 0,
              };
            }
            return null;
          }).filter(Boolean);
          
          // Merge with multer attachments (multer takes precedence for duplicates)
          normalizedAttachments = [...parsedAttachments, ...normalizedAttachments];
        }
      } catch (error) {
        console.error("Failed to parse attachments from body:", error);
        // Continue with multer attachments only if parsing fails
      }
    }

    if (!trimmedContent && uploadedImages.length === 0 && normalizedAttachments.length === 0) {
      return res.status(400).json({ message: "Content, images or attachments required" });
    }

    let type = "update";
    if (uploadedImages.length) type = "photo";
    else if (normalizedAttachments.length) type = "document";


    console.log("NORMALIZED ATTACHMENTS:", normalizedAttachments);

   const feed = await Feed.create({
  site: siteId,
  siteName: site.name,
  createdBy: req.user._id,
  companyName: req.user.companyName,
  type,
  feedType,
  title: trimmedTitle,
  content: trimmedContent,
  images: uploadedImages,
  attachments: normalizedAttachments, // ✅ Save attachments (audio files, documents, etc.)
  likes: 0,
  likedBy: [],
  commentsCount: 0,
  deletedAt: null,
});

    console.log("FILES:", req.files);
    console.log("ATTACHMENTS FINAL:", normalizedAttachments);
    console.log("TYPE:", typeof normalizedAttachments);
    console.log("IS ARRAY:", Array.isArray(normalizedAttachments));

    return res.status(201).json({
      message: "Post created",
      item: sanitizeFeedItem(feed, req.user._id),
    });
  } catch (error) {
    console.error("createFeedItem error", error);
    return res.status(500).json({ message: error.message || "Unable to create feed item" });
  }
};



export const getFeedItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid feed id" });
    }

    const item = await Feed.findOne({ _id: id })
      .populate("createdBy", "name email role companyName")
      .populate("site", "name userId");

    if (!item || !item.site) {
      return res.status(404).json({ message: "Feed item not found" });
    }

    // Check if user owns the site or their parent owns it
    const siteUserId = item.site.userId.toString();
    const hasAccess = siteUserId === req.user._id.toString() ||
      (req.user.parentId && siteUserId === req.user.parentId.toString());

    if (!hasAccess) {
      return res.status(404).json({ message: "Feed item not found" });
    }

    return res.status(200).json({ item: sanitizeFeedItem(item, req.user._id) });
  } catch (error) {
    console.error("getFeedItem error", error);
    return res.status(500).json({ message: error.message || "Unable to fetch feed item" });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid feed id" });
    }

    const feed = await Feed.findOne({ _id: id }).populate("createdBy", "name email role companyName").populate("site", "name userId");
    if (!feed || !feed.site) {
      return res.status(404).json({ message: "Feed item not found" });
    }

    // Check access to site
    const siteUserId = feed.site.userId ? String(feed.site.userId) : null;
    const hasAccess = siteUserId === String(req.user._id) || (req.user.parentId && siteUserId === String(req.user.parentId));
    if (!hasAccess && siteUserId !== String(feed.site._id)) {
      // still allow like if user belongs to the same company and site exists for them; keep previous behavior minimal
    }

    const likedBy = Array.isArray(feed.likedBy) ? feed.likedBy.map(String) : [];
    const already = likedBy.includes(String(userId));

    if (already) {
      // remove
      feed.likedBy = feed.likedBy.filter((u) => String(u) !== String(userId));
      feed.likes = Math.max(0, (feed.likes || 0) - 1);
    } else {
      feed.likedBy.push(userId);
      feed.likes = (feed.likes || 0) + 1;
    }

    await feed.save();

    return res.status(200).json({ item: sanitizeFeedItem(feed, req.user._id) });
  } catch (error) {
    console.error("toggleLike error", error);
    return res.status(500).json({ message: error.message || "Unable to toggle like" });
  }
};

export const deleteFeedItem = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("deleteFeedItem called with id:", id);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.log("Invalid id format:", id);
      return res.status(400).json({ message: "Invalid feed id" });
    }

    const item = await Feed.findOne({ _id: id }).populate("site", "userId");
    console.log("Found feed item:", item);
    if (!item || !item.site) {
      console.log("Feed item not found for id:", id);
      return res.status(404).json({ message: "Feed item not found" });
    }

    // Check if user is the creator or site owner
    const siteUserId = item.site.userId.toString();
    const isCreator = String(item.createdBy) === String(req.user._id);
    const isSiteOwner = siteUserId === req.user._id.toString() ||
      (req.user.parentId && siteUserId === req.user.parentId.toString());

    if (!isCreator && !isSiteOwner) {
      console.log("Permission denied - isCreator:", isCreator, "isSiteOwner:", isSiteOwner);
      return res.status(403).json({ message: "You do not have permission to delete this feed item" });
    }

    // Soft delete: mark as deleted instead of removing
    item.deletedAt = new Date();
    item.deletedBy = req.user._id;
    await item.save();

    console.log("Successfully soft deleted feed item:", id);

    return res.status(200).json({ message: "Feed item deleted" });
  } catch (error) {
    console.error("deleteFeedItem error", error);
    return res.status(500).json({ message: error.message || "Unable to delete feed item" });
  }
};

export default {
  listFeed,
  createFeedItem,
  getFeedItem,
  deleteFeedItem,
  toggleLike,
};

