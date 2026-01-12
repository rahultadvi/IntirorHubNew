import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Clock,
  Calendar,
  Check,
  Package,
  CreditCard,
  ArrowDownLeft,
  ChevronDown,
  FileText,
} from "lucide-react";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { expenseApi, feedApi } from "../services/api";

interface FeedItem {
  id: string;
  user: {
    name: string;
    role: string;
    avatar: string;
  };
  type: "update" | "photo" | "document" | "milestone";
  title?: string;
  content: string;
  timestamp: string;
  siteName?: string;
  images?: string[];
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { activeSite } = useSite();
  const { token } = useAuth();
  const [recentFeeds, setRecentFeeds] = useState<FeedItem[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Budget calculations
  const totalBudget = activeSite?.contractValue ?? 0;
  const usedApproved = expenses
    .filter((e) => e.status === 'approved')
    .reduce((s, it) => s + (it.amount || 0), 0);
  const usedPaid = expenses
    .filter((e) => e.status === 'approved' && e.paymentStatus === 'paid')
    .reduce((s, it) => s + (it.amount || 0), 0);
  const usedAmount = usedApproved;
  const remainingAmount = Math.max(0, totalBudget - usedAmount);
  const dueAmount = expenses
    .filter((e) => e.paymentStatus === 'due')
    .reduce((s, it) => s + (it.amount || 0), 0);
  
  // Calculate payment progress percentage
  const paymentProgress = totalBudget > 0 ? Math.round((usedPaid / totalBudget) * 100) : 0;
  
  // Calculate expense health (budget usage percentage)
  const expenseHealthPercent = totalBudget > 0 ? Math.round((usedAmount / totalBudget) * 100) : 0;
  const expenseHealthRemaining = remainingAmount;
  
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [startDateDisplay, setStartDateDisplay] = useState<string | null>(null);
  const [targetDateDisplay, setTargetDateDisplay] = useState<string | null>(null);

  const [boqStats] = useState<{ total: number; approved: number; pending: number; totalCost?: number }>({
    total: 0,
    approved: 0,
    pending: 0,
  });

  useEffect(() => {
    const loadRecentFeeds = async () => {
      if (!token || !activeSite?.id) {
        setRecentFeeds([]);
        return;
      }

      try {
        const response = await feedApi.listFeed(activeSite.id, token);
        const feeds = response.items.slice(0, 3).map((item: any) => ({
          id: item.id,
          user: item.user,
          type: item.type,
          title: item.title || "",
          content: item.content,
          timestamp: item.timestamp,
          siteName: item.siteName,
          images: item.images || [],
        }));
        setRecentFeeds(feeds);
      } catch (err) {
        console.error("Failed to load recent feeds", err);
        setRecentFeeds([]);
      }
    };

    loadRecentFeeds();
  }, [activeSite, token]);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!token || !activeSite?.id) {
        setExpenses([]);
        return;
      }
      try {
        const res = await expenseApi.getExpensesBySite(activeSite.id, token);
        setExpenses(res.expenses || []);
      } catch (err) {
        console.error('Failed to load expenses for dashboard', err);
        setExpenses([]);
      }
    };

    fetchExpenses();
  }, [activeSite, token]);

  // Compute days remaining using site metadata saved in localStorage or activeSite fields
  useEffect(() => {
    if (!activeSite) {
      setDaysRemaining(null);
      setStartDateDisplay(null);
      setTargetDateDisplay(null);
      return;
    }

    // Try to read metadata from localStorage keyed by site name
    const metaKey = `site-meta:${activeSite.name}`;
    const raw = localStorage.getItem(metaKey);
    let startIso: string | undefined;
    let targetIso: string | undefined;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        startIso = parsed.startDate;
        targetIso = parsed.expectedCompletionDate;
      } catch {}
    }

    // Fallback: check for common fields on activeSite
    if (!startIso && (activeSite as any).startDate) startIso = (activeSite as any).startDate;
    if (!targetIso && (activeSite as any).expectedCompletionDate) targetIso = (activeSite as any).expectedCompletionDate;

    const fmt = (iso?: string | null) => {
      if (!iso) return null;
      try {
        const d = new Date(iso);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
      } catch {
        return iso;
      }
    };

    setStartDateDisplay(fmt(startIso ?? null));
    setTargetDateDisplay(fmt(targetIso ?? null));

    if (targetIso) {
      try {
        const now = new Date();
        const target = new Date(targetIso);
        const diffMs = target.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        setDaysRemaining(days >= 0 ? days : 0);
        return;
      } catch (err) {
        // ignore
      }
    }

    // fallback static
    setDaysRemaining(34);
  }, [activeSite]);

  const getRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
      }
      if (diffHours > 0) return `${diffHours}h ago`;
      if (diffMins > 0) return `${diffMins}m ago`;
      return "just now";
    } catch {
      return timestamp;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return timestamp;
    }
  };

  const getFeedImage = (feed: FeedItem) => {
    if (feed.images && feed.images.length > 0) {
      return feed.images[0];
    }
    return null;
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const siteName = activeSite?.name || "Project";
  const siteCategory =  "Residential";

  return (
    <div className="relative max-w-md mx-auto px-0 pt-6 pb-28">
      {/* Project Overview Card */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-500 rounded-3xl p-6 mb-6 shadow-xl shadow-blue-300/40 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-300/20 rounded-full blur-2xl transform -translate-x-10 translate-y-10 group-hover:scale-150 transition-transform duration-700"></div>
        </div>
        
        <div className="flex items-center justify-between mb-4 relative">
          <span className="bg-white/25 backdrop-blur-sm text-white text-[11px] font-bold px-4 py-2 rounded-full tracking-wide inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            {siteCategory}
          </span>
        </div>

        <div className="text-center mb-5 relative">
          <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-lg">{siteName}</h2>
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-white/20 backdrop-blur-md rounded-3xl px-8 py-4 text-center border border-white/20 shadow-2xl transform hover:scale-105 transition-all duration-300 relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50 block"></span>
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold text-white drop-shadow-lg">{daysRemaining ?? 34}</span>
              <span className="text-lg font-semibold text-white/80">Days</span>
            </div>
            <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Remaining</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shadow-inner">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Start</p>
                <p className="text-white font-bold">{startDateDisplay ?? '-'}</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="flex-1 h-[3px] bg-white/20 rounded-full relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" style={{ width: '66%' }}></div>
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full border-2 border-white shadow-lg shadow-emerald-400/50 animate-pulse" style={{ left: '66%' }}></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Target</p>
                <p className="text-white font-bold">{targetDateDisplay ?? '-'}</p>
              </div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shadow-inner">
                <Check className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button 
          onClick={() => navigate('/home/feed?action=add')}
          className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-100/50 flex flex-col items-center gap-2 hover:shadow-xl transition-all duration-300 group relative"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Feed</span>
        </button>
        
        <button 
          onClick={() => navigate('/home/expenses?action=add')}
          className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-100/50 flex flex-col items-center gap-2 hover:shadow-xl transition-all duration-300 group relative"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">Expenses</span>
        </button>
        
        <button 
          onClick={() => navigate('/home/boq?action=add')}
          className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-100/50 flex flex-col items-center gap-2 hover:shadow-xl transition-all duration-300 group relative"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">BOQ</span>
        </button>
      </div>

      {/* Total Value Card */}
      <div className="bg-white rounded-3xl p-6 mb-6 shadow-xl border border-slate-100/80 group flex flex-col" style={{boxShadow: '0 4px 32px 0 rgba(59,130,246,0.10)'}}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold tracking-wider text-slate-600">TOTAL VALUE</span>
          </div>
          <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
            ON TRACK
          </span>
        </div>
        <p className="flex justify-start text-4xl font-extrabold text-slate-800 mb-2">{formatCurrency(totalBudget)}</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-500 mt-2">Payment Progress</span>
          <span className="text-sm font-bold text-blue-500">{paymentProgress}%</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden relative mt-1">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${paymentProgress}%`, background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)' }}></div>
        </div>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 shadow-lg border border-slate-100/50 group">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform flex-shrink-0">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-wider text-emerald-600 leading-tight mb-0.5">RECEIVED</p>
              <p className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent leading-tight">
                {formatCurrency(usedPaid)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2.5 shadow-lg border border-slate-100/50 group">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-wider text-amber-600 leading-tight mb-0.5">DUE<br/>AMOUNT</p>
              <p className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent leading-tight">
                {formatCurrency(dueAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Health Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 mb-6 shadow-lg border border-slate-100/50">
        <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          Expense Health
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-200 to-orange-200 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <svg height="110" width="110" className="transform -rotate-90 relative">
              <circle stroke="#f1f5f9" fill="transparent" strokeWidth="14" r="48" cx="55" cy="55"></circle>
              <circle 
                stroke="url(#expenseGradient)" 
                fill="transparent" 
                strokeWidth="14" 
                strokeDasharray={`${301.59} ${301.59}`}
                strokeLinecap="round" 
                r="48" 
                cx="55" 
                cy="55"
                style={{ strokeDashoffset: 301.59 - (301.59 * expenseHealthPercent / 100), transition: 'stroke-dashoffset 1s ease-out' }}
              ></circle>
              <defs>
                <linearGradient id="expenseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b"></stop>
                  <stop offset="100%" stopColor="#f97316"></stop>
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">{expenseHealthPercent}%</span>
              <span className="text-[10px] font-semibold text-slate-400">USED</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 mb-1">TOTAL BUDGET</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 mb-1">REMAINING</p>
              <p className="text-xl font-bold text-emerald-500">{formatCurrency(expenseHealthRemaining)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BOQ Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" />
          BOQ Summary
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-100/50 text-center group">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">TOTAL</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{boqStats.total}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-100/50 text-center group">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner group-hover:scale-110 transition-transform">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">APPROVED</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{boqStats.approved}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-100/50 text-center group">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-[10px] font-bold tracking-wider text-slate-400 mb-1">PENDING</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{boqStats.pending}</p>
          </div>
        </div>
      </div>

      {/* Site Updates */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Site Updates
          </h3>
          <button 
            onClick={() => navigate('/home/feed')}
            className="text-sm font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors group"
          >
            View All <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
        <div className="space-y-3">
          {recentFeeds.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center border border-slate-100/50 shadow-lg">
              <p className="text-gray-500 text-sm mb-2">No updates found</p>
              <button
                onClick={() => navigate('/home/feed')}
                className="text-gray-800 text-sm font-medium hover:underline"
              >
                Share the first update
              </button>
            </div>
          ) : (
            recentFeeds.map((feed, index) => {
              const feedImage = getFeedImage(feed);
              const timeStr = formatTime(feed.timestamp);
              const isToday = new Date(feed.timestamp).toDateString() === new Date().toDateString();
              const displayTime = isToday ? timeStr.split(',')[1]?.trim() || timeStr : getRelativeTime(feed.timestamp);
              
              return (
                <div 
                  key={feed.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-100/50 flex items-center gap-4 cursor-pointer group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {feedImage ? (
                    <div className="relative overflow-hidden rounded-xl">
                      <img 
                        alt={feed.title || feed.content} 
                        className="w-14 h-14 rounded-xl object-cover transform group-hover:scale-110 transition-transform duration-300" 
                        src={feedImage}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center shadow-inner">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {feed.title || feed.content}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      Uploaded by {feed.user.name} ({feed.user.role})
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      {isToday ? `Today, ${displayTime}` : displayTime}
                    </p>
                  </div>
                  <ChevronDown className="w-5 h-5 text-slate-300 -rotate-90 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
