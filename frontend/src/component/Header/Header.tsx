import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Home,
  CreditCard,
  FileText,
  TrendingUp,
  Rss,
  LogOut,
  User,
  Sparkles,
  UserPlus,
  ChevronDown,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useSite } from "../../context/SiteContext";

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);
  const siteMenuRef = useRef<HTMLDivElement | null>(null);
  const { user, logout } = useAuth();
  const { sites, activeSite, setActiveSite, openCreateSite } = useSite();
  const isAdmin = user?.role === "ADMIN";

  const navLinks = useMemo(
    () => [
      { path: "/home", icon: Home, label: "Home", adminOnly: false },
      { path: "/home/payments", icon: CreditCard, label: "Payments", adminOnly: false },
      { path: "/home/boq", icon: FileText, label: "BOQ", adminOnly: false },
      { path: "/home/expenses", icon: TrendingUp, label: "Expenses", adminOnly: false },
      { path: "/home/feed", icon: Rss, label: "Feed", adminOnly: false },
      { path: "/home/invite", icon: UserPlus, label: "Invite", adminOnly: true },
    ],
    []
  );

  const visibleNavLinks = useMemo(
    () => navLinks.filter((link) => !link.adminOnly || isAdmin),
    [isAdmin, navLinks]
  );

  // Removed unused companyLabel
  const displayName = user?.name?.trim() || user?.email?.split("@")?.[0] || "Member";
  const displayEmail = user?.email || "";
  const roleLabel = user?.role
    ? `${user.role.charAt(0)}${user.role.slice(1).toLowerCase()}`
    : "Member";
  const avatarSeed = useMemo(() => encodeURIComponent(displayEmail || displayName || "User"), [displayEmail, displayName]);

  const handleLogout = () => {
    logout();
    setIsProfileDropdownOpen(false);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Avoid direct setState in effect body to prevent cascading renders
    Promise.resolve().then(() => {
      setIsMobileMenuOpen(false);
      setIsProfileDropdownOpen(false);
      setIsSiteMenuOpen(false);
    });
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (siteMenuRef.current && !siteMenuRef.current.contains(event.target as Node)) {
        setIsSiteMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleSiteSelect = (siteId: string) => {
    setActiveSite(siteId);
    setIsSiteMenuOpen(false);
  };

  const activeSiteName = activeSite?.name ?? "Select a site";

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  };

  return (
    <header 
      className={`relative z-50 transition-all duration-500 ${
        scrolled 
          ? "bg-gradient-to-b from-blue-50 shadow-lg shadow-gray-200/50" 
          : "bg-gradient-to-b from-blue-50"
      }`}
    >
      <div className="px-4 md:px-8 py-3">
        {/* First Row - Greeting and Profile Icon */}
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Left Section - Greeting and Name */}
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#FBBF24]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {getGreeting()}
              </span>
              <span className="text-lg font-bold text-gray-800">
                {displayName}
              </span>
            </div>
          </div>

          {/* Right Section - Profile Icon */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="relative group"
            >
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                alt="User"
                className="relative h-11 w-11 rounded-full border-2 border-white shadow-lg object-cover"
              />
              <span className="absolute top-0 right-0 w-3 h-3 bg-pink-500 rounded-full border-2 border-white"></span>
            </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                        alt="User"
                        className="h-12 w-12 rounded-full"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{displayName}</p>
                        {displayEmail && <p className="text-xs text-gray-500">{displayEmail}</p>}
                        <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold bg-[#1a1a1a] text-white">
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">My Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/home/manage-sites');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">Manage Sites</span>
                    </button>
                    {isAdmin && (
                      <Link
                        to="/home/invite"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-all no-underline"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="text-sm font-medium">Team Members</span>
                      </Link>
                    )}
                    {/* <Link
                      to="/home/invite"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-all no-underline"
                    >
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">User Listing</span>
                    </Link> */}
                  </div>
                  <hr className="my-2 border-gray-100" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              )}
          </div>
        </div>

        {/* Second Row - Site Dropdown */}
        <div className="relative w-full max-w-xs mx-auto md:mx-0" ref={siteMenuRef}>
          <button
            type="button"
            onClick={() => setIsSiteMenuOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-gray-50 rounded-2xl transition-all duration-300 shadow-sm"
          >
            <div className="text-left flex-1 min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                PROJECT
              </span>
              <span className="block text-sm font-bold text-gray-800 truncate">
                {activeSiteName}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${isSiteMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isSiteMenuOpen && (
            <div className="absolute left-0 mt-2 w-full bg-white rounded-2xl shadow-2xl shadow-gray-200/60 border border-gray-100 py-2 z-40">
              <div className="px-4 pb-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Select a site</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {activeSiteName}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {sites.length ? (
                  sites.map((site) => {
                    // initials removed (was unused)
                    const isActiveSite = activeSite?.id === site.id;

                    // Calculate days left
                    let daysLeft: number | null = null;
                    if (site.expectedCompletionDate) {
                      try {
                        const now = new Date();
                        const target = new Date(site.expectedCompletionDate);
                        const diffMs = target.getTime() - now.getTime();
                        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        daysLeft = days >= 0 ? days : 0;
                      } catch {
                        // Ignore invalid date parsing
                      }
                    }

                    // Hardcoded category for now
                    const category = "Residential";

                    return (
                      <button
                        type="button"
                        key={site.id}
                        onClick={() => handleSiteSelect(site.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200 rounded-2xl border-l-4 ${
                          isActiveSite
                            ? "border-[#3b82f6] shadow-sm"
                            : "bg-white border-transparent hover:bg-gray-50 text-gray-700"
                        }`}
                        style={isActiveSite ? {
                          boxShadow: '0 4px 24px 0 rgba(59,130,246,0.10)',
                          background: 'linear-gradient(90deg, #f5f6ff 0%, #e0eaff 100%)'
                        } : {}}
                      >
                        {/* Project icon */}
                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-semibold ${
                          isActiveSite ? "bg-[#3b82f6] text-white" : "bg-gray-100 text-gray-500"
                        }`}>
                          <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8V6a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.5"/></svg>
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-base font-bold truncate ${isActiveSite ? "text-[#2563eb]" : "text-gray-900"}`}>{site.name}</p>
                          <p className={`text-xs mt-0.5 truncate ${isActiveSite ? "text-[#2563eb] opacity-80" : "text-gray-500"}`}>{category}{typeof daysLeft === "number" ? ` • ${daysLeft} days left` : ""}</p>
                        </div>
                        {/* Checkmark for active */}
                        {isActiveSite && (
                          <span className="ml-2 flex items-center justify-center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#3b82f6" strokeWidth="2" fill="#f5f6ff"/><path d="M8 12.5l3 3 5-5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">
                    No sites available yet.
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 pt-1 pb-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSiteMenuOpen(false);
                    openCreateSite();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                >
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span>Add Sites</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSiteMenuOpen(false);
                    navigate("/home/manage-sites");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                >
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span>Manage Sites</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-4">
          <nav className="flex flex-col gap-2">
            {visibleNavLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`nav-link no-underline ${
                    isActive(link.path) ? "nav-link-active" : "nav-link-inactive"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
