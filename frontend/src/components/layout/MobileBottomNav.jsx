import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  MessageCircle,
  Menu,
  Users,
  Building2,
  BookOpen,
  Percent,
  CreditCard,
  Newspaper,
  LifeBuoy,
  Settings,
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
  Award,
  ScrollText,
  UsersRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { getRoleLabel, hasStaffRole } from '../../utils/staffRoles';

export const MobileBottomNav = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAgent = !isAdmin();
  const activePath = location.pathname;

  // Primary 4 tabs + More button for Agents
  const agentTabs = [
    { to: '/agent/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/agent/students', label: 'Students', icon: GraduationCap, matchPrefix: ['/agent/students', '/agent/applications'] },
    { to: '/agent/invoices', label: 'Invoices', icon: FileText },
    { to: '/agent/chat', label: 'Chat', icon: MessageCircle },
  ];

  // Primary 4 tabs + More button for Admins
  const adminTabs = [
    { to: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/admin/agents', label: 'Agents', icon: Users, staffRoles: ['account_manager', 'head_recruitment', 'head_admission'] },
    { to: '/admin/students', label: 'Students', icon: GraduationCap, matchPrefix: ['/admin/students', '/admin/applications'], staffRoles: ['account_manager', 'head_recruitment', 'head_admission'] },
    { to: '/admin/invoices', label: 'Invoices', icon: FileText, staffRoles: ['head_admission', 'accounts', 'finance'] },
  ].filter(tab => !tab.staffRoles || hasStaffRole(user, ...tab.staffRoles));

  const primaryTabs = isAgent ? agentTabs : adminTabs;

  // Items shown inside the "More" bottom sheet
  const agentMoreLinks = [
    { to: '/agent/universities', label: 'Universities', icon: Building2, desc: 'Partner universities & admissions' },
    { to: '/agent/programs', label: 'Programs & Courses', icon: BookOpen, desc: 'Degrees, diplomas & fees' },
    { to: '/agent/commission', label: 'Commission Rates', icon: Percent, desc: 'Institutional reward tiers' },
    { to: '/agent/payoffs', label: 'Payoffs & Payouts', icon: CreditCard, desc: 'Disbursements & bank receipts' },
    { to: '/agent/news', label: 'News & Bulletins', icon: Newspaper, desc: 'Policy updates & circulars' },
    { to: '/agent/support', label: 'Support Centre', icon: LifeBuoy, desc: 'FAQs & ticket helpdesk' },
    { to: '/agent/settings', label: 'Profile & Settings', icon: Settings, desc: 'Agency, password & certificates' },
  ];

  const adminMoreLinks = [
    { to: '/admin/universities', label: 'Universities', icon: Building2, desc: 'Partner university management' },
    { to: '/admin/courses', label: 'Programs & Courses', icon: BookOpen, desc: 'Curriculum & fee structures' },
    { to: '/admin/commission', label: 'Commission Structure', icon: Percent, desc: 'Institutional tiers' },
    { to: '/admin/payoffs', label: 'Payoffs & Settlements', icon: CreditCard, desc: 'Finance disbursements' },
    { to: '/admin/news', label: 'News & Bulletins', icon: Newspaper, desc: 'Publish agent circulars' },
    { to: '/admin/chat', label: 'Live Chat', icon: MessageCircle, desc: 'Agent communication desk' },
    { to: '/admin/support', label: 'Support Tickets', icon: LifeBuoy, desc: 'Ticket inquiries & SLAs' },
    ...(user?.role === 'admin' && !user.staffRole ? [{ to: '/admin/team', label: 'Team Governance', icon: UsersRound, desc: 'Staff roles & portfolios' }] : []),
    { to: '/admin/roles-guide', label: 'Roles Matrix', icon: ShieldCheck, desc: 'Compliance responsibilities' },
    ...(user?.role === 'admin' && (!user.staffRole || user.staffRole === 'super_admin') ? [{ to: '/admin/audit-log', label: 'Audit Logs', icon: ScrollText, desc: 'Immutable security log' }] : []),
    { to: '/admin/settings', label: 'System Settings', icon: Settings, desc: 'Preferences & governance' },
  ];

  const moreLinks = isAgent ? agentMoreLinks : adminMoreLinks;

  const isTabActive = (tab) => {
    if (tab.matchPrefix) {
      return tab.matchPrefix.some(p => activePath.startsWith(p));
    }
    return activePath === tab.to || (tab.to !== '/agent/dashboard' && tab.to !== '/admin/dashboard' && activePath.startsWith(tab.to));
  };

  const isMoreActive = moreLinks.some(link => activePath.startsWith(link.to));

  const handleNavigate = (path) => {
    setSheetOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setSheetOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* ── Fixed Bottom Navigation Bar (Mobile / Tablet only) ── */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 text-slate-400 select-none pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-1 transition-all relative group',
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-200 active:scale-95'
                )}
              >
                {/* Active indicator bar */}
                {active && (
                  <span className="absolute -top-[1px] w-8 h-1 rounded-full bg-[#38BDF8] shadow-sm shadow-[#38BDF8]/50" />
                )}
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                  active && 'bg-slate-800 text-[#38BDF8]'
                )}>
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.7} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium tracking-tight mt-0.5',
                  active ? 'font-bold text-white' : 'text-slate-400'
                )}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}

          {/* More Menu Tab Button */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-1 transition-all relative group',
              (isMoreActive || sheetOpen) ? 'text-white' : 'text-slate-400 hover:text-slate-200 active:scale-95'
            )}
            aria-label="Open More Menu"
          >
            {(isMoreActive || sheetOpen) && (
              <span className="absolute -top-[1px] w-8 h-1 rounded-full bg-[#38BDF8] shadow-sm shadow-[#38BDF8]/50" />
            )}
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
              (isMoreActive || sheetOpen) && 'bg-slate-800 text-[#38BDF8]'
            )}>
              <Menu className="w-5 h-5" strokeWidth={(isMoreActive || sheetOpen) ? 2.2 : 1.7} />
            </div>
            <span className={cn(
              'text-[10px] font-medium tracking-tight mt-0.5',
              (isMoreActive || sheetOpen) ? 'font-bold text-white' : 'text-slate-400'
            )}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ── Native-Style "More" Bottom Sheet ── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet Container */}
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom,0px)]">
            {/* Sheet Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Profile Summary Header inside Sheet */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-11 w-11 border-2 border-slate-100">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-[#042C53] text-white font-bold text-sm">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate font-['Outfit']">
                      {user?.name || 'Agent User'}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-semibold py-0 text-emerald-700 bg-emerald-50 border-emerald-200 shrink-0">
                      {getRoleLabel(user)}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.agencyName || user?.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Links List */}
            <div className="overflow-y-auto px-4 py-3 divide-y divide-slate-100 space-y-1">
              <div className="space-y-1 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block">
                  All Portal Sections
                </span>
                {moreLinks.map((item) => {
                  const Icon = item.icon;
                  const active = activePath.startsWith(item.to);
                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => handleNavigate(item.to)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl transition-all text-left',
                        active
                          ? 'bg-[#E6F1FB] text-[#042C53] font-semibold'
                          : 'hover:bg-slate-50 text-slate-700 font-medium'
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          active ? 'bg-[#042C53] text-white' : 'bg-slate-100 text-slate-600'
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm block font-bold leading-tight truncate">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>

              {/* Logout Button */}
              <div className="pt-3 pb-2 px-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out of {user?.name?.split(' ')[0] || 'Account'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;

