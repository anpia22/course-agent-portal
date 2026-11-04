import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Newspaper,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  LifeBuoy,
  MessageCircle,
  UsersRound,
  Settings,
  Building2,
  BookOpen,
  CreditCard,
  Percent,
  ScrollText,
  ShieldCheck,
  User,
  Search,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { studentAPI } from '../../utils/api';
import { hasStaffRole } from '../../utils/staffRoles';
import { getStageLabel } from '../../utils/studentProgress';

const getStudentName = (s) => {
  if (!s) return 'Unnamed Student';
  if (s.name) return s.name;
  const cf = s.customFields || {};
  if (cf.name) return cf.name;
  if (cf instanceof Map && cf.has('name')) return cf.get('name');
  const entries = cf instanceof Map ? Array.from(cf.entries()) : Object.entries(cf);
  for (const [k, v] of entries) {
    if (typeof v === 'string' && k.toLowerCase().includes('name')) return v;
  }
  return 'Unnamed Student';
};

const getStudentCourseLabel = (s) => {
  if (!s) return null;
  const cf = s.customFields || {};
  return (
    s.courseInterested ||
    cf.courseInterested ||
    s.applications?.[0]?.courseName ||
    s.applications?.[0]?.course?.name ||
    null
  );
};

const getStudentUniversityLabel = (s, universities = []) => {
  if (!s) return null;
  const cf = s.customFields || {};
  const uid = s.universityId || cf.universityId;
  if (uid && Array.isArray(universities)) {
    const found = universities.find((u) => String(u.id || u._id) === String(uid));
    if (found) return found.name;
  }
  return (
    s.university ||
    cf.university ||
    cf.universityName ||
    s.applications?.[0]?.university?.name ||
    s.applications?.[0]?.universityName ||
    null
  );
};

