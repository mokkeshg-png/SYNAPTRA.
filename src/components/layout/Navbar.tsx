import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { login } from "@/lib/store";
import { DEMO_CREDENTIALS } from "@/lib/seed";
import {
  Bell,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Shield,
  Briefcase,
  Users,
  Compass,
  LayoutDashboard,
  CheckCheck,
  ChevronDown,
} from "lucide-react";

export function Navbar() {
  const { user, profile, logout, refresh } = useAuth();
  const { items, unread, markRead, markAll } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleSwitchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRoleSwitch = async (email: string) => {
    try {
      await login(email, DEMO_CREDENTIALS.password);
      refresh();
      setRoleSwitchOpen(false);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, authRequired: true },
    { name: "Explore Projects", href: "/projects", icon: Compass, authRequired: false },
    { name: "Find Collaborators", href: "/collaborators", icon: Users, authRequired: false },
    ...(profile?.role === "admin"
      ? [{ name: "Admin Center", href: "/admin", icon: Shield, authRequired: true }]
      : []),
  ];

  const currentRoleLabel = () => {
    if (!user) return "Guest";
    if (profile?.role === "admin") return "Admin";
    if (profile?.role === "faculty") return "Faculty";
    return "Student";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-white shadow-md font-serif font-bold text-xl tracking-wider">
              S
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-ink">
                SYNAPTRA
              </span>
              <span className="hidden text-[10px] uppercase tracking-widest text-brass block font-semibold sm:block">
                Research Collaboration
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.authRequired && !user) return null;
              const isActive = location.pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-navy-50 text-navy font-semibold"
                      : "text-ink-600 hover:bg-paper-100 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher (Academic pair testing) */}
          <div className="relative" ref={roleRef}>
            <button
              onClick={() => setRoleSwitchOpen(!roleSwitchOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border border-brass-200 bg-brass-50/80 px-2.5 py-1 text-xs font-medium text-brass-700 hover:bg-brass-100 transition-colors"
              title="Switch demo persona"
            >
              <span className="h-2 w-2 rounded-full bg-brass animate-pulse" />
              Role: <strong className="text-brass-900">{currentRoleLabel()}</strong>
              <ChevronDown className="h-3 w-3 text-brass-600" />
            </button>

            {roleSwitchOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-ink-100 bg-white p-2 shadow-lift z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-400 border-b border-ink-50">
                  Switch Active Persona
                </div>
                <div className="py-1 space-y-1">
                  <button
                    onClick={() => handleRoleSwitch(DEMO_CREDENTIALS.student)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                      user?.email === DEMO_CREDENTIALS.student ? "bg-navy-50 font-bold text-navy" : "hover:bg-paper-100 text-ink-700"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-ink">Rahul Mehta</div>
                      <div className="text-[11px] text-ink-400">Student (AI/ML Researcher)</div>
                    </div>
                    {user?.email === DEMO_CREDENTIALS.student && <span className="text-navy text-xs">Active</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch(DEMO_CREDENTIALS.owner)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                      user?.email === DEMO_CREDENTIALS.owner ? "bg-navy-50 font-bold text-navy" : "hover:bg-paper-100 text-ink-700"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-ink">Arjun Nair</div>
                      <div className="text-[11px] text-ink-400">Project Owner (Plant Disease)</div>
                    </div>
                    {user?.email === DEMO_CREDENTIALS.owner && <span className="text-navy text-xs">Active</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch(DEMO_CREDENTIALS.faculty)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                      user?.email === DEMO_CREDENTIALS.faculty ? "bg-navy-50 font-bold text-navy" : "hover:bg-paper-100 text-ink-700"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-ink">Dr. Priya Sharma</div>
                      <div className="text-[11px] text-ink-400">Faculty & Research Mentor</div>
                    </div>
                    {user?.email === DEMO_CREDENTIALS.faculty && <span className="text-navy text-xs">Active</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch(DEMO_CREDENTIALS.admin)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                      user?.email === DEMO_CREDENTIALS.admin ? "bg-navy-50 font-bold text-navy" : "hover:bg-paper-100 text-ink-700"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-ink">Admin Desk</div>
                      <div className="text-[11px] text-ink-400">Platform Administrator</div>
                    </div>
                    {user?.email === DEMO_CREDENTIALS.admin && <span className="text-navy text-xs">Active</span>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {user ? (
            <>
              {/* Notification Popover */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative rounded-full p-2 text-ink-500 hover:bg-paper-100 hover:text-ink transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-ink-100 bg-white p-3 shadow-lift z-50 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-ink-100">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-semibold text-ink">Notifications</span>
                        <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700">
                          {unread} new
                        </span>
                      </div>
                      {unread > 0 && (
                        <button
                          onClick={markAll}
                          className="flex items-center gap-1 text-xs text-navy hover:underline"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-ink-50">
                      {items.length === 0 ? (
                        <div className="py-8 text-center text-xs text-ink-400">
                          No notifications yet
                        </div>
                      ) : (
                        items.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 transition-colors rounded-lg cursor-pointer ${
                              !n.read ? "bg-navy-50/50" : "hover:bg-paper-50"
                            }`}
                            onClick={() => {
                              markRead(n.id);
                              setNotifOpen(false);
                              navigate(n.link);
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-ink">{n.title}</p>
                              {!n.read && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-navy mt-1" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-ink-500 line-clamp-2">{n.message}</p>
                            <span className="mt-1 block text-[10px] text-ink-400">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Menu */}
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full p-1 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white font-medium text-xs">
                    {profile?.fullName ? profile.fullName.charAt(0) : "U"}
                  </div>
                  <span className="hidden lg:block text-xs font-medium text-ink-700 max-w-[120px] truncate">
                    {profile?.fullName || user.email}
                  </span>
                  <ChevronDown className="hidden lg:block h-3.5 w-3.5 text-ink-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-ink-100 bg-white py-1 shadow-lift z-50">
                    <div className="border-b border-ink-100 px-4 py-2.5">
                      <p className="text-sm font-semibold text-ink truncate">{profile?.fullName}</p>
                      <p className="text-xs text-ink-400 truncate">{user.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-600">
                        {profile?.role ?? "student"}
                      </span>
                    </div>

                    <Link
                      to={`/profile/${user.id}`}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-ink-700 hover:bg-paper-100"
                    >
                      <User className="h-4 w-4 text-ink-400" />
                      View Academic Profile
                    </Link>

                    <Link
                      to="/projects"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-ink-700 hover:bg-paper-100"
                    >
                      <Briefcase className="h-4 w-4 text-ink-400" />
                      Explore Projects
                    </Link>

                    {profile?.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-ink-700 hover:bg-paper-100"
                      >
                        <Shield className="h-4 w-4 text-ink-400" />
                        Admin Moderation Center
                      </Link>
                    )}

                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-ink-700 hover:bg-paper-100"
                    >
                      <Settings className="h-4 w-4 text-ink-400" />
                      Settings & Preferences
                    </Link>

                    <div className="border-t border-ink-100 mt-1">
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                          navigate("/");
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy-50"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-navy-600"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-ink-500 hover:bg-paper-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          <div className="space-y-1">
            {navLinks.map((link) => {
              if (link.authRequired && !user) return null;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-paper-100"
                >
                  <Icon className="h-4 w-4 text-ink-500" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {!user ? (
            <div className="mt-4 pt-3 border-t border-ink-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-md border border-navy px-3 py-2 text-sm font-semibold text-navy"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white"
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t border-ink-100 space-y-2">
              <Link
                to={`/profile/${user.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-ink-700"
              >
                <User className="h-4 w-4" /> Academic Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-ink-700"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                  navigate("/");
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-700"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
