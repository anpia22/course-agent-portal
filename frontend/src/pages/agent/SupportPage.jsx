import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  MessageSquarePlus,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  Search,
  UserPlus,
  Newspaper,
  FileText,
  User,
  ChevronDown,
  ArrowUpRight,
  HelpCircle,
  X
} from 'lucide-react';
import { format } from 'date-fns';

const SupportPage = () => {
  const { tickets = [], createTicket, addTicketResponse, loading } = useData();

  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileTab, setMobileTab] = useState('faqs'); // 'faqs' | 'tickets'

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'Technical Issue',
    priority: 'Medium'
  });
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openNewTicket) {
      setIsNewTicketOpen(true);
      if (location.state?.prefill) {
        setFormData(prev => ({
          ...prev,
          ...location.state.prefill
        }));
      }
    }
  }, [location]);

  const faqs = useMemo(() => [
    // Account & Activation
    {
      id: 'a1',
      category: 'Account & Activation',
      question: 'How does my agent account get approved?',
      answer: 'Complete your agent application, upload the required documents and confirm the declaration that your information is true, then submit it for review. Your Account Manager recommends it, the Head of Recruitment verifies it and the Head of Admission gives the final approval. You are notified at each step. If something needs fixing, the status changes to "Changes requested" and you can update and resubmit.'
    },
    {
      id: 'a2',
      category: 'Account & Activation',
      question: 'My application is "Submitted" or "Under review" — can I edit it?',
      answer: 'No. While your application is with the QStudy team (Submitted, Under review, Recommended or Verified) your details and documents are locked. If a reviewer asks for changes, it unlocks so you can update it and resubmit.'
    },
    {
      id: 'a3',
      category: 'Account & Activation',
      question: 'My application is approved. When can I submit students?',
      answer: 'After approval, the Head of Admission issues your Agent Contract in the portal. Download it, sign it and upload the signed copy from your dashboard or Settings. QStudy then issues your E-Certificate and your account becomes Active. You can submit students once your account is active.'
    },
    {
      id: 'a4',
      category: 'Account & Activation',
      question: 'How do I update my profile, agency details or password?',
      answer: 'Go to Settings. Use Profile & Agency to update your contact details, Password & Security to change your password, and Payment Details for the bank details used for your payouts.'
    },
    // Students & Applications
    {
      id: 's1',
      category: 'Students & Applications',
      question: 'How do I register a student and submit an application?',
      answer: 'Go to Students and click Register Student, fill in the student\'s details and save. Then upload their documents in the student\'s profile and create an application under Applications > New Application. Documents are uploaded through the portal — please do not send them by email. Once submitted, the application goes to the QStudy team and the student enters the pipeline at the "Application" stage.'
    },
    {
      id: 's2',
      category: 'Students & Applications',
      question: 'What documents does a student need?',
      answer: 'A valid Passport, Academic Transcripts and an English Proficiency result (IELTS/TOEFL or equivalent). Upload them from the student\'s profile. The QStudy team reviews each document and may mark it "More Information Required" — re-upload it if so. Missing documents delay the application.'
    },
    {
      id: 's3',
      category: 'Students & Applications',
      question: 'What if a student doesn\'t have a passport yet?',
      answer: 'You can register the student first, but the passport is needed to progress the application and the visa. Upload it to the student\'s profile as soon as it is available.'
    },
    {
      id: 's4',
      category: 'Students & Applications',
      question: 'Can I edit a student or move them to the next stage?',
      answer: 'No. Agents can view information and upload documents. The Head of Admission moves students through the stages, and you are notified every time a student\'s stage or payment status changes.'
    },
    {
      id: 's5',
      category: 'Students & Applications',
      question: 'What are the student stages?',
      answer: 'Application → Visa 15% → Visa 35% → Visa 70% → Arrival → Medical Examination → Registration → Fees Paid → Visa 100%. A student is in only one stage at a time, so the counts on your dashboard never double-count. When the student reaches Arrival, the team records who is arriving, the flight details and the arrival date, and you can upload the flight ticket. Visa 100% unlocks your commission invoice.'
    },
    {
      id: 's6',
      category: 'Students & Applications',
      question: 'The student reached Visa 100% — what do I do next?',
      answer: 'Upload the student\'s proof of fee payment on the application page when the student is at Registration. The Head of Admission checks that the payment was received and accepts or rejects the proof. If it is rejected, the reason is shown and you can upload a new proof. Once accepted, the student moves to Fees Paid, and after Visa 100% is reached you can raise a commission invoice.'
    },
    // Invoices & Payments
    {
      id: 'i1',
      category: 'Invoices & Payments',
      question: 'When can I raise a commission invoice?',
      answer: 'When the student has reached Visa 100% and the fees are confirmed as paid. The visa milestones (15%, 35%, 70%) do not earn commission. Go to Invoices > Raise New Invoice and select the eligible applications. An invoice can include only one university and one currency, so raise a separate invoice for each.'
    },
    {
      id: 'i2',
      category: 'Invoices & Payments',
      question: 'What happens after I submit an invoice?',
      answer: 'Submitted → the Head of Admission verifies and approves it → Processing (waiting for the university to pay QStudy) → Accounts/Finance pays you and uploads the payment slip → Paid. If changes are needed the invoice shows "Action Required"; correct it and resubmit.'
    },
    {
      id: 'i3',
      category: 'Invoices & Payments',
      question: 'When will I be paid?',
      answer: 'You are paid after the university has paid QStudy and that payment is recorded in the portal; Accounts/Finance then pays you by bank transfer, in the same currency the university paid in (USD or RM). The portal only keeps the records — no money moves through it. Track each payment under Payoffs, where you can also view the payment slip.'
    },
    {
      id: 'i4',
      category: 'Invoices & Payments',
      question: 'How is my commission calculated?',
      answer: 'Commission is set per university (for example University 1 = 10%, University 2 = 8%), not per agent. Open Universities to see the commission and fees for each university.'
    },
    // Universities & Updates
    {
      id: 'u1',
      category: 'Universities & Updates',
      question: 'Where do I find university fees, commission and brochures?',
      answer: 'Open Universities from the sidebar. You can search and view university details, fee structures, commission, brochures and scholarship updates. This information is managed by QStudy and cannot be edited by agents.'
    },
    {
      id: 'u2',
      category: 'Universities & Updates',
      question: 'How will I know about announcements and updates?',
      answer: 'QStudy publishes announcements under News & Updates and you are notified when something new is posted, a university\'s information changes, a student\'s stage changes, or a payment is made. All alerts are also listed in Notifications.'
    },
    {
      id: 'u3',
      category: 'Universities & Updates',
      question: 'How do I contact QStudy?',
      answer: 'Use Live Chat to message the QStudy team directly (there is a WhatsApp link in the chat), or raise a support ticket from this page for anything that needs tracking.'
    }
  ], []);

  // Filter FAQs based on search
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase().trim();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [searchQuery, faqs]);

  const categories = useMemo(() => [...new Set(filteredFaqs.map((f) => f.category))], [filteredFaqs]);

  const handleCreateTicket = async () => {
    if (!formData.subject || !formData.description) return;

    try {
      await createTicket(formData);
      setIsNewTicketOpen(false);
      setFormData({ subject: '', description: '', category: 'Technical Issue', priority: 'Medium' });
      setMobileTab('tickets');
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      await addTicketResponse(selectedTicket.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">Open</Badge>;
      case 'In Progress':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">Progress</Badge>;
      case 'Resolved':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8 pb-12 bg-[#F9FAFB] min-h-screen" data-testid="agent-support-page">
      {/* ── Hero Search Section ── */}
      <div className="relative overflow-hidden bg-[#042C53] rounded-2xl sm:rounded-3xl mx-3 sm:mx-6 lg:mx-8 mt-3 sm:mt-8 p-5 sm:p-10 md:p-14 text-center shadow-xl shadow-[#042C53]/15">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4 sm:space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#B5D4F4] backdrop-blur-sm border border-white/10">
            <HelpCircle className="w-3.5 h-3.5 text-[#85B7EB]" />
            Agent Knowledge Base &amp; Help Desk
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-white font-['Outfit'] tracking-tight">
            How can we help you today?
          </h1>
          <p className="text-[#85B7EB] text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
            Search our operational guides, read institutional FAQs, or submit a support ticket to our admissions team.
          </p>

          <div className="relative max-w-xl mx-auto group pt-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-[#042C53] transition-colors" />
            <input
              type="text"
              placeholder="Search guides, questions, or keywords..."
              className="w-full bg-white border-none rounded-xl sm:rounded-2xl py-3 sm:py-3.5 pl-10 sm:pl-12 pr-10 text-xs sm:text-sm font-medium focus:ring-4 focus:ring-[#B5D4F4]/30 shadow-lg text-[#111827] placeholder:text-gray-400 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {/* Subtle decorative shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-400/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
      </div>

      {/* ── Quick Category Links ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 px-3 sm:px-6 lg:px-8">
        {[
          { label: 'Account & Activation', icon: User, color: '#EEEDFE', iconColor: '#3C3489' },
          { label: 'Students & Applications', icon: UserPlus, color: '#E6F1FB', iconColor: '#0C447C' },
          { label: 'Invoices & Payments', icon: FileText, color: '#FAEEDA', iconColor: '#633806' },
          { label: 'Universities & Updates', icon: Newspaper, color: '#EAF3DE', iconColor: '#27500A' },
        ].map((item, idx) => {
          const count = faqs.filter(f => f.category === item.label).length;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setMobileTab('faqs');
                const first = faqs.find(f => f.category === item.label);
                if (first) setOpenFaq(first.id);
                const elem = document.getElementById(`faq-${item.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
                if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex flex-col items-center p-3.5 sm:p-5 bg-white border border-gray-100 rounded-xl sm:rounded-2xl hover:border-[#042C53]/40 hover:shadow-md transition-all group text-center"
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3 transition-transform group-hover:scale-105 shrink-0"
                style={{ backgroundColor: item.color }}
              >
                <item.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: item.iconColor }} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#111827] leading-snug line-clamp-2">
                {item.label}
              </span>
              <span className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 sm:mt-1 font-medium">
                {count} articles
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Mobile Tab Switcher (Visible only on mobile/tablet screens < lg) ── */}
      <div className="lg:hidden px-3 sm:px-6">
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('faqs')}
            className={cn(
              "flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5",
              mobileTab === 'faqs' ? "bg-white text-[#042C53] shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQs &amp; Guides</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('tickets')}
            className={cn(
              "flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5",
              mobileTab === 'tickets' ? "bg-white text-[#042C53] shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span>My Tickets</span>
            {tickets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#042C53] text-white">
                {tickets.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Content Area (Responsive Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 px-3 sm:px-6 lg:px-8">
        {/* ── FAQ Section (Shown on desktop, or when mobileTab === 'faqs') ── */}
        <div className={cn("lg:col-span-2 space-y-6", mobileTab !== 'faqs' && "hidden lg:block")}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#111827] font-['Outfit'] flex items-center gap-2">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {searchQuery ? `Showing results for "${searchQuery}"` : 'Browse official answers for partner agencies'}
              </p>
            </div>
            {/* Quick Raise Ticket button for mobile when in FAQs view */}
            <Button
              onClick={() => setIsNewTicketOpen(true)}
              size="sm"
              className="lg:hidden bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-semibold h-8 px-3 rounded-lg gap-1.5"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              New Ticket
            </Button>
          </div>

          {categories.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-500">
              <HelpCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No matching articles found</p>
              <p className="text-xs text-gray-400 mt-1">Try another keyword or submit a ticket directly.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((cat) => {
                const categoryFaqs = filteredFaqs.filter((f) => f.category === cat);
                if (categoryFaqs.length === 0) return null;

                return (
                  <div
                    key={cat}
                    id={`faq-${cat.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                    className="space-y-3 scroll-mt-24"
                  >
                    <div className="flex items-center gap-3 px-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {cat}
                      </span>
                      <div className="h-px w-full bg-gray-200" />
                    </div>

                    <div className="space-y-2.5">
                      {categoryFaqs.map((faq) => {
                        const isOpen = openFaq === faq.id;
                        return (
                          <div
                            key={faq.id}
                            className="bg-white border border-gray-200/80 rounded-xl sm:rounded-2xl overflow-hidden transition-all hover:border-gray-300 shadow-xs"
                          >
                            <button
                              type="button"
                              onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                              className="w-full flex items-center justify-between p-4 sm:p-5 text-left group gap-3"
                            >
                              <span className="text-xs sm:text-sm font-semibold text-[#111827] group-hover:text-[#042C53] transition-colors leading-snug">
                                {faq.question}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform shrink-0",
                                  isOpen && "rotate-180 text-[#042C53]"
                                )}
                              />
                            </button>
                            {isOpen && (
                              <div className="px-4 pb-4 sm:px-5 sm:pb-5 animate-in slide-in-from-top-1 duration-200">
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal pt-1 border-t border-gray-100">
                                  {faq.answer}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Tickets Section (Shown on desktop, or when mobileTab === 'tickets') ── */}
        <div className={cn("space-y-5 lg:sticky lg:top-24 lg:h-fit", mobileTab !== 'tickets' && "hidden lg:block")}>
          {/* Action Card */}
          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-[#042C53] text-white p-5 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-bold font-['Outfit']">
                Raise a Support Ticket
              </CardTitle>
              <CardDescription className="text-[#85B7EB] text-xs font-medium mt-1">
                Can't find your answer? Our institutional team typically responds within 6 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <Button
                onClick={() => setIsNewTicketOpen(true)}
                className="w-full h-11 bg-[#042C53] hover:bg-[#0C447C] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs gap-2"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Submit New Ticket
              </Button>
            </CardContent>
          </Card>

          {/* Ticket List Card */}
          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold font-['Outfit']">
                  My Support Tickets
                </CardTitle>
                <p className="text-[11px] text-gray-500 font-medium">
                  {tickets.length} total {tickets.length === 1 ? 'ticket' : 'tickets'}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-[#042C53] bg-[#E6F1FB] border-[#B5D4F4]">
                Direct Desk
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <div className="p-8 sm:p-10 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-gray-700">No active tickets</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Submit a ticket whenever you need assistance with admissions or payouts.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={cn(
                        "p-4 cursor-pointer transition-all hover:bg-gray-50 flex items-start gap-3",
                        selectedTicket?.id === ticket.id && "bg-blue-50/50 border-l-4 border-l-[#042C53]"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        ticket.status === 'Open' ? "bg-red-500" : ticket.status === 'In Progress' ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#111827] truncate">
                            {ticket.subject}
                          </h4>
                          <span className="shrink-0">{getStatusBadge(ticket.status)}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">
                          {ticket.category || 'General'} · {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Ticket Detail Modal (Mobile-responsive) ── */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0 overflow-hidden border-none rounded-2xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
          {selectedTicket && (
            <div className="flex flex-col h-full max-h-[92vh]">
              {/* Modal Header */}
              <div className="p-4 sm:p-6 bg-[#042C53] text-white shrink-0">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-base sm:text-xl font-bold font-['Outfit'] truncate">
                        {selectedTicket.subject}
                      </h2>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <p className="text-[#85B7EB] text-[11px] sm:text-xs font-medium">
                      Ticket #{selectedTicket.id?.slice(-6).toUpperCase()} · Created {format(new Date(selectedTicket.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-6 mt-3 sm:mt-4 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#85B7EB] block">Category</span>
                    <span className="font-semibold text-white">{selectedTicket.category || 'General'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#85B7EB] block">Priority</span>
                    <span className="font-semibold text-white">{selectedTicket.priority || 'Medium'}</span>
                  </div>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/60">
                {/* Initial Description */}
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200/80 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl rounded-tl-none shadow-xs max-w-[92%]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#042C53] mb-1.5 block">
                      Initial Inquiry
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>
                </div>

                {/* Responses */}
                {selectedTicket.responses?.map((resp, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col max-w-[88%] p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs",
                      resp.senderId?.role === 'admin'
                        ? "self-start bg-white border border-gray-200/80 rounded-tl-none"
                        : "self-end bg-[#042C53] text-white rounded-tr-none ml-auto"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1.5 gap-4">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider",
                        resp.senderId?.role === 'admin' ? 'text-[#042C53]' : 'text-[#B5D4F4]'
                      )}>
                        {resp.senderId?.role === 'admin' ? 'Support Team' : 'You (Agent)'}
                      </span>
                      <span className="text-[9px] font-medium opacity-60">
                        {resp.timestamp ? format(new Date(resp.timestamp), 'HH:mm · MMM d') : ''}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                      {resp.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-3.5 sm:p-5 bg-white border-t border-gray-200 shrink-0">
                <div className="flex gap-2 sm:gap-3 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Type your reply here..."
                      className="min-h-[70px] sm:min-h-[90px] bg-gray-50 border-gray-200 rounded-xl focus:ring-[#042C53]/10 focus:border-[#042C53] text-xs sm:text-sm font-medium p-3"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </div>
                  <Button
                    size="icon"
                    className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-[#042C53] hover:bg-[#0C447C] shadow-sm shrink-0"
                    disabled={!newMessage.trim() || loading || selectedTicket.status === 'Closed'}
                    onClick={handleSendMessage}
                    title="Send Reply"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── New Ticket Dialog (Mobile-responsive) ── */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="w-[94vw] sm:max-w-[500px] rounded-2xl sm:rounded-3xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-2xl font-bold font-['Outfit'] text-[#042C53]">
              Raise Support Ticket
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium">
              Provide details about your query and our team will get back to you shortly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="rounded-xl bg-gray-50 border-gray-200 font-semibold h-10 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical Issue">Technical Issue</SelectItem>
                    <SelectItem value="Student-Related">Student-Related</SelectItem>
                    <SelectItem value="Payment / Invoice">Payment / Invoice</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Priority
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="rounded-xl bg-gray-50 border-gray-200 font-semibold h-10 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Subject *
              </Label>
              <Input
                id="subject"
                placeholder="Brief summary of your query"
                className="rounded-xl bg-gray-50 border-gray-200 font-semibold h-10 text-xs"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Message Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your issue or question in detail..."
                className="min-h-[120px] rounded-xl bg-gray-50 border-gray-200 font-medium p-3 text-xs leading-relaxed"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewTicketOpen(false)}
              className="rounded-xl text-xs font-semibold h-10 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateTicket}
              disabled={!formData.subject.trim() || !formData.description.trim() || loading}
              className="bg-[#042C53] hover:bg-[#0C447C] text-white rounded-xl text-xs font-semibold h-10 px-6 w-full sm:w-auto"
            >
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportPage;
