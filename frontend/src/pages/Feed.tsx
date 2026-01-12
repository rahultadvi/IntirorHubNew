type FilterKey = "all" | "updates" | "photos" | "documents" | "milestones";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  MessageSquare,
  FileText,
  Send,
  MoreHorizontal,
  // Clock,
  X,
  Plus,
  Mic,
  Heart,
  Share,
  Play,
  Pause,
  ChevronDown,
  Zap,
  Image,
  FileCode,
  Bookmark,
  AlertCircle,
  // Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSite } from "../context/SiteContext";
import { feedApi } from "../services/api";
import jsPDF from 'jspdf';
// import { generateFeedPDFFromElement } from "../utils/feedPdfGenerator";
import html2canvas from "html2canvas";
interface FeedItem {
  id: string;
  user: {
    name: string;
    role: string;
    avatar: string;
  };
  type: "update" | "photo" | "document" | "milestone";
  feedType?: "progress" | "design" | "material" | "issue";
  title?: string;
  content: string;
  images?: string[];
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size?: number;
  }>;
  timestamp: string;
  likes: number;
  comments: number;
  siteName?: string;
}

const initialFeedItems: FeedItem[] = [];
const MAX_UPLOADS = 4;

const readFileAsDataUrl = (
  file: File
): Promise<{ src: string; name: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ src: reader.result as string, name: file.name });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const generateId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const Feed: React.FC = () => {
  const { user, token } = useAuth();
  const { activeSite } = useSite();
  const location = useLocation();
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPost, setNewPost] = useState("");
  const [selectedImages, setSelectedImages] = useState<
    Array<{ id: string; src: string; name: string }>
  >([]);
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ id: string; file: File }>
  >([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(initialFeedItems);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const activeSiteId = activeSite?.id ?? null;

  // Check for action=add query parameter to open form
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'add') {
      setShowAddForm(true);
    }
  }, [location.search]);

  // Load feed data when component mounts or active site changes
  useEffect(() => {
    const loadFeed = async () => {
      if (!activeSiteId || !token) {
        setFeedItems([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await feedApi.listFeed(activeSiteId, token);
        setFeedItems(response.items || []);
      } catch (err) {
        console.error("Failed to load feed:", err);
        setError("Failed to load feed. Please try again.");
        setFeedItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, [activeSiteId, token]);
const hasContent =
  newTitle.trim().length > 0 ||
  newPost.trim().length > 0 ||
  imageFiles.length > 0 ||
  selectedFiles.length > 0;

const isPostDisabled = !hasContent || isSubmitting;


  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return feedItems;

    const filterMap: Record<string, string> = {
      updates: "progress",
      photos: "design",
      documents: "material",
    };

    const targetFeedType = filterMap[activeFilter];
    if (!targetFeedType) return feedItems;

    return feedItems.filter((item) => (item.feedType || "progress") === targetFeedType);
  }, [activeFilter, feedItems]);


  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const availableSlots = MAX_UPLOADS - selectedImages.length;
    if (availableSlots <= 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const chosenFiles = Array.from(files).slice(0, availableSlots);

    // ✅ REAL FILES (multer ke liye)
    setImageFiles((prev) => [...prev, ...chosenFiles]);

    // ✅ PREVIEW (UI ke liye)
    try {
      const payloads = await Promise.all(
        chosenFiles.map((file) => readFileAsDataUrl(file))
      );

      setSelectedImages((prev) => [
        ...prev,
        ...payloads.map((payload) => ({
          id: generateId(),
          ...payload,
        })),
      ]);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  const handleDeleteFeed = async (itemId: string) => {
    if (!token) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this feed?");
    if (!confirmDelete) return;

    try {
      await feedApi.deleteFeed(itemId, token); // backend API
      setFeedItems((prev) => prev.filter((item) => item.id !== itemId));
      setOpenMenuFor(null);
    } catch (err) {
      console.error("Delete feed failed:", err);
      alert("Failed to delete feed");
    }
  };

  const handleRemoveImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((image) => image.id !== id));
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const chosenFiles = Array.from(files);
    setSelectedFiles((prev) => [
      ...prev,
      ...chosenFiles.map((file) => ({ id: generateId(), file })),
    ]);

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // const fileToBase64 = (file: File): Promise<string> => {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.onload = () => resolve(reader.result as string);
  //     reader.onerror = reject;
  //     reader.readAsDataURL(file);
  //   });
  // };

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  // Comments state: simple local comments store per feed item
  const [openCommentFor, setOpenCommentFor] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, Array<{ id: string; user: string; text: string; timestamp: string }>>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        
        // Add audio file to selectedFiles for submission
        setSelectedFiles((prev) => [...prev, { id: generateId(), file }]);
        
        // Stop all audio tracks
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) { }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error("startRecording error", err);
      try {
        alert("Microphone access denied or not available");
      } catch (_) { }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const [imageModal, setImageModal] = useState<{ open: boolean; src?: string; desc?: string }>({ open: false });
  
  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const handleSubmitPost = async () => {
    if (!activeSiteId || !token) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("siteId", activeSiteId);
      formData.append("title", newTitle);
      formData.append("content", newPost);
      formData.append("feedType", feedType);

      // ✅ images → multer
      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      // ✅ attachments → multer
      selectedFiles.forEach(({ file }) => {
        formData.append("attachments", file);
      });

      const response = await feedApi.createFeedFormData(formData, token);

      // Ensure feedType is properly set
      const newItem: FeedItem = {
        ...response.item,
        feedType: response.item.feedType || feedType || "progress",
      };

      setFeedItems((prev) => [newItem, ...prev]);

      // ✅ reset UI
      setNewTitle("");
      setNewPost("");
      setSelectedImages([]);
      setImageFiles([]);
      setSelectedFiles([]);
      setActiveFilter("all");
      setShowAddForm(false);

      if (fileInputRef.current) fileInputRef.current.value = "";
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";

    } catch (err) {
      console.error("create feed failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };


  const addComment = (itemId: string) => {
    const text = (commentInputs[itemId] || "").trim();
    if (!text) return;
    const newComment = { id: generateId(), user: user?.name || user?.email || "You", text, timestamp: new Date().toLocaleString() };
    setCommentsMap((prev) => ({ ...(prev || {}), [itemId]: [...(prev[itemId] || []), newComment] }));
    setCommentInputs((prev) => ({ ...prev, [itemId]: "" }));
    // update comments count in feedItems locally
    setFeedItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, comments: (it.comments || 0) + 1 } : it)));
  };



  const toggleLike = async (id: string) => {
    if (!token) return;
    try {
      const resp = await feedApi.toggleLike(id, token);
      const updated = resp.item;
      // update list with server value
      setFeedItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, likes: updated.likes } : it)));
      setLikedMap((prev) => ({ ...prev, [id]: Boolean(updated.liked) }));
    } catch (err) {
      console.error("toggleLike error", err);
    }
  };

  const generateFeedPDFFromElement = async (item: FeedItem) => {
    const element = document.getElementById(`feed-${item.id}`);
    if (!element) throw new Error("Feed element not found");

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    return pdf;
  };


  const handleShareFeed = async (item: FeedItem) => {
    try {
      const pdf = await generateFeedPDFFromElement(item);
      const blob = pdf.output("blob");

      const projectName = activeSite?.name || "Project";
      const filename = `${projectName}_Feed_${item.id}_${new Date()
        .toISOString()
        .split("T")[0]}.pdf`;

      const file = new File([blob], filename, {
        type: "application/pdf",
      });

      // ✅ Web Share API (Mobile)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Site Feed Update",
          text: item.content,
          files: [file],
        });
        return;
      }

      // 🖥️ Desktop fallback → download
      pdf.save(filename);
    } catch (err) {
      console.error("Feed PDF Share failed:", err);
    }
  };



  const formatTimeAgo = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays > 0) return `${diffDays}D AGO`;
      if (diffHours > 0) return `${diffHours}H AGO`;
      if (diffMins > 0) return `${diffMins}M AGO`;
      return "JUST NOW";
    } catch {
      return timestamp;
    }
  };

  const extractHashtags = (text: string) => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches || [];
  };

  // const extractLocation = (text: string) => {
  //   // Try to extract location from content (e.g., "Master Bedroom", "Kitchen", "Living Room")
  //   const locations = ["Master Bedroom", "Bedroom", "Kitchen", "Living Room", "Bathroom", "Hall"];
  //   for (const loc of locations) {
  //     if (text.toLowerCase().includes(loc.toLowerCase())) {
  //       return loc;
  //     }
  //   }
  //   return null;
  // };


  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});
  const feedTypeOptions = [
    { value: "progress", label: "Progress" },
    { value: "design", label: "Design" },
    { value: "material", label: "Material Selection" },
    { value: "issue", label: "Issue" },
  ];

  const [feedType, setFeedType] = useState("progress");
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const projectName = activeSite?.name || "Project";

  const filterButtons = [
    {
      key: "all",
      label: "All",
      icon: Zap,
    },
    {
      key: "updates",
      label: `Progress`,
      icon: Zap,
    },
    {
      key: "photos",
      label: `Design`,
      icon: Image,
    },
    {
      key: "documents",
      label: `Material Selection`,
      icon: FileCode,
    },
    {
      key: "issue",
      label: `Issue`,
      icon: AlertCircle,
    },
  ];
  // const projectName1 = activeSite?.name || "Project";

  const feedTypeLabelMap: Record<
    "progress" | "design" | "material" | "issue",
    string
  > = {
    progress: "Progress",
    design: "Design",
    material: "Material Selection",
    issue: "Issue",
  };




  return (

    <div className="pb-20">
      {/* Centered Container */}
      <div className="max-w-2xl mx-auto px-4">
      {/* Header */}

      {/* Feed Filters */}
      <div className="mb-5 flex gap-2.5 mt-4 overflow-x-auto pb-2 scrollbar-hide">
        {filterButtons.map((f) => {
          const FilterIcon = f.icon;
          const filterMap: Record<string, string> = {
            updates: "progress",
            photos: "design",
            documents: "material",
          };
          const filterCount = f.key === "all"
            ? feedItems.length
            : feedItems.filter((item) => {
              const targetType = filterMap[f.key];
              if (!targetType) return false;
              return (item.feedType || "progress") === targetType;
            }).length;


          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key as FilterKey)}
              className={`
          flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 relative group
          ${activeFilter === f.key
                  ? "bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg shadow-slate-800/30 scale-105"
                  : "bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
                }
        `}
              title={f.label}
            >
              <FilterIcon className={`w-4 h-4 transition-transform duration-200 ${activeFilter === f.key ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span>{f.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-max ml-1 px-2 py-0.5 text-xs font-bold rounded-full transition-all duration-200 ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}
              >
                {filterCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Site Feed</h2>
          <p className="text-slate-500 text-sm">Live updates from the field</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
            <p className="text-sm text-gray-500">Loading feed...</p>
          </div>
        )}
        {!loading && filteredItems.length === 0 && !error && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-gray-500">No posts yet for this site. Share the first update!</p>
          </div>
        )}
        {!loading && filteredItems.map((item) => {
          const hashtags = extractHashtags(item.content);
          // const location = extractLocation(item.content) || item.siteName;
          const imageIndex = currentImageIndex[item.id] || 0;

          return (
            <div id={`feed-${item.id}`}
              key={item.id}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              {/* User Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      alt={item.user.name}
                      className="w-12 h-12 rounded-full object-cover"
                      src={item.user.avatar}
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{item.user.name}</h4>
                    <p className="text-sm text-slate-500">{item.user.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">{formatTimeAgo(item.timestamp)}</span>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuFor(openMenuFor === item.id ? null : item.id);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>


                    {openMenuFor === item.id && (
                      <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-20">
                        <button
                          onClick={() => handleDeleteFeed(item.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <X className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Image Post */}
              {item.images && item.images.length > 0 && (
                <div className="relative mb-4 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[200px]">
                  <img
                    alt="Post"
                    className="w-full max-h-[500px] object-contain"
                    src={item.images[imageIndex]}
                  />
                  {item.images.length > 1 && (
                    <>
                      <button
                        onClick={() => {
                          const newIndex = imageIndex > 0 ? imageIndex - 1 : item.images!.length - 1;
                          setCurrentImageIndex({ ...currentImageIndex, [item.id]: newIndex });
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors z-10"
                      >
                        <ChevronDown className="w-5 h-5 text-slate-600 rotate-90" />
                      </button>
                      <div className="absolute top-4 right-4 bg-slate-800/70 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                        {imageIndex + 1}/{item.images.length}
                      </div>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {item.images.map((_, idx) => (
                          <span
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === imageIndex ? "bg-white" : "bg-white/50"
                              }`}
                          ></span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 🔊 CUSTOM VOICE NOTE PLAYER */}
              {item.attachments &&
                item.attachments.some((f) => f.type?.startsWith("audio")) && (
                  <div className="mt-3 space-y-2">
                    {item.attachments.map((file, idx) => {
                      if (!file.type?.startsWith("audio")) return null;
                      
                      const audioId = `${item.id}-${idx}`;
                      const isPlaying = playingAudioId === audioId;
                      

                      const handlePlayPause = () => {
                        const audio = audioRefs.current[audioId];
                        if (!audio) return;

                        if (isPlaying) {
                          audio.pause();
                          setPlayingAudioId(null);
                        } else {
                          // Pause any other playing audio
                          Object.values(audioRefs.current).forEach(a => a.pause());
                          audio.play();
                          setPlayingAudioId(audioId);
                        }
                      };

                      return (
                        <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 flex items-center gap-4">
                          {/* Hidden audio element */}
                          <audio
                            ref={(el) => {
                              if (el) audioRefs.current[audioId] = el;
                            }}
                            onEnded={() => setPlayingAudioId(null)}
                            onPause={() => {
                              if (playingAudioId === audioId) setPlayingAudioId(null);
                            }}
                            className="hidden"
                          >
                            <source src={file.url} type={file.type} />
                          </audio>
                          
                          {/* Play/Pause Button */}
                          <button
                            onClick={handlePlayPause}
                            className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
                          >
                            {isPlaying ? (
                              <Pause className="w-6 h-6 text-white" />
                            ) : (
                              <Play className="w-6 h-6 text-white ml-1" />
                            )}
                          </button>
                          
                          {/* Waveform and Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-2">
                              {[...Array(13)].map((_, i) => {
                                const height = isPlaying 
                                  ? `${Math.random() * 20 + 10}px` 
                                  : `${Math.random() * 8 + 4}px`;
                                return (
                                  <div
                                    key={i}
                                    className="w-1 bg-blue-400 rounded-full transition-all duration-150"
                                    style={{ height }}
                                  ></div>
                                );
                              })}
                            </div>
                            <p className="text-sm font-medium text-blue-600">VOICE NOTE</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(item.id)}
                    className={`flex items-center gap-1 transition-colors ${likedMap[item.id] ? "text-rose-500" : "text-slate-500 hover:text-rose-500"
                      }`}
                  >
                    <Heart className={`w-6 h-6 ${likedMap[item.id] ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={() => setOpenCommentFor((s) => ({ ...s, [item.id]: !s[item.id] }))}
                    className="flex items-center gap-1 text-slate-500 hover:text-blue-500 transition-colors"
                  >
                    <MessageSquare className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleShareFeed(item)}
                    className="flex items-center gap-1 text-slate-500 hover:text-emerald-500 transition-colors"
                  >
                    <Share className="w-6 h-6" />
                  </button>

                </div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                </div>
              </div>

              {/* Like Count */}
              <p className="font-semibold text-slate-800 mb-2">{item.likes || 0} likes</p>

              {/* Content */}
              <p className="text-slate-700 mb-3">
                <span className="font-semibold">{item.user.name}</span> {item.content}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Bookmark className="w-3 h-3" />
                  {item.siteName || projectName}
                </span>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold
    ${item.feedType === "issue" ? "bg-red-50 text-red-700" :
                      item.feedType === "material" ? "bg-yellow-50 text-yellow-700" :
                        item.feedType === "design" ? "bg-purple-50 text-purple-700" :
                          "bg-emerald-50 text-emerald-700"}
  `}
                >
                  {feedTypeLabelMap[item.feedType ?? "progress"]}
                </span>

                {hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>


              {/* View Comments */}
              {item.comments > 0 && (
                <button
                  onClick={() => setOpenCommentFor((s) => ({ ...s, [item.id]: !s[item.id] }))}
                  className="text-sm text-slate-400 font-medium hover:text-slate-600 transition-colors"
                >
                  View all {item.comments} comment{item.comments !== 1 ? 's' : ''}
                </button>
              )}

              {/* Comments Section */}
              {openCommentFor[item.id] && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="space-y-2">
                    {(commentsMap[item.id] || []).map((c) => (
                      <div key={c.id} className="rounded-lg bg-slate-50 p-2">
                        <div className="text-xs text-slate-600">{c.user} • {c.timestamp}</div>
                        <div className="text-sm text-slate-800">{c.text}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      value={commentInputs[item.id] || ""}
                      onChange={(e) => setCommentInputs((p) => ({ ...p, [item.id]: e.target.value }))}
                      placeholder="Write a comment..."
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                    />
                    <button onClick={() => addComment(item.id)} className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-white">Comment</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
      {/* End Centered Container */}

      {/* Floating Add Button */}
<button
  onClick={() => setShowAddForm(true)}
  title="Add Feed"
  className="
    fixed bottom-24 right-6
    w-14 h-14
    bg-slate-900 text-white
    rounded-full
    shadow-xl
    flex items-center justify-center
    hover:bg-slate-700
    transition-all
    hover:scale-110
    z-[9999]
  "
>
  <Plus className="w-6 h-6" />
</button>



      {/* Add Feed Modal */}
      <div
        className={`
          fixed inset-0 z-50 flex items-center justify-center px-4
          bg-black/50 backdrop-blur-sm
          transition-all duration-300
          ${showAddForm ? "opacity-100 visible" : "opacity-0 invisible"}
        `}
      >
        <div
          className={`
            w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl
            transform transition-all duration-300
            ${showAddForm ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
          `}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Add Feed</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-full p-1 hover:bg-gray-100 transition"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-start gap-3">


            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Add a title (optional)"
                className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              />

              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share an update..."
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              />
              {/* Feed Type Selector */}
              {/* Feed Type Dropdown */}
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setIsTypeOpen(!isTypeOpen)}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  <span>
                    {
                      feedTypeOptions.find((o) => o.value === feedType)?.label
                    }
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isTypeOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {isTypeOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                    {feedTypeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setFeedType(opt.value);
                          setIsTypeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100
            ${feedType === opt.value
                            ? "bg-slate-100 font-semibold"
                            : ""
                          }
          `}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Images Preview */}
              {selectedImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {selectedImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative h-20 w-20 overflow-hidden rounded-lg border"
                    >
                      <img
                        src={image.src}
                        alt={image.name}
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedFiles.map(({ id, file }) => (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2"
                    >
                      {file.type && file.type.startsWith("audio") ? (
                        <audio controls className="h-8 w-40">
                          <source src={URL.createObjectURL(file)} type={file.type} />
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="max-w-[120px] truncate text-xs text-gray-700">
                            {file.name}
                          </span>
                        </>
                      )}
                      <button
                        onClick={() => handleRemoveFile(id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-dashed px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-400"
                  >
                    Photos
                  </button>

                  <button
                    onClick={() => attachmentInputRef.current?.click()}
                    className="rounded-lg border border-dashed px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-400"
                  >
                    Files
                  </button>

                  <button
                    onClick={() => (isRecording ? stopRecording() : startRecording())}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-400 ${isRecording ? "bg-red-50 border-red-200 text-red-600" : ""}`}
                  >
                    <Mic className="h-4 w-4" />
                    <span>{isRecording ? "Stop" : "Record"}</span>
                  </button>
                </div>

                <button
                  onClick={handleSubmitPost}
                  disabled={isPostDisabled}
                  className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-black/90 disabled:bg-black/40"
                >
                  <Send className="h-4 w-4" />
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image modal */}
      {imageModal.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-3xl w-full bg-white rounded-lg overflow-hidden">
            <div className="flex justify-end p-2">
              <button onClick={() => setImageModal({ open: false })} className="p-2">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4">
              <img src={imageModal.src} alt="attachment" className="w-full object-contain" />
              {imageModal.desc && (
                <p className="mt-3 text-sm text-gray-700">{imageModal.desc}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Feed;
