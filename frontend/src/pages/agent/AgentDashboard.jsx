import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Wallet,
  Clock,
  ClipboardList,
  Building2,
  AlertCircle,
  GraduationCap,
  BadgeCheck,
  BookOpen,
  LifeBuoy,
  Newspaper,
  Pin,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import ComplianceStatus from '../../components/agent/ComplianceStatus';
import { AgencyLogo } from '../../components/common/AgencyLogo';
import PipelineSummary from '../../components/application/PipelineSummary';
import { formatCurrency } from '../../utils/financialFormatters';
import { getFunnelLabel } from '../../utils/studentProgress';
import { TodayPanel, HistoryPanel, isSameDay } from '../../components/dashboard/WorkTimeline';

const AgentDashboard = () => {
  const { user } = useAuth();
  const {
    getStudentsByAgent,
    invoices,
    applications,
    payoffs,
    universities,
    courses,
    tickets,
    news,
  } = useData();

  // Helper for payoff amounts (backend uses netAmount, grossCommission, or amount)
  const getPayoffAmount = (p) => Number(p.netAmount ?? p.grossCommission ?? p.amount ?? 0);

  // ── Scoped data for this agent ──
  const userId = user?.id || user?._id;
  const myStudents = useMemo(() => getStudentsByAgent(userId) || [], [getStudentsByAgent, userId]);

  // If user is logged in as agent, backend data is already scoped to them
  const myInvoices = useMemo(() => (invoices || []).filter(inv => {
    if (user?.role === 'agent') return true;
    const invAgentId = inv.agentId?.id || inv.agentId?._id || inv.agentId;
    return String(invAgentId) === String(userId);
  }), [invoices, user?.role, userId]);

  const myApplications = useMemo(() => (applications || []).filter(app => {
    if (user?.role === 'agent') return true;
    const appAgentId = app.agentId?.id || app.agentId?._id || app.agentId;
    return String(appAgentId) === String(userId);
  }), [applications, user?.role, userId]);

  const myPayoffs = useMemo(() => (payoffs || []).filter(p => {
    if (user?.role === 'agent') return true;
    const pAgentId = p.agentId?.id || p.agentId?._id || p.agentId;
    return String(pAgentId) === String(userId);
  }), [payoffs, user?.role, userId]);

  const myTickets = useMemo(() => (tickets || []).filter(t => {
    if (user?.role === 'agent') return true;
    const tAgentId = t.agentId?.id || t.agentId?._id || t.agentId || t.userId;
    return String(tAgentId) === String(userId);
  }), [tickets, user?.role, userId]);

  // ── KPI Calculations ──
  const totalStudents = myStudents.length;
  const activeApplications = myApplications.filter(app =>
    !['completed', 'rejected', 'withdrawn', 'cancelled'].includes(app.status?.toLowerCase())
  ).length;

  // Action required: invoices needing correction + applications needing attention + documents requested + open support tickets
  const invoicesNeedingCorrection = myInvoices.filter(inv => {
    const rev = (inv.financeReviewStatus || '').toLowerCase();
    const st = (inv.status || '').toLowerCase();
    return rev === 'correctionrequired' || st === 'correction_required' || st === 'rejected';
  });

  const applicationsNeedingAction = myApplications.filter(app => {
    const st = (app.status || '').toLowerCase();
    return st === 'documents_required' || st === 'action_required' || st === 'correction_needed';
  });

  const documentsRequested = myStudents.filter(s =>
    s.documentRequests?.some(dr => dr.status === 'pending')
  );

  const openTickets = myTickets.filter(t => {
    const st = (t.status || '').toLowerCase();
    return st === 'open' || st === 'in_progress' || st === 'pending' || st === 'replied';
  });

  const pendingPayoffsList = myPayoffs.filter(p => {
    const st = (p.status || '').toUpperCase();
    return st === 'PENDING' || st === 'APPROVED';
  });
  const pendingPayout = pendingPayoffsList.reduce((sum, p) => sum + getPayoffAmount(p), 0);

  const settledPayoffsList = myPayoffs.filter(p => {
    const st = (p.status || '').toUpperCase();
    return st === 'SETTLED' || st === 'COMPLETED';
  });
  const totalSettled = settledPayoffsList.reduce((sum, p) => sum + getPayoffAmount(p), 0);

  // At a glance: Students, Applications, Invoices, Universities, Programs, Commission (per client walkthrough [01:41])
  const glanceCards = [
    {
      title: 'Students',
      value: totalStudents,
      subtitle: `${myStudents.filter(s => s.feesPaid).length} have paid fees`,
      icon: GraduationCap,
      color: '#185FA5',
      bgColor: '#E6F1FB',
      link: '/agent/students',
    },
    {
      title: 'Application',
      value: activeApplications,
      subtitle: `${myApplications.length} submitted in total`,
      icon: ClipboardList,
      color: '#534AB7',
      bgColor: '#EEEDFE',
      link: '/agent/students',
    },
    {
      title: 'Invoice',
      value: myInvoices.length,
      subtitle: `${invoicesNeedingCorrection.length ? `${invoicesNeedingCorrection.length} needs amendment` : `${pendingPayoffsList.length} processing`}`,
      icon: FileText,
      color: '#0C447C',
      bgColor: '#E6F1FB',
      link: '/agent/invoices',
    },
    {
      title: 'University',
      value: (universities || []).length,
      subtitle: 'Malaysian partner universities',
      icon: Building2,
      color: '#085041',
      bgColor: '#E1F5EE',
      link: '/agent/universities',
    },
    {
      title: 'Program',
      value: (courses || []).length,
      subtitle: 'Diploma, Degree, Master & PhD',
      icon: BookOpen,
      color: '#B45309',
      bgColor: '#FFF7ED',
      link: '/agent/programs',
    },
    {
      title: 'Commission',
      value: formatCurrency(totalSettled),
      subtitle: `${formatCurrency(pendingPayout)} waiting to be paid`,
      icon: BadgeCheck,
      color: '#047857',
      bgColor: '#ECFDF5',
      link: '/agent/payoffs',
    },
  ];

  // ── Action items aggregation ──
  const actionItems = [];

  if (invoicesNeedingCorrection.length > 0) {
    actionItems.push({
      type: 'invoice',
      icon: FileText,
      iconBg: '#FCEBEB',
      iconColor: '#791F1F',
      count: invoicesNeedingCorrection.length,
      title: `${invoicesNeedingCorrection.length} Invoice${invoicesNeedingCorrection.length > 1 ? 's' : ''} require${invoicesNeedingCorrection.length === 1 ? 's' : ''} amendment`,
      description: invoicesNeedingCorrection.length === 1
        ? `${invoicesNeedingCorrection[0].invoiceNumber} — Finance has requested changes`
        : `Multiple invoices need your attention before approval`,
      link: '/agent/invoices',
    });
  }

  if (applicationsNeedingAction.length > 0) {
    actionItems.push({
      type: 'application',
      icon: ClipboardList,
      iconBg: '#FEF3C7',
      iconColor: '#92400E',
      count: applicationsNeedingAction.length,
      title: `${applicationsNeedingAction.length} Application${applicationsNeedingAction.length > 1 ? 's' : ''} need${applicationsNeedingAction.length === 1 ? 's' : ''} your attention`,
      description: 'Documents or information required to proceed',
      link: '/agent/students',
    });
  }

  if (documentsRequested.length > 0) {
    actionItems.push({
      type: 'document',
      icon: AlertCircle,
      iconBg: '#FFF7ED',
      iconColor: '#B45309',
      count: documentsRequested.length,
      title: `${documentsRequested.length} Student${documentsRequested.length > 1 ? 's' : ''} — documents requested`,
      description: 'Admin has requested additional documents for verification',
      link: '/agent/students',
    });
  }

  if (openTickets.length > 0) {
    actionItems.push({
      type: 'ticket',
      icon: LifeBuoy,
      iconBg: '#E6F1FB',
      iconColor: '#0C447C',
      count: openTickets.length,
      title: `${openTickets.length} Support ticket${openTickets.length > 1 ? 's' : ''} active`,
      description: 'Support & help requests waiting or updated',
      link: '/agent/support',
    });
  }

  // ── Work events (feeds "Today's work" and "Work history") ──
  const toDate = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };
  const events = [];
  const pushEvent = (e) => { if (e.time) events.push(e); };
  myStudents.forEach(s => {
    const created = toDate(s.createdAt);
    const updated = toDate(s.updatedAt);
    const appId = s.applications?.[0]?.id || s.applications?.[0]?._id;
    pushEvent({
      id: `s-${s.id || s._id}`, type: 'student', time: updated || created,
      title: s.name || 'Student',
      detail: created && updated && updated - created > 60000 ? `Student updated — ${getFunnelLabel(s)}` : 'Student registered',
      icon: GraduationCap, iconBg: '#E6F1FB', iconColor: '#185FA5',
      to: appId ? `/agent/applications/${appId}` : `/agent/students/${s.id || s._id}`
    });
  });
  myApplications.forEach(app => pushEvent({
    id: `a-${app.id || app._id}`, type: 'application', time: toDate(app.updatedAt || app.createdAt || app.submittedAt),
    title: app.studentName || app.student?.name || 'Student',
    detail: `Application — ${formatStatus(app.status)}`,
    icon: ClipboardList, iconBg: '#EEEDFE', iconColor: '#534AB7',
    to: `/agent/applications/${app.id || app._id}`
  }));
  myInvoices.forEach(inv => pushEvent({
    id: `i-${inv.id || inv._id}`, type: 'invoice', time: toDate(inv.updatedAt || inv.raisedAt || inv.createdAt),
    title: `Invoice ${inv.invoiceNumber || ''}`.trim(),
    detail: formatStatus(inv.financeReviewStatus || inv.status || 'Submitted'),
    icon: FileText, iconBg: '#E6F1FB', iconColor: '#0C447C', to: '/agent/invoices'
  }));
  myPayoffs.forEach(p => pushEvent({
    id: `p-${p.id || p._id}`, type: 'payoff', time: toDate(p.settledAt || p.updatedAt || p.createdAt),
    title: `Payoff ${p.payoffNumber || ''}`.trim(),
    detail: `${formatStatus(p.status)} — ${formatCurrency(getPayoffAmount(p))}`,
    icon: Wallet, iconBg: '#ECFDF5', iconColor: '#047857', to: '/agent/payoffs'
  }));
  myTickets.forEach(t => pushEvent({
    id: `t-${t.id || t._id}`, type: 'student', time: toDate(t.updatedAt || t.createdAt),
    title: t.subject || 'Support Ticket',
    detail: `Support — ${formatStatus(t.status || 'Open')}`,
    icon: LifeBuoy, iconBg: '#E6F1FB', iconColor: '#0C447C', to: '/agent/support'
  }));
  events.sort((a, b) => b.time - a.time);

  const now = new Date();
  const madeToday = (list, getDate) => list.filter(x => { const d = toDate(getDate(x)); return d && isSameDay(d, now); }).length;
  const todayTiles = [
    { label: 'Students added', value: madeToday(myStudents, s => s.createdAt), hint: 'registered today', icon: GraduationCap, color: '#185FA5', bg: '#E6F1FB', to: '/agent/students' },
    { label: 'Applications', value: madeToday(myApplications, a => a.createdAt || a.submittedAt), hint: 'submitted today', icon: ClipboardList, color: '#534AB7', bg: '#EEEDFE', to: '/agent/students' },
    { label: 'Invoices raised', value: madeToday(myInvoices, i => i.raisedAt || i.createdAt), hint: 'sent to finance today', icon: FileText, color: '#0C447C', bg: '#E6F1FB', to: '/agent/invoices' },
    { label: 'Status changes', value: events.filter(e => isSameDay(e.time, now) && ['application', 'invoice'].includes(e.type)).length, hint: 'applications & invoices', icon: Clock, color: '#B45309', bg: '#FFF7ED' },
    { label: 'Paid today', value: madeToday(settledPayoffsList, p => p.settledAt || p.updatedAt), hint: 'payouts received', icon: BadgeCheck, color: '#047857', bg: '#ECFDF5', to: '/agent/payoffs' },
  ];
  const todayActions = actionItems.map(i => ({
    icon: i.icon, iconBg: i.iconBg, iconColor: i.iconColor, link: i.link,
    count: i.count,
    label: i.title.replace(/^\d+\s+/, '') + ` — ${i.description}`,
  }));

  function formatStatus(status) {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const recentNews = useMemo(() => {
    const list = Array.isArray(news) ? [...news] : [];
    return list
      .sort((a, b) => (Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)))
      .slice(0, 3);
  }, [news]);

  return (
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-[#F9FAFB] min-h-screen" data-testid="agent-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <AgencyLogo agent={user} size="lg" className="w-12 h-12 text-base rounded-xl sm:w-16 sm:h-16 sm:text-xl sm:rounded-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h1 className="w-full sm:w-auto text-xl sm:text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'Partner'}
              </h1>
              {user?.agencyName && (
                <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md max-w-full truncate">
                  {user.agencyName}
                </span>
              )}
              {user?.agentCode && (
                <span className="text-xs font-mono font-semibold text-[#042C53] bg-[#E6F1FB] border border-[#B5D4F4] px-2.5 py-0.5 rounded-md" data-testid="agent-id-badge">
                  ID: {user.agentCode}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 sm:mt-1 font-medium">
              Here's what's happening with your students and applications
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-gray-200" />

      {/* Onboarding / Verification Notice (hidden once account is active) */}
      {!user?.isActivated && user?.contractStatus !== 'active' && <ComplianceStatus />}

      {/* Visa progress for your students */}
      <PipelineSummary applications={myApplications} to="/agent/students" />

      <TodayPanel tiles={todayTiles} actions={todayActions} events={events} />

      {/* At a glance (Students, Application, Invoice, University, Program, Commission) */}
      <div>
        <div className="mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">At a glance</span>
        </div>
        <div className="stat-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {glanceCards.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.title} to={c.link} className="block">
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all group h-full">
                  <div className="flex items-start justify-between mb-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{c.title}</span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.bgColor }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-[#111827] font-['Outfit'] truncate">{c.value}</div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{c.subtitle}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <HistoryPanel events={events} />

      {/* News & Updates (from Admin) */}
      <div data-testid="dashboard-news-section">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">News and Updates</span>
          <Link to="/agent/news" className="text-xs font-semibold text-[#042C53] hover:underline inline-flex items-center gap-1">
            View all updates <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {recentNews.length === 0 ? (
            <div className="p-8 text-center">
              <Newspaper className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Announcements and portal updates from QStudy Admin will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentNews.map((item) => (
                <Link
                  key={item.id || item._id}
                  to="/agent/news"
                  className="flex items-start justify-between gap-3 sm:gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#E6F1FB] text-[#042C53] flex items-center justify-center shrink-0 mt-0.5">
                      <Newspaper className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.category === 'update' ? 'Update' : 'News'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.content}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
