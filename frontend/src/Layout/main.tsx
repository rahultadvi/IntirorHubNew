import { useEffect, useRef, useState } from "react";
const adminPhone = import.meta.env.VITE_ADMIN_PHONE || "8320354644";
import Header from "../component/Header/Header";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, CreditCard, FileText, TrendingUp, Rss, Plus, UserPlus, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MainLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, refresh } = useAuth();

    const navLinks = [
        { path: "/", icon: Home, label: "Home" },
        { path: "/home/payments", icon: CreditCard, label: "Pay" },
        { path: "/home/boq", icon: FileText, label: "BOQ" },
        { path: "/home/expenses", icon: TrendingUp, label: "Expenses" },
        { path: "/home/feed", icon: Rss, label: "Feed" },
        { path: "/home/profile", icon: User, label: "Profile" },
    ];

    const isActive = (path: string) => {
        if (path === "/") return location.pathname === "/" || location.pathname === "/home";
        return location.pathname.startsWith(path);
    };

    const isHomePage = location.pathname === '/' || location.pathname === '/home';
    const isBOQ = location.pathname === '/home/boq' || location.pathname === '/boq';

    const isAdmin = (user?.role ?? '').toString().toUpperCase() === 'ADMIN';
    const isClient = (user?.role ?? '').toString().toUpperCase() === 'CLIENT';
    // Show payment-due modal for any user (including admins) when companyPaymentDue is set
    const paymentDueActive = Boolean(user && (user as any).companyPaymentDue);
    const [showPaymentModal, setShowPaymentModal] = useState<boolean>(paymentDueActive);

    // Refresh user profile when the user interacts with the page (click/focus)
    // so admin-triggered payment-due changes show up promptly.
    const lastCheckRef = useRef<number>(0);
    useEffect(() => {
        if (!user) return;

        const handler = async () => {
            const now = Date.now();
            if (now - lastCheckRef.current < 5000) return;
            lastCheckRef.current = now;
            try {
                await refresh();
            } catch (e) {
                // ignore
            }
            // after refresh, read persisted user to determine updated due status
            try {
                const stored = localStorage.getItem('authUser');
                if (stored) {
                    const parsed = JSON.parse(stored) as any;
                    if (parsed && parsed.companyPaymentDue) {
                        setShowPaymentModal(true);
                        return;
                    }
                }
            } catch (e) {
                // ignore parse errors
            }
        };

        document.addEventListener('click', handler);
        window.addEventListener('focus', handler);
        return () => {
            document.removeEventListener('click', handler);
            window.removeEventListener('focus', handler);
        };
    }, [user, isAdmin, refresh]);

    // keep showPaymentModal in sync when paymentDueActive flips
    useEffect(() => {
        if (paymentDueActive) setShowPaymentModal(true);
        else setShowPaymentModal(false);
    }, [paymentDueActive]);

    const showToast = (message: string) => {
        try {
            const containerId = 'site-zero-toast-container';
            let container = document.getElementById(containerId);
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                container.style.position = 'fixed';
                container.style.right = '16px';
                container.style.bottom = '80px';
                container.style.zIndex = '9999';
                document.body.appendChild(container);
            }
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.background = '#111827';
            toast.style.color = 'white';
            toast.style.padding = '8px 12px';
            toast.style.borderRadius = '8px';
            toast.style.marginTop = '8px';
            toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
            container.appendChild(toast);
            requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { try { container?.removeChild(toast); } catch (e) { } }, 200); }, 3000);
        } catch (e) {
            try { alert(message); } catch (_) { }
        }
    };

    const isManageSites =
        location.pathname.includes("manage-sites") ||
        location.pathname.includes("/sites");

    return (
        <>
            <Header />
            <div className="pb-32 lg:pb-24">
                <div className={showPaymentModal ? 'pointer-events-none select-none filter blur-sm' : ''}>
                    <div className="max-w-7xl mx-auto  md:px-6 lg:px-8">
                        <Outlet />
                    </div>
                </div>
                {/* Global payment-due modal for logged-in users */}
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Payment Required</h3>
                            <p className="text-sm text-slate-600 mb-4">Your payment is due. Please contact the administrator.</p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => {
                                        window.open(`https://wa.me/91${adminPhone}`);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded"
                                >
                                    Contact Admin
                                </button>
                                <button onClick={() => { try { const nav = window.location; window.location.href = nav.origin; } catch (e) { } }} className="px-4 py-2 bg-gray-100 rounded">Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {user && !isHomePage && !isBOQ && !isClient && !isManageSites && (
                <button
                    onClick={() => {
                        const p = location.pathname;
                        if (p.startsWith('/home/payments')) {
                            if (isAdmin) navigate('/home/payments?openAdd=1');
                            else showToast('Only admins can add payments');
                        } else if (p.startsWith('/home/expenses')) {
                            navigate('/home/expenses?openAdd=1');
                            // ensure modal opens even if URL doesn't change
                            setTimeout(() => window.dispatchEvent(new Event('open-add-expense')), 150);
                        } else if (p.startsWith('/home/feed')) {
                            navigate('/home/feed?openAdd=1');
                            setTimeout(() => window.dispatchEvent(new Event('open-add-feed')), 150);
                        } else if (p.startsWith('/home/invite')) {
                            navigate('/home/invite?openAdd=1');
                            setTimeout(() => window.dispatchEvent(new Event('open-add-invite')), 150);
                        }
                    }}
                    title="Add"
                    className={"fixed bottom-24 right-5 z-50 p-4 bg-gray-800 hover:bg-border border-white text-white rounded-full shadow-xl transition active:scale-95"}
                >
                    <Plus className="h-6 w-6" />
                </button>
            )}

            {/* Desktop Footer Navigation */}
            <nav className="hidden lg:flex fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
                <div className="w-full px-4 md:px-8 py-4">
                    <div className="flex items-center justify-center gap-2">
                        <Link
                            to="/"
                            className={`nav-link no-underline ${isActive("/") ? "nav-link-active" : "nav-link-inactive"
                                }`}
                        >
                            <Home className="h-4 w-4" />
                            <span>Home</span>
                        </Link>
                        <Link
                            to="/home/payments"
                            className={`nav-link no-underline ${isActive("/home/payments") ? "nav-link-active" : "nav-link-inactive"
                                }`}
                        >
                            <CreditCard className="h-4 w-4" />
                            <span>Payments</span>
                        </Link>
                        <Link
                            to="/home/boq"
                            className={`nav-link no-underline ${isActive("/home/boq") ? "nav-link-active" : "nav-link-inactive"
                                }`}
                        >
                            <FileText className="h-4 w-4" />
                            <span>BOQ</span>
                        </Link>
                        <Link
                            to="/home/expenses"
                            className={`nav-link no-underline ${isActive("/home/expenses") ? "nav-link-active" : "nav-link-inactive"
                                }`}
                        >
                            <TrendingUp className="h-4 w-4" />
                            <span>Expenses</span>
                        </Link>
                        <Link
                            to="/home/feed"
                            className={`nav-link no-underline ${isActive("/home/feed") ? "nav-link-active" : "nav-link-inactive"
                                }`}
                        >
                            <Rss className="h-4 w-4" />
                            <span>Feed</span>
                        </Link>
                        {isAdmin && (
                            <Link
                                to="/home/invite"
                                className={`nav-link no-underline ${isActive("/home/invite") ? "nav-link-active" : "nav-link-inactive"
                                    }`}
                            >
                                <UserPlus className="h-4 w-4" />
                                <span>Invite</span>
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50">
                <div className="flex items-center justify-around max-w-md mx-auto px-4 py-3">
                    {navLinks.filter((link) => link.path !== "/home/profile").map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.path);
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all no-underline relative ${active
                                    ? "text-white"
                                    : "text-gray-400"
                                    }`}
                            >
                                {active ? (
                                    <>
                                        <div className="rounded-xl px-4 py-2.5 flex flex-row items-center gap-2" style={{ backgroundColor: '#334155' }}>
                                            <Icon className="h-5 w-5 text-white" />
                                            <span className="text-sm font-bold text-white whitespace-nowrap">{link.label}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Icon className="h-6 w-6 text-gray-400" />
                                        <span className="text-[9px] font-medium text-gray-400 mt-0.5">{link.label}</span>
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </div>
                {/* Thin Banner Bar */}
                {/* <div className="bg-gray-900 text-white text-center py-1">
                    <span className="text-xs font-medium">SITEZERO Management</span>
                </div> */}
            </nav>
        </>
    );
};

export default MainLayout;