const getAgentIdOfStudent = (s) => {
  if (!s) return null;
  return s?.agentId?.id || s?.agentId?._id || s?.agentId || null;
};

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { isAdmin, user } = useAuth();
  const {
    agents = [],
    students = [],
    applications = [],
    universities = [],
    fetchAgents,
    fetchStudents
  } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  // State for hierarchical Agents -> Registered Students dropdown
  const [agentsMenuOpen, setAgentsMenuOpen] = useState(() =>
    location.pathname.startsWith('/admin/agents')
  );
  const [expandedAgentIds, setExpandedAgentIds] = useState({});
  const [treeSearch, setTreeSearch] = useState('');

  // State for hierarchical Students dropdown (works for both Admin and Agent portals)
  const [studentsMenuOpen, setStudentsMenuOpen] = useState(() =>
    location.pathname.startsWith('/admin/students') ||
    location.pathname.startsWith('/agent/students') ||
    location.pathname.startsWith('/admin/applications') ||
    location.pathname.startsWith('/agent/applications')
  );
  const [expandedStudentIds, setExpandedStudentIds] = useState({});
  const [studentTreeSearch, setStudentTreeSearch] = useState('');

  // Ensure agents and students are loaded when menus are expanded
  useEffect(() => {
    if (isAdmin() && (agentsMenuOpen || studentsMenuOpen)) {
      if (!agents || agents.length === 0) {
        fetchAgents?.();
      }
      if (!students || students.length === 0) {
        fetchStudents?.();
      }
    } else if (!isAdmin() && studentsMenuOpen) {
      if (!students || students.length === 0) {
        fetchStudents?.();
      }
    }
  }, [isAdmin, agentsMenuOpen, studentsMenuOpen, agents, students, fetchAgents, fetchStudents]);

  // Helper to get all applications belonging to a student (from embedded student.applications or DataContext.applications)
  const getStudentApplicationsList = useCallback(
    (student) => {
      if (!student) return [];
      const studentId = String(student.id || student._id);
      const embedded = Array.isArray(student.applications) ? student.applications : [];
      const fromContext = Array.isArray(applications)
        ? applications.filter(
            (a) => String(a.studentId || a.student?.id || a.student?._id || '') === studentId
          )
        : [];
      const mergedMap = new Map();
      [...embedded, ...fromContext].forEach((app) => {
        const appId = String(app?.id || app?._id || '');
        if (appId) mergedMap.set(appId, app);
      });
      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    },
    [applications]
  );

  // Navigate to a student's application page when clicking the student in the sidebar
  const handleSelectStudent = useCallback(
    async (student) => {
      if (!student) return;
      const rolePrefix = isAdmin() ? '/admin' : '/agent';
      const studentId = String(student.id || student._id);
      const apps = getStudentApplicationsList(student);

      if (apps.length > 0) {
        const targetAppId = String(apps[0].id || apps[0]._id);
        navigate(`${rolePrefix}/applications/${targetAppId}`);
        return;
      }

      // Fallback check via API in case applications were not yet embedded
      try {
        const res = await studentAPI.getApplications(studentId);
        const fetchedApps = Array.isArray(res.data)
          ? res.data
          : res.data?.applications || [];
        if (fetchedApps.length > 0) {
          const targetAppId = String(fetchedApps[0].id || fetchedApps[0]._id);
          navigate(`${rolePrefix}/applications/${targetAppId}`);
          return;
        }
      } catch {
        // Ignore and fallback below
      }

      navigate(`${rolePrefix}/students/${studentId}`);
    },
    [isAdmin, getStudentApplicationsList, navigate]
  );

  // Check if a student is currently active (either via their application route or student route)
  const isStudentRouteActive = useCallback(
    (student) => {
      if (!student) return false;
      const studentId = String(student.id || student._id);
      if (
        location.pathname === `/admin/students/${studentId}` ||
        location.pathname === `/agent/students/${studentId}`
      ) {
        return true;
      }
      const appMatch = location.pathname.match(/^\/(?:admin|agent)\/applications\/([^/]+)$/);
      if (appMatch) {
        const activeAppId = String(appMatch[1]);
        const apps = getStudentApplicationsList(student);
        return apps.some((a) => String(a.id || a._id) === activeAppId);
      }
      return false;
    },
    [location.pathname, getStudentApplicationsList]
  );

  // Filter agents strictly by what the logged-in user is authorized to access
  const authorizedAgents = useMemo(() => {
    if (!Array.isArray(agents)) return [];
    const list = user?.staffRole === 'account_manager'
      ? agents.filter((a) => String(a.accountManagerId || a.accountManager?.id || '') === String(user.id))
      : agents;
    return [...list].sort((a, b) => {
      const nameA = (a.name || a.agencyName || '').toLowerCase();
      const nameB = (b.name || b.agencyName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [agents, user]);

  // Filter students strictly by what the logged-in user is authorized to access
  const authorizedStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    let list = students;
    if (isAdmin() && user?.staffRole === 'account_manager') {
      const allowedAgentIds = new Set(authorizedAgents.map((a) => String(a.id || a._id)));
      list = students.filter((s) => {
        const aid = getAgentIdOfStudent(s);
        return aid && allowedAgentIds.has(String(aid));
      });
    } else if (!isAdmin() && user?.id) {
      list = students.filter((s) => {
        const aid = getAgentIdOfStudent(s);
        return !aid || String(aid) === String(user.id);
      });
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0)
    );
  }, [students, isAdmin, user, authorizedAgents]);

  // Map each agent ID to the students registered under that specific agent
  const studentsByAgentId = useMemo(() => {
    const map = {};
    authorizedStudents.forEach((student) => {
      const aid = getAgentIdOfStudent(student);
      if (!aid) return;
      const key = String(aid);
      if (!map[key]) map[key] = [];
      map[key].push(student);
    });
    return map;
  }, [authorizedStudents]);

  // Filtered agents & students when searching inside the Agents sidebar tree
  const filteredHierarchy = useMemo(() => {
    const q = treeSearch.trim().toLowerCase();
    return authorizedAgents
      .map((agent) => {
        const agentId = String(agent.id || agent._id);
        const agentStudents = studentsByAgentId[agentId] || [];
        const agentDisplayName = agent.name || agent.agencyName || 'Unnamed Agent';
        const agencyLabel = agent.agencyName && agent.name && agent.agencyName !== agent.name ? agent.agencyName : null;

        if (!q) {
          return {
            agent,
            agentId,
            agentDisplayName,
            agencyLabel,
            students: agentStudents,
            forceOpen: false
          };
        }

        const agentMatches =
          agentDisplayName.toLowerCase().includes(q) ||
          (agencyLabel && agencyLabel.toLowerCase().includes(q)) ||
          (agent.agentCode && agent.agentCode.toLowerCase().includes(q));

        const matchingStudents = agentStudents.filter((s) =>
          getStudentName(s).toLowerCase().includes(q)
        );

        if (!agentMatches && matchingStudents.length === 0) return null;

        return {
          agent,
          agentId,
          agentDisplayName,
          agencyLabel,
          students: agentMatches ? agentStudents : matchingStudents,
          forceOpen: matchingStudents.length > 0 && !agentMatches
        };
      })
      .filter(Boolean);
  }, [authorizedAgents, studentsByAgentId, treeSearch]);

  // Filtered students for the Students sidebar dropdown
  const filteredStudentsList = useMemo(() => {
    const q = studentTreeSearch.trim().toLowerCase();
    if (!q) return authorizedStudents;
    return authorizedStudents.filter((s) => {
      const sName = getStudentName(s).toLowerCase();
      const cName = (getStudentCourseLabel(s) || '').toLowerCase();
      const uName = (getStudentUniversityLabel(s, universities) || '').toLowerCase();
      return sName.includes(q) || cName.includes(q) || uName.includes(q);
    });
  }, [authorizedStudents, studentTreeSearch, universities]);

  // Auto-expand the parent agent / student node when viewing a student's application or student details page
  useEffect(() => {
    if (students.length === 0) return;

    const studentMatch = location.pathname.match(/^\/(?:admin|agent)\/students\/([^/]+)$/);
    if (studentMatch) {
      const currentStudentId = studentMatch[1];
      const found = students.find((s) => String(s.id || s._id) === String(currentStudentId));
      const aid = getAgentIdOfStudent(found);
      if (aid) {
        setExpandedAgentIds((prev) => ({ ...prev, [String(aid)]: true }));
      }
      setExpandedStudentIds((prev) => ({ ...prev, [String(currentStudentId)]: true }));
      return;
    }

    const appMatch = location.pathname.match(/^\/(?:admin|agent)\/applications\/([^/]+)$/);
    if (appMatch) {
      const currentAppId = String(appMatch[1]);
      const found = students.find((s) =>
        getStudentApplicationsList(s).some((a) => String(a.id || a._id) === currentAppId)
      );
      if (found) {
        const sid = String(found.id || found._id);
        const aid = getAgentIdOfStudent(found);
        if (aid) {
          setExpandedAgentIds((prev) => ({ ...prev, [String(aid)]: true }));
        }
        setExpandedStudentIds((prev) => ({ ...prev, [sid]: true }));
      }
    }
  }, [location.pathname, students, getStudentApplicationsList]);

  const toggleAgentsMenu = () => {
    if (collapsed) {
      setCollapsed(false);
      setAgentsMenuOpen(true);
      return;
    }
    setAgentsMenuOpen((prev) => !prev);
  };

  const toggleAgentNode = (agentId) => {
    setExpandedAgentIds((prev) => ({
      ...prev,
      [agentId]: !prev[agentId]
    }));
  };

  const toggleStudentsMenu = () => {
    if (collapsed) {
      setCollapsed(false);
      setStudentsMenuOpen(true);
      return;
    }
    setStudentsMenuOpen((prev) => !prev);
  };

  const toggleStudentNode = (studentId, e) => {
    if (e) e.stopPropagation();
    setExpandedStudentIds((prev) => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Sections follow the real workflow: people -> admissions -> money.
  const adminSections = [
    {
      title: null, links: [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/news', icon: Newspaper, label: 'News & Updates' },
      ]
    },
    {
      title: 'Agents & Admissions', links: [
        { to: '/admin/agents', icon: Users, label: 'Agents', isHierarchicalAgents: true, staffRoles: ['account_manager', 'head_recruitment', 'head_admission'] },
        { to: '/admin/students', icon: GraduationCap, label: 'Students', isHierarchicalStudents: true, staffRoles: ['account_manager', 'head_recruitment', 'head_admission'] },
        { to: '/admin/invoices', icon: FileText, label: 'Invoices', staffRoles: ['head_admission', 'accounts', 'finance'] },
      ]
    },
    {
      title: 'Info', links: [
        { to: '/admin/universities', icon: Building2, label: 'Universities' },
        { to: '/admin/courses', icon: BookOpen, label: 'Programs' },
        { to: '/admin/commission', icon: Percent, label: 'Commission' },
      ]
    },
    {
      title: 'Finance', links: [
        { to: '/admin/payoffs', icon: CreditCard, label: 'Payoffs', staffRoles: ['head_admission', 'accounts'] },
      ]
    },
    {
      title: 'Help', links: [
        ...(user?.role === 'admin' && !user.staffRole ? [{ to: '/admin/team', icon: UsersRound, label: 'Team' }] : []),
        { to: '/admin/roles-guide', icon: ShieldCheck, label: 'Roles and Responsibilities' },
        { to: '/admin/chat', icon: MessageCircle, label: 'Live Chat' },
        { to: '/admin/support', icon: LifeBuoy, label: 'Support' },
        { to: '/admin/settings', icon: Settings, label: 'Settings' },
        ...(user?.role === 'admin' && (!user.staffRole || user.staffRole === 'super_admin')
          ? [{ to: '/admin/audit-log', icon: ScrollText, label: 'Audit Log' }]
          : []),
      ]
    },
  ];

  const agentSections = [
    {
      title: null, links: [
        { to: '/agent/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/agent/news', icon: Newspaper, label: 'News & Updates' },
      ]
    },
    {
      title: 'Admissions', links: [
        { to: '/agent/students', icon: GraduationCap, label: 'Students', isHierarchicalStudents: true },
        { to: '/agent/invoices', icon: FileText, label: 'Invoices' },
      ]
    },
    {
      title: 'Info', links: [
        { to: '/agent/universities', icon: Building2, label: 'Universities' },
        { to: '/agent/programs', icon: BookOpen, label: 'Programs' },
        { to: '/agent/commission', icon: Percent, label: 'Commission' },
      ]
    },
    {
      title: 'Finance', links: [
        { to: '/agent/payoffs', icon: CreditCard, label: 'Payoffs' },
      ]
    },
    {
      title: 'Help', links: [
        { to: '/agent/chat', icon: MessageCircle, label: 'Live Chat' },
        { to: '/agent/support', icon: LifeBuoy, label: 'Support' },
        { to: '/agent/settings', icon: Settings, label: 'Settings' },
      ]
    },
  ];

  const sections = (isAdmin() ? adminSections : agentSections)
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => !link.staffRoles || hasStaffRole(user, ...link.staffRoles)),
    }))
    .filter((section) => section.links.length > 0);

  const isLinkActive = (to) => {
    const path = location.pathname;
    if ((to === '/admin/students' || to === '/agent/students') && path.includes('/applications/')) {
      return true;
    }
    return path === to || path.startsWith(`${to}/`);
  };

  const studentBasePath = isAdmin() ? '/admin/students' : '/agent/students';

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'fixed left-0 top-0 h-full bg-slate-900/95 border-r border-slate-900/85 z-50 transition-all duration-300 ease-in-out flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-20 flex items-center justify-center border-b border-slate-900/85 px-4'
      )}>
        <img
          src="/assets/QStudylogo(blue).png"
          alt="QStudy Logo"
          className="h-10 w-auto brightness-0 invert"
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={section.title || 'main'} className={cn(i > 0 && 'pt-3')}>
            {section.title && (
              collapsed ? (
                <div className="mx-3 mb-2 border-t border-slate-800" />
              ) : (
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {section.title}
                </div>
              )
            )}
            <div className="space-y-1">
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = isLinkActive(link.to);

                // Hierarchical Agents -> Registered Students Dropdown
                if (link.isHierarchicalAgents) {
                  return (
                    <div key={link.to} className="space-y-1">
                      <div
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer select-none',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50',
                          collapsed && 'justify-center px-2'
                        )}
                        onClick={toggleAgentsMenu}
                        title={collapsed ? link.label : undefined}
                        data-testid="nav-agents"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                          {!collapsed && <span className="truncate">{link.label}</span>}
                        </div>
                        {!collapsed && (
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                            )}>
                              {authorizedAgents.length}
                            </span>
                            {agentsMenuOpen ? (
                              <ChevronDown className="w-4 h-4 flex-shrink-0 opacity-80" />
                            ) : (
                              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-80" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Level 1: Expandable List of Registered Agents */}
                      {!collapsed && agentsMenuOpen && (
                        <div
                          className="ml-4 pl-2.5 border-l border-slate-800 space-y-1 py-1"
                          data-testid="sidebar-agents-dropdown"
                        >
                          <button
                            type="button"
                            onClick={() => navigate('/admin/agents')}
                            className={cn(
                              'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                              location.pathname === '/admin/agents'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                            )}
                          >
                            <span>All Agents Directory</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>

                          {(authorizedAgents.length > 4 || authorizedStudents.length > 6) && (
                            <div className="px-1 py-1">
                              <div className="relative">
                                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={treeSearch}
                                  onChange={(e) => setTreeSearch(e.target.value)}
                                  placeholder="Search agent or student..."
                                  className="w-full h-7 pl-7 pr-2 rounded bg-slate-800/80 border border-slate-700/70 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                                />
                              </div>
                            </div>
                          )}

                          <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5">
                            {filteredHierarchy.length === 0 ? (
                              <div className="px-2.5 py-2 text-[11px] text-slate-500 italic">
                                {treeSearch ? 'No matching agents or students' : 'No registered agents'}
                              </div>
                            ) : (
                              filteredHierarchy.map(({ agentId, agentDisplayName, agencyLabel, students: agentStudents, forceOpen }) => {
                                const isAgentExpanded = Boolean(expandedAgentIds[agentId] || forceOpen);
                                const isAgentPageActive = location.pathname === `/admin/agents/${agentId}`;

                                return (
                                  <div key={agentId} className="space-y-0.5">
                                    <div
                                      className={cn(
                                        'group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer select-none',
                                        isAgentPageActive || isAgentExpanded
                                          ? 'bg-slate-800/70 text-slate-100'
                                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                      )}
                                      onClick={() => toggleAgentNode(agentId)}
                                      data-testid={`sidebar-agent-${agentId}`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        {isAgentExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                                        )}
                                        <div className="truncate flex-1" title={agencyLabel ? `${agentDisplayName} (${agencyLabel})` : agentDisplayName}>
                                          <span className="truncate">{agentDisplayName}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 ml-1">
                                        <span
                                          className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono"
                                          title={`${agentStudents.length} registered ${agentStudents.length === 1 ? 'student' : 'students'}`}
                                        >
                                          {agentStudents.length}
                                        </span>
                                        <button
                                          type="button"
                                          title={`Open ${agentDisplayName}'s profile`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/admin/agents/${agentId}`);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {isAgentExpanded && (
                                      <div
                                        className="ml-3.5 pl-2.5 border-l border-slate-800/90 space-y-0.5 py-0.5"
                                        data-testid={`sidebar-agent-students-${agentId}`}
                                      >
                                        {agentStudents.length === 0 ? (
                                          <div className="px-2 py-1 text-[11px] text-slate-500 italic">
                                            No students registered
                                          </div>
                                        ) : (
                                          agentStudents.map((student) => {
                                            const studentId = String(student.id || student._id);
                                            const studentName = getStudentName(student);
                                            const isStudentActive = isStudentRouteActive(student);

                                            return (
                                              <button
                                                key={studentId}
                                                type="button"
                                                onClick={() => handleSelectStudent(student)}
                                                data-testid={`sidebar-student-${studentId}`}
                                                title={`Open ${studentName}'s application`}
                                                className={cn(
                                                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left',
                                                  isStudentActive
                                                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                                                )}
                                              >
                                                <User className="w-3 h-3 flex-shrink-0 opacity-70" />
                                                <span className="truncate">{studentName}</span>
                                              </button>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Hierarchical Students -> Student Application Dropdown
                if (link.isHierarchicalStudents) {
                  return (
                    <div key={link.to} className="space-y-1">
                      <div
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer select-none',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50',
                          collapsed && 'justify-center px-2'
                        )}
                        onClick={toggleStudentsMenu}
                        title={collapsed ? link.label : undefined}
                        data-testid="nav-students"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                          {!collapsed && <span className="truncate">{link.label}</span>}
                        </div>
                        {!collapsed && (
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                            )}>
                              {authorizedStudents.length}
                            </span>
                            {studentsMenuOpen ? (
                              <ChevronDown className="w-4 h-4 flex-shrink-0 opacity-80" />
                            ) : (
                              <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-80" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Level 1: Expandable List of Registered Students */}
                      {!collapsed && studentsMenuOpen && (
                        <div
                          className="ml-4 pl-2.5 border-l border-slate-800 space-y-1 py-1"
                          data-testid="sidebar-students-dropdown"
                        >
                          <button
                            type="button"
                            onClick={() => navigate(studentBasePath)}
                            className={cn(
                              'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                              location.pathname === studentBasePath
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                            )}
                          >
                            <span>All Students Directory</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>

                          {authorizedStudents.length > 4 && (
                            <div className="px-1 py-1">
                              <div className="relative">
                                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={studentTreeSearch}
                                  onChange={(e) => setStudentTreeSearch(e.target.value)}
                                  placeholder="Search student or course..."
                                  className="w-full h-7 pl-7 pr-2 rounded bg-slate-800/80 border border-slate-700/70 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
                                />
                              </div>
                            </div>
                          )}

                          <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5">
                            {filteredStudentsList.length === 0 ? (
                              <div className="px-2.5 py-2 text-[11px] text-slate-500 italic">
                                {studentTreeSearch ? 'No matching students' : 'No registered students'}
                              </div>
                            ) : (
                              filteredStudentsList.map((student) => {
                                const studentId = String(student.id || student._id);
                                const studentName = getStudentName(student);
                                const courseLabel = getStudentCourseLabel(student);
                                const uniLabel = getStudentUniversityLabel(student, universities);
                                const stageLabel = getStageLabel(student);
                                const isStudentActive = isStudentRouteActive(student);
                                const isStudentExpanded = Boolean(expandedStudentIds[studentId]);

                                return (
                                  <div key={studentId} className="space-y-0.5">
                                    <div
                                      className={cn(
                                        'group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer select-none',
                                        isStudentActive
                                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                          : isStudentExpanded
                                            ? 'bg-slate-800/70 text-slate-100'
                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                      )}
                                      onClick={() => handleSelectStudent(student)}
                                      data-testid={`sidebar-students-item-${studentId}`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <button
                                          type="button"
                                          onClick={(e) => toggleStudentNode(studentId, e)}
                                          className="p-0.5 rounded hover:bg-slate-700/60"
                                          title={isStudentExpanded ? 'Collapse details' : 'Expand course & stage'}
                                        >
                                          {isStudentExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                                          )}
                                        </button>
                                        <User className="w-3 h-3 flex-shrink-0 opacity-70" />
                                        <span className="truncate" title={`Open ${studentName}'s application`}>{studentName}</span>
                                      </div>
                                    </div>

                                    {/* Level 2 under Student: Course, University & Current Pipeline Stage */}
                                    {isStudentExpanded && (
                                      <div
                                        onClick={() => handleSelectStudent(student)}
                                        className="ml-4 pl-2.5 border-l border-slate-800/90 py-1 px-2 rounded-md bg-slate-900/60 hover:bg-slate-800/40 cursor-pointer space-y-1 text-[11px]"
                                      >
                                        {courseLabel && (
                                          <div className="flex items-center gap-1.5 text-slate-300 truncate" title={courseLabel}>
                                            <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate">{courseLabel}</span>
                                          </div>
                                        )}
                                        {uniLabel && (
                                          <div className="flex items-center gap-1.5 text-slate-400 truncate" title={uniLabel}>
                                            <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                                            <span className="truncate">{uniLabel}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center justify-between pt-0.5">
                                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Stage</span>
                                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                                            {stageLabel}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    title={collapsed ? link.label : undefined}
                    data-testid={`nav-${link.label.toLowerCase()}`}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span>{link.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          data-testid="sidebar-toggle"
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-50 transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
