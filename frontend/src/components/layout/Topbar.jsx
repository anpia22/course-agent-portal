import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Menu, Search, X, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import NotificationCenter from './NotificationCenter';
import GlobalSearch from './GlobalSearch';
import { cn } from '../../lib/utils';
import { getRoleLabel } from '../../utils/staffRoles';

const getPageTitle = (pathname, role) => {
  if (pathname.includes('/dashboard')) return role === 'admin' ? 'Admin Dashboard' : 'Dashboard';
  if (pathname.includes('/students') || pathname.includes('/applications')) return 'Students';
  if (pathname.includes('/invoices')) return 'Invoices';
  if (pathname.includes('/programs') || pathname.includes('/courses')) return 'Programs';
  if (pathname.includes('/universities')) return 'Universities';
  if (pathname.includes('/commission')) return 'Commission';
  if (pathname.includes('/payoffs')) return 'Payoffs';
  if (pathname.includes('/news')) return 'News & Updates';
  if (pathname.includes('/chat')) return 'Live Chat';
  if (pathname.includes('/support')) return 'Support Centre';
  if (pathname.includes('/settings')) return 'Settings';
  if (pathname.includes('/agents')) return 'Agents Directory';
  if (pathname.includes('/team')) return 'Team Governance';
  if (pathname.includes('/audit-log')) return 'Security Audit Log';
  if (pathname.includes('/roles-guide')) return 'Roles Guide';
  return 'QStudy Portal';
};

const Topbar = ({ sidebarCollapsed, onMobileMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const pageTitle = getPageTitle(location.pathname, user?.role);
  // Check if we are on a deeper subpage (e.g. /agent/programs/123 or /agent/students/new)
  const isSubPage = location.pathname.split('/').filter(Boolean).length > 2;

  return (
    <>
      <header
        data-testid="topbar"
        className="sticky top-0 z-40 flex h-14 sm:h-16 lg:h-20 w-full items-center border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl select-none pt-[env(safe-area-inset-top,0px)]"
      >
        <div className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6">
          {/* Mobile App Header (Left side) */}
          <div className="flex items-center gap-2 lg:hidden min-w-0 flex-1">
            {isSubPage ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 -ml-1 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onMobileMenuClick}
                data-testid="mobile-menu-btn"
                aria-label="Open menu"
                className="p-2 -ml-1 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-100 font-['Outfit'] truncate tracking-tight">
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Page Title - Desktop Only */}
          <div className="hidden lg:block flex-1">
            <h1 className="text-lg font-semibold text-slate-200 font-['Outfit']">
              {user?.role === 'admin' ? 'Admin Dashboard' : `Welcome, ${user?.name}`}
            </h1>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:block flex-1 max-w-md lg:max-w-none lg:flex-none lg:w-96 mx-4">
            <GlobalSearch />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
            {/* Mobile Search Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  data-testid="user-menu-trigger"
                  className="flex items-center gap-2 h-9 px-1.5 sm:px-2 hover:bg-slate-800 hover:text-slate-100 text-slate-300 rounded-xl"
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium text-slate-200">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">{user?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{getRoleLabel(user)}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate(user?.role === 'admin' ? '/admin/settings' : '/agent/settings')}
                  data-testid="profile-menu-item"
                  className="cursor-pointer font-medium"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile &amp; Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  data-testid="logout-menu-item"
                  className="text-destructive focus:text-destructive cursor-pointer font-medium"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Mobile Search Dropdown / Dialog ── */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSearchOpen(false)}
          />

          {/* Search Box Card */}
          <div className="relative w-full bg-slate-900 border-b border-slate-800 p-4 shadow-2xl pt-[calc(0.75rem+env(safe-area-inset-top,0px))] animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <GlobalSearch />
              </div>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Topbar;
