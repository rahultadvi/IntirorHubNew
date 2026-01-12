import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  Image,
  FileText,
  Heart,
  Clock,
  MapPin,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { feedApi } from "../services/api";

interface FeedItem {
  id: string;
  user: {
    name: string;
    role: string;
    avatar: string;
  };
  type: "update" | "photo" | "document" | "milestone";
  content: string;
  images?: string[];
  timestamp: string;
  likes: number;
  comments: number;
  siteName?: string;
}

const FeedDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [feedItem, setFeedItem] = useState<FeedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeedItem = async () => {
      if (!id || !token) {
        setError("Invalid request");
        setLoading(false);
        return;
      }

      try {
        const response = await feedApi.getFeedItem(id, token);
        const item: FeedItem = {
          id: response.item.id,
          user: response.item.user,
          type: response.item.type,
          content: response.item.content,
          images: response.item.images,
          timestamp: response.item.timestamp,
          likes: response.item.likes,
          comments: response.item.comments,
          siteName: response.item.siteName,
        };
        setFeedItem(item);
      } catch (err) {
        console.error("getFeedItem error", err);
        setError("Unable to load feed item");
      } finally {
        setLoading(false);
      }
    };

    loadFeedItem();
  }, [id, token]);

  const getTypeIcon = (type: FeedItem["type"]) => {
    switch (type) {
      case "photo":
        return <Image className="h-4 w-4 text-green-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "milestone":
        return <span className="text-yellow-500">🏆</span>;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 pb-10 pt-24 md:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !feedItem) {
    return (
      <div className="min-h-screen bg-white px-4 pb-10 pt-24 md:px-6">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-700">
            {error || "Feed item not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 pb-10 pt-24 md:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Feed</span>
        </button>

        {/* Feed Item Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm md:p-10">
          {/* User Info */}
          <div className="flex items-start gap-4">
            <img
              src={feedItem.user.avatar}
              alt={feedItem.user.name}
              className="h-14 w-14 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">{feedItem.user.name}</span>
                {getTypeIcon(feedItem.type)}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <span>{feedItem.user.role}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {feedItem.timestamp}
                </span>
              </div>
              {feedItem.siteName && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  <MapPin className="h-3.5 w-3.5" />
                  {feedItem.siteName}
                </div>
              )}
            </div>
          </div>

          {/* Images */}
          {feedItem.images && feedItem.images.length > 0 && (
            <div className="mt-6 space-y-4">
              {feedItem.images.map((image, index) => (
                <img
                  key={`${feedItem.id}-${index}`}
                  src={image}
                  alt={`Post image ${index + 1}`}
                  className="w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          {/* Full Content */}
          <div className="mt-6">
            <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-gray-800">
              {feedItem.content}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-6 border-t border-gray-100 pt-6">
            <button className="flex items-center gap-2 text-rose-500 transition hover:text-rose-600">
              <Heart className="h-5 w-5 fill-current" />
              <span className="text-sm font-medium">{feedItem.likes} Likes</span>
            </button>
            <button className="flex items-center gap-2 text-gray-500 transition hover:text-black">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-medium">{feedItem.comments} Comments</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedDetail;
