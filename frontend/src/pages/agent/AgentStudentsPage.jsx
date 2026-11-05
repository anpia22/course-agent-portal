import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Download, GraduationCap, Mail, Phone,
  ChevronLeft, ChevronRight, FileText, CheckCircle2, AlertCircle,
  X, MessageSquare, LayoutGrid, List, Filter,
  ArrowRight, User, MapPin, Upload, ArrowUpRight,
  Eye,
  MessageCircle, Clock, XCircle, Shield, Briefcase
} from 'lucide-react';
import ApplicationModal from '../../components/modals/ApplicationModal';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { STUDENT_FUNNEL, STUDENT_JOURNEY, VISA_SUBSTAGE_CHIPS, getFunnelKey, getStageLabel, getStudentJourneyIndex, getStudentStageInfo } from '../../utils/studentProgress';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

import { cn } from '../../lib/utils';
import StudentRegistrationModal from '../../components/modals/StudentRegistrationModal';

const DOC_STATUS_LABELS = {
  CorrectionRequired: 'More Information Required',
  UnderReview: 'Under Review'
};


const DEFAULT_DOC_CATEGORIES = [
  { label: 'Passport', value: 'Passport', mandatory: false },
  { label: 'Photo', value: 'Photo', mandatory: false },
  { label: 'Results', value: 'Results', mandatory: false }
];

const AgentStudentsPage = () => {
  const { user } = useAuth();
  const {
    students,
    universities,
    getStudentsByAgent,
    fetchStudents,
    addStudent,
    uploadStudentDocument,
    viewStudentDocument,
    loading
  } = useData();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [curStage, setCurStage] = useState('all');
  const [subStageFilter, setSubStageFilter] = useState('all');
  const [visaPopupOpen, setVisaPopupOpen] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [displayMode, setDisplayMode] = useState('table'); // 'table' or 'grid'
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const paramUni = searchParams.get('university') || '';
  const paramCourse = searchParams.get('course') || '';
  const paramAction = searchParams.get('action');

  const [showAddModal, setShowAddModal] = useState(paramAction === 'register' || Boolean(paramUni || paramCourse));
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  const handleCloseModal = (open) => {
    setShowAddModal(open);
    if (!open && (paramUni || paramCourse || paramAction)) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('university');
        next.delete('course');
        next.delete('action');
        return next;
      }, { replace: true });
    }
  };
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({});

  const myStudents = useMemo(() => {
    return getStudentsByAgent(user?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, user?.id, getStudentsByAgent]);

  const stepperRef = useRef(null);

  // Auto-scroll the Journey Stepper to center on the active stage
  useEffect(() => {
    if (selectedStudentId) {
      const student = myStudents.find(s => String(s.id || s._id) === String(selectedStudentId));
      if (student) {
        const scrollToActive = () => {
          if (stepperRef.current) {
            const currentIdx = getStudentJourneyIndex(student);
            const stepWidth = 88;
            const containerWidth = stepperRef.current.clientWidth || 340;
            const targetScroll = Math.max(0, (currentIdx * stepWidth) - (containerWidth / 2) + (stepWidth / 2));
            stepperRef.current.scrollLeft = targetScroll;
          }
        };
        scrollToActive();
        const timer = setTimeout(scrollToActive, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedStudentId, myStudents]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('field_')) {
      const fieldId = name.replace('field_', '');
      setFormData(prev => ({
        ...prev,
        customFields: { ...prev.customFields, [fieldId]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    // This is now handled by DynamicStudentForm inside the modal
  };

  const getStudentValue = (student, key, fallbackLabel) => {
    if (!student) return 'N/A';

    // Direct property
    if (student[key] && student[key] !== 'Not specified') return student[key];

    // Custom field by exact key
    if (student.customFields?.[key]) return student.customFields[key];

    return 'N/A';
  };

  const getStudentName = (s) => {
    const val = getStudentValue(s, 'name', 'Full Name');
    return val === 'N/A' ? 'Unknown Student' : val;
  };

  const getInitials = (name) => {
    if (!name || name === 'N/A') return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDocStatus = useCallback((student) => {
    if (!student) return 'missing';

    const required = DEFAULT_DOC_CATEGORIES;

    if (required.length === 0) return 'complete';

    const uploadedDocs = student.documents || [];

    // Check if any mandatory document is missing or not approved
    const mandatoryDocs = required.filter(d => d.mandatory !== false);
    const hasMissingMandatory = mandatoryDocs.some(req => {
      const doc = uploadedDocs.find(d => (d.category || '').toLowerCase() === (req.value || '').toLowerCase());
      return !doc || (doc.status || '').toLowerCase() !== 'approved';
    });

    if (hasMissingMandatory) return 'missing';

    // Check if any uploaded document is not approved
    const hasUnapproved = uploadedDocs.some(d => (d.status || '').toLowerCase() !== 'approved');
    if (hasUnapproved) return 'pending';

    return 'complete';
  }, []);


  const getUniversityName = useCallback((s) => {
    if (!s) return 'Not specified';
    const cf = s.customFields || {};
    const uId = s.universityId || cf.universityId || (cf instanceof Map ? cf.get('universityId') : null);
    if (uId && universities) {
      const u = universities.find(uni => String(uni.id) === String(uId) || String(uni._id) === String(uId));
      if (u) return u.name;
    }
    const uName = s.university || cf.university || cf.universityName || (cf instanceof Map ? (cf.get('university') || cf.get('universityName')) : null);
    if (uName && uName !== 'Not specified') return uName;
    if (s.applications && s.applications.length > 0) {
      const app = s.applications[0];
      return app.university?.name || app.universityName || 'Not specified';
    }
    return 'Not specified';
  }, [universities]);

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified
          </span>
        );
      case 'UnderReview':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 text-blue-600" />
            Under Review
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 text-red-600" />
            Rejected
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  // Filtering Logic
  const filteredStudents = useMemo(() => {
    return myStudents.filter(s => {
      const name = getStudentName(s).toLowerCase();
      const cf = s.customFields || {};
      const email = (s.email || cf.email || '').toLowerCase();
      const phone = (s.phone || cf.phone || '');
      const q = searchQuery.toLowerCase();

      if (searchQuery && !name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
      if (universityFilter !== 'all') {
        const uId = s.universityId || cf.universityId || (cf instanceof Map ? cf.get('universityId') : null);
        const uName = getUniversityName(s);
        if (String(uId) !== String(universityFilter) && uName !== universityFilter) return false;
      }
      if (docFilter !== 'all' && getDocStatus(s) !== docFilter) return false;
      if (curStage !== 'all' && getFunnelKey(s) !== curStage) return false;
      if (subStageFilter !== 'all' && (s.pipelineStage || 'Application') !== subStageFilter) return false;
      if (verificationFilter !== 'all' && (s.verificationStatus || 'Pending') !== verificationFilter) return false;

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudents, searchQuery, universityFilter, docFilter, curStage, subStageFilter, verificationFilter, getUniversityName]);

  const subStageCounts = useMemo(() => {
    const counts = {};
    VISA_SUBSTAGE_CHIPS.forEach(ch => {
      counts[ch.key] = myStudents.filter(s => (s.pipelineStage || 'Application') === ch.key).length;
    });
    return counts;
  }, [myStudents]);

  const kpis = useMemo(() => {
    const total = myStudents.length;
    const counts = { all: total };
    STUDENT_FUNNEL.forEach(group => {
      counts[group.key] = myStudents.filter(s => getFunnelKey(s) === group.key).length;
    });
    return counts;
  }, [myStudents]);

  // Name for the next 'Other' document, so several can be told apart
  const [otherName, setOtherName] = useState('');

  const handleUploadClick = (category) => {
    setUploadCategory(category);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedStudentId || !uploadCategory) return;

    try {
      setIsUploading(true);
      const isOther = uploadCategory === 'Other';
      await uploadStudentDocument(selectedStudentId, file, uploadCategory, isOther ? (otherName.trim() || file.name) : undefined);
      if (isOther) setOtherName('');
      toast.success(`${isOther ? 'Document' : uploadCategory} uploaded successfully`);
      fetchStudents(); // Refresh data
    } catch (error) {
      toast.error(`Failed to upload ${uploadCategory}`);
    } finally {
      setIsUploading(false);
      setUploadCategory(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectedStudent = useMemo(() => {
    return myStudents.find(s => (s.id === selectedStudentId || s._id === selectedStudentId));
  }, [myStudents, selectedStudentId]);

  const requiredDocs = DEFAULT_DOC_CATEGORIES;

  if (loading && myStudents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#042C53]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 font-sans bg-[#F9FAFB] min-h-screen">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">My Students</h1>
          <p className="text-xs sm:text-sm text-[#6B7280] font-medium mt-1">
            {myStudents.length} students registered
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="h-10 text-xs font-bold border-gray-200"
            onClick={() => toast.info('Exporting student list...')}
          >
            <Download size={14} className="mr-2" /> Export
          </Button>
          <Button
            className="h-10 text-xs font-bold bg-[#042C53] hover:bg-[#0C447C] text-white shadow-lg shadow-[#042C53]/10"
            onClick={() => setShowAddModal(true)}
            disabled={!user?.isActivated}
            title={user?.isActivated ? undefined : 'Available once your contract is signed and your E-Certificate is issued'}
          >
            <Plus size={14} className="mr-2" /> Register Student
          </Button>
        </div>
      </div>

      {/* KPI Pipeline Row */}
      <div className="stat-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
        <div
          className={`cursor-pointer p-3 sm:p-4 rounded-xl border transition-all ${curStage === 'all' && subStageFilter === 'all' ? 'bg-white border-[#378ADD] shadow-md ring-1 ring-[#378ADD]/20' : 'bg-white border-gray-200 hover:border-gray-300'}`}
          onClick={() => { setCurStage('all'); setSubStageFilter('all'); }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">All Students</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#111827] font-['Outfit']">{kpis.all}</div>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">My registrations</p>
        </div>
        {STUDENT_FUNNEL.map(group => (
          <div
            key={group.key}
            className={`cursor-pointer p-3 sm:p-4 rounded-xl border transition-all ${curStage === group.key ? 'bg-white border-[#378ADD] shadow-md ring-1 ring-[#378ADD]/20' : 'bg-white border-gray-200 hover:border-gray-300'}`}
            onClick={() => {
              setCurStage(group.key);
              setSubStageFilter('all');
              if (group.key === 'InVisa') setVisaPopupOpen(true);
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{group.label}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#111827] font-['Outfit']">{kpis[group.key] || 0}</div>
            <p className="text-xs text-gray-500 mt-1">{group.hint}</p>
          </div>
        ))}
      </div>

      {subStageFilter !== 'all' && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[#4B5563]">
            Filtered by stage: <strong className="text-[#042C53]">{VISA_SUBSTAGE_CHIPS.find(c => c.key === subStageFilter)?.label || subStageFilter}</strong>
          </span>
          <button
            type="button"
            onClick={() => setSubStageFilter('all')}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Pop-up for Visa in Process Details */}
      <Dialog open={visaPopupOpen} onOpenChange={setVisaPopupOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 space-y-1">
            <DialogTitle className="font-['Outfit'] text-lg">Visa in process</DialogTitle>
            <DialogDescription>Select a visa stage to filter students or view stage numbers</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
            <ul className="space-y-3">
              {VISA_SUBSTAGE_CHIPS.map((chip) => {
                const cnt = subStageCounts[chip.key] || 0;
                const active = subStageFilter === chip.key;
                return (
                  <li key={chip.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurStage('all');
                        setSubStageFilter(active ? 'all' : chip.key);
                        setVisaPopupOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all',
                        active
                          ? 'bg-[#042C53] text-white border-[#042C53]'
                          : 'bg-gray-50 hover:bg-white text-[#374151] border-gray-200 hover:border-[#042C53]'
                      )}
                    >
                      <span>{chip.label}</span>
                      <span className={cn('font-bold tabular-nums', active ? 'text-white' : 'text-[#111827]')}>{cnt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] focus:ring-4 focus:ring-[#042C53]/5 transition-all bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
          <select
            className="text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#042C53] transition-all flex-1 sm:flex-initial"
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
          >
            <option value="all">All Universities</option>
            {universities?.map(u => (
              <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>
            ))}
          </select>
          <select
            className="text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#042C53] transition-all flex-1 sm:flex-initial"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
          >
            <option value="all">All Verification</option>
            <option value="Pending">Pending</option>
            <option value="UnderReview">Under Review</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            className="text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#042C53] transition-all flex-1 sm:flex-initial"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
          >
            <option value="all">All Docs</option>
            <option value="complete">Complete</option>
            <option value="missing">Missing</option>
            <option value="pending">Pending</option>
          </select>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDisplayMode('table')}
              className={cn(
                "h-8 w-8 p-0 rounded-lg transition-all",
                displayMode === 'table' ? "bg-[#E6F1FB] text-[#0C447C] shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-[#111827] "
              )}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDisplayMode('grid')}
              className={cn(
                "h-8 w-8 p-0 rounded-lg transition-all",
                displayMode === 'grid' ? "bg-[#E6F1FB] text-[#0C447C] shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-[#111827] "
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {displayMode === 'table' ? (
        <div className="space-y-4">
          {/* Mobile Card List (< md) - Native App Style */}
          <div className="md:hidden space-y-2.5">
            {filteredStudents.length > 0 ? filteredStudents.map(s => {
              const docStatus = getDocStatus(s);
              const stageInfo = getStudentStageInfo(s);
              return (
                <div
                  key={s.id || s._id}
                  onClick={() => setSelectedStudentId(s.id || s._id)}
                  className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs active:bg-slate-50 transition-all flex flex-col gap-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                        {getInitials(getStudentName(s))}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-[#111827] text-sm truncate leading-snug">
                          {getStudentName(s)}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {s.email || s.customFields?.email || 'No email provided'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${stageInfo.style}`}>
                      {stageInfo.label}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-800 truncate block text-xs">
                        {s.applications?.[0]?.courseName || s.courseInterested || 'General Course'}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate block">
                        {getUniversityName(s)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {docStatus === 'missing' && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-[#FCEBEB] text-[#791F1F]">
                          Doc Missing
                        </span>
                      )}
                      <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-14 text-center text-gray-400 bg-white border border-gray-200 rounded-2xl p-6">
                <User size={36} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs font-semibold text-gray-700">No students match your current filters</p>
              </div>
            )}
          </div>

          {/* Desktop Table (md+) */}
          <Card className="hidden md:block border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm text-left min-w-[760px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Course &amp; University</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pipeline Stage</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Verification</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Registered</th>
                    <th className="px-6 py-4 w-[60px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.length > 0 ? filteredStudents.map(s => {
                    const docStatus = getDocStatus(s);
                    return (
                      <tr
                        key={s.id || s._id}
                        className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedStudentId(s.id || s._id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                              {getInitials(getStudentName(s))}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#111827] truncate">{getStudentName(s)}</div>
                              <div className="text-[11px] text-gray-500 truncate">{s.email || s.customFields?.email || 'No email provided'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#111827] truncate">
                              {s.applications?.[0]?.courseName || s.courseInterested || 'General Course'}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate mt-0.5" title={getUniversityName(s)}>
                              {getUniversityName(s)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider whitespace-nowrap ${getStudentStageInfo(s).style}`}>
                            {getStudentStageInfo(s).label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getVerificationBadge(s.verificationStatus || 'Pending')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {docStatus === 'complete' && <span className="inline-block text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase bg-[#EAF3DE] text-[#27500A]">Complete</span>}
                          {docStatus === 'missing' && <span className="inline-block text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase bg-[#FCEBEB] text-[#791F1F]">Missing</span>}
                          {docStatus === 'pending' && <span className="inline-block text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase bg-[#FAEEDA] text-[#633806]">Pending</span>}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                          {new Date(s.createdAt || s.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#042C53] hover:border-[#042C53] transition-all">
                            <ChevronRight size={16} />
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-20 text-center text-gray-400 italic">
                        <User size={48} className="mx-auto mb-3 opacity-20" />
                        No students match your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.length > 0 ? filteredStudents.map(s => {
            const docStatus = getDocStatus(s);
            return (
              <Card
                key={s.id || s._id}
                className="border-gray-200 hover:border-[#042C53] hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelectedStudentId(s.id || s._id)}
              >
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform">
                        {getInitials(getStudentName(s))}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStudentStageInfo(s).style}`}>
                          {getStudentStageInfo(s).label}
                        </span>
                        {getVerificationBadge(s.verificationStatus || 'Pending')}
                        {docStatus === 'missing' && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-[#FCEBEB] text-[#791F1F]">Doc Missing</span>}
                      </div>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-bold text-[#111827] text-base group-hover:text-[#042C53] transition-colors">{getStudentName(s)}</h4>
                      <p className="text-xs text-gray-500 font-medium truncate">{s.email || s.customFields?.email || 'No email provided'}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                        <GraduationCap size={12} className="text-gray-400" />
                        <span className="truncate">{getUniversityName(s)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                        <MapPin size={12} className="text-gray-400" />
                        <span>{s.country || s.customFields?.country || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-[#F9FAFB] border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(s.createdAt || s.submittedAt).toLocaleDateString()}</span>
                    <button className="text-[#042C53] hover:translate-x-1 transition-transform">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          }) : (
            <div className="col-span-full py-20 text-center text-gray-400 italic">
              No students match your current filters.
            </div>
          )}
        </div>
      )}

      {/* Registration Modal */}
      <StudentRegistrationModal
        open={showAddModal}
        onOpenChange={handleCloseModal}
        defaultUniversityId={paramUni}
        defaultCourseId={paramCourse}
        onSuccess={() => {
          fetchStudents();
        }}
      />

      {/* Application Modal for existing student */}
      <ApplicationModal
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
        application={null}
        defaultUniversityId={selectedStudent?.universityId || selectedStudent?.customFields?.universityId || ''}
        defaultCourseId={selectedStudent?.customFields?.courseId || ''}
        onSuccess={() => {
          fetchStudents();
          setApplyModalOpen(false);
        }}
      />

      {/* Detail Panel Overlay */}
      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex justify-end"
          onClick={() => setSelectedStudentId(null)}
        >
          <div
            className="w-full max-w-[550px] bg-white h-full shadow-[-10px_0_30px_rgba(0,0,0,0.1)] p-0 overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center text-lg sm:text-xl font-bold shadow-sm shrink-0">
                    {getInitials(getStudentName(selectedStudent))}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#111827] font-['Outfit'] truncate">{getStudentName(selectedStudent)}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-1.5"><Mail size={14} /> {getStudentValue(selectedStudent, 'email', 'Email Address')}</span>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1.5"><Phone size={14} /> {getStudentValue(selectedStudent, 'phone', 'Phone Number')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`px-2.5 sm:px-3 py-1 font-bold uppercase tracking-wider text-[10px] sm:text-xs ${getStudentStageInfo(selectedStudent).style}`}>
                    {getStudentStageInfo(selectedStudent).label}
                  </Badge>
                  <button
                    className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setSelectedStudentId(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {getDocStatus(selectedStudent) === 'missing' && (
                <div className="flex items-start gap-3 p-4 bg-[#FFF9EB] border border-[#FEF3C7] rounded-xl mb-4">
                  <AlertCircle size={18} className="text-[#854F0B] mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-[#854F0B]">Action Required: Missing Documents</p>
                    <p className="text-[11px] text-[#854F0B]/80 font-medium mt-0.5">Please request the passport and academic transcripts to avoid delays.</p>
                  </div>
                </div>
              )}

              {/* Student Verification Notice */}
              <div className="p-4 bg-[#F9FAFB] border border-gray-100 rounded-xl mb-0 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student Verification</p>
                  <div className="mt-1">{getVerificationBadge(selectedStudent.verificationStatus || 'Pending')}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold text-[#042C53]"
                  onClick={() => navigate(`/agent/students/${selectedStudent.id || selectedStudent._id}`)}
                >
                  View Details
                </Button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-10">
              {/* Associated Application & Visa Tracking */}
              <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-[#F9FAFB]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase size={12} className="text-[#042C53]" />
                    Associated Application & Visa Tracking
                  </h4>
                  <span className="text-[10px] font-bold text-[#042C53] bg-[#E6F1FB] px-2 py-0.5 rounded-full">
                    {selectedStudent.applications?.length || 0} {selectedStudent.applications?.length === 1 ? 'Application' : 'Applications'}
                  </span>
                </div>

                {selectedStudent.applications && selectedStudent.applications.length > 0 ? (
                  <div className="space-y-3">
                    {selectedStudent.applications.map(app => (
                      <div key={app.id || app._id} className="p-3.5 bg-white rounded-xl border border-gray-200 hover:border-[#042C53]/40 shadow-xs transition-all space-y-2.5">
                        {/* Top row: Application ID & Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono font-bold text-[#042C53] bg-[#E6F1FB] px-2 py-0.5 rounded-md whitespace-nowrap">
                            {app.applicationNumber || (app.id ? `#${app.id.slice(-6).toUpperCase()}` : 'APP')}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap">
                            {app.pipelineStage || app.status || 'Submitted'}
                          </span>
                        </div>

                        {/* Middle: Course & University */}
                        <div className="space-y-0.5">
                          <h5 className="font-bold text-[#111827] text-sm leading-snug">
                            {app.courseName || selectedStudent.courseInterested || 'Course'}
                          </h5>
                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                            <GraduationCap size={13} className="text-gray-400 shrink-0" />
                            <span className="truncate">{app.university?.name || getUniversityName(selectedStudent)}</span>
                          </p>
                        </div>

                        {/* Bottom: Date & View Action */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400 font-medium">
                            Applied: {new Date(app.createdAt || selectedStudent.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs bg-[#042C53] hover:bg-[#0C447C] text-white font-semibold gap-1 shadow-xs"
                            onClick={() => navigate(`/agent/applications/${app.id || app._id}`)}
                          >
                            View Application <ArrowUpRight size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-white text-center">
                    <p className="text-xs text-gray-500 font-medium mb-3">No course application on record for this student.</p>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-[#042C53] hover:bg-[#0C447C] text-white font-bold"
                      onClick={() => setApplyModalOpen(true)}
                    >
                      <Plus size={12} className="mr-1" /> Apply For Course
                    </Button>
                  </div>
                )}
              </div>

              {/* Journey Tracker */}
              <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-[#F9FAFB]/70 space-y-3.5 mb-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-['Outfit']">
                      Student Journey Progress
                    </h4>
                    <p className="text-sm font-bold text-[#111827] mt-0.5 font-['Outfit']">
                      {getStageLabel(STUDENT_JOURNEY[getStudentJourneyIndex(selectedStudent)] || 'Application')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#042C53] font-mono">
                        Step {getStudentJourneyIndex(selectedStudent) + 1} of {STUDENT_JOURNEY.length}
                      </span>
                      <span className="text-[10px] text-gray-500 block font-medium">
                        {Math.round(((getStudentJourneyIndex(selectedStudent) + 1) / STUDENT_JOURNEY.length) * 100)}% Completed
                      </span>
                    </div>
                    {/* Left / Right scroll arrow controls */}
                    <div className="flex items-center gap-1 pl-1">
                      <button
                        type="button"
                        onClick={() => stepperRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
                        className="w-6 h-6 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center justify-center transition-colors"
                        title="Previous milestones"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepperRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
                        className="w-6 h-6 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center justify-center transition-colors"
                        title="Next milestones"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Linear Progress Bar */}
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0C447C] to-[#27500A] transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round(((getStudentJourneyIndex(selectedStudent) + 1) / STUDENT_JOURNEY.length) * 100))}%`
                    }}
                  />
                </div>

                {/* Horizontal Scrollable Stepper */}
                <div ref={stepperRef} className="overflow-x-auto scroll-row py-2 -mx-1 px-1">
                  <div className="flex items-start z-10" style={{ minWidth: 'max-content' }}>
                    {STUDENT_JOURNEY.map((stage, idx) => {
                      const currentIdx = getStudentJourneyIndex(selectedStudent);
                      const isLast = idx === STUDENT_JOURNEY.length - 1;
                      // The final stage has nothing after it, so reaching it counts as complete
                      const isDone = idx < currentIdx || (isLast && idx === currentIdx);
                      const isActive = idx === currentIdx && !isLast;
                      return (
                        <div key={stage} className="w-20 sm:w-24 shrink-0 relative flex flex-col items-center">
                          {idx > 0 && (
                            <div
                              className={`absolute top-[14px] -translate-y-1/2 right-1/2 w-full h-0.5 ${
                                idx <= currentIdx ? 'bg-[#97C459]' : 'bg-gray-200'
                              }`}
                            />
                          )}
                          <div
                            className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all shrink-0 ${
                              isDone
                                ? 'bg-[#EAF3DE] border-[#C0DD97] text-[#27500A]'
                                : isActive
                                ? 'bg-[#E6F1FB] border-[#0C447C] text-[#0C447C] ring-4 ring-[#E6F1FB]/60 shadow-xs'
                                : 'bg-white border-gray-200 text-gray-400'
                            }`}
                          >
                            {isDone ? <CheckCircle2 size={15} /> : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] leading-snug mt-2 px-1 font-semibold text-center max-w-[80px] break-words ${
                              isDone
                                ? 'text-[#27500A]'
                                : isActive
                                ? 'text-[#0C447C] font-bold'
                                : 'text-gray-400'
                            }`}
                          >
                            {getStageLabel(stage)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="mb-6">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] mb-4">Metadata & Context</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { label: 'Target University', value: getUniversityName(selectedStudent) },
                    { label: 'Preferred Country', value: getStudentValue(selectedStudent, 'country', 'Country of Interest') },
                    { label: 'Course Interest', value: getStudentValue(selectedStudent, 'courseInterested', 'Course Interested') },
                    { label: 'Education Level', value: getStudentValue(selectedStudent, 'education', 'Highest Qualification') },
                    { label: 'Registered City', value: getStudentValue(selectedStudent, 'city', 'City') },
                    { label: 'Onboarding Date', value: new Date(selectedStudent.createdAt || selectedStudent.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
                  ].map((item, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-[13px] font-semibold text-[#111827]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Documents</h4>
                  <Badge variant="outline" className="text-[9px] font-bold border-gray-200">{requiredDocs.length + 1} TOTAL</Badge>
                </div>
                <div className="space-y-3">
                  {requiredDocs.map(docType => {
                    const doc = selectedStudent.documents?.find(d => (d.category || '').toLowerCase() === (docType.value || '').toLowerCase());
                    const isMandatory = docType.mandatory !== false;
                    const docStatus = (doc?.status || '').toLowerCase();
                    const isCorrection = docStatus.includes('correction');
                    const isApproved = docStatus === 'approved';
                    const isRejected = docStatus === 'rejected';
                    const isUnderReview = docStatus === 'underreview' || docStatus === 'under_review';
                    const hasAdminRequest = (selectedStudent.documentRequests || []).some(r => (r.category || '').toLowerCase() === (docType.value || '').toLowerCase());

                    return (
                      <div key={docType.value} className="flex flex-col p-3.5 border border-gray-200/80 rounded-2xl bg-[#F9FAFB]/60 hover:bg-white hover:border-[#042C53]/20 hover:shadow-xs transition-all space-y-3 group">
                        {/* Row 1: Icon, Doc Label & Info, Status Badge */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#042C53] transition-colors shrink-0 mt-0.5">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[13px] font-bold text-[#111827]">{docType.label}</p>
                                {isMandatory ? (
                                  <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Mandatory</span>
                                ) : (
                                  <span className="text-[8px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Optional</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                                {doc ? `Uploaded on ${new Date(doc.uploadedAt).toLocaleDateString()}` : 'No file uploaded yet'}
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {doc ? (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                isApproved ? 'bg-[#EAF3DE] text-[#27500A]' :
                                isCorrection ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]' :
                                isRejected ? 'bg-[#FCEBEB] text-[#791F1F]' :
                                isUnderReview ? 'bg-[#E6F1FB] text-[#0C447C]' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {DOC_STATUS_LABELS[doc.status] || doc.status || 'Submitted'}
                              </span>
                            ) : hasAdminRequest ? (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                Requested by admin
                              </span>
                            ) : (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isMandatory ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-gray-100 text-gray-400'}`}>
                                {isMandatory ? 'Missing' : 'Not uploaded'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Row 2: Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                          {doc ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] font-bold text-[#042C53] hover:bg-[#E6F1FB] px-3"
                                onClick={() => viewStudentDocument(selectedStudent.id || selectedStudent._id, doc.id || doc._id)}
                              >
                                View
                              </Button>
                              {isCorrection && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] font-bold border-amber-600 text-amber-800 bg-amber-50 hover:bg-amber-100 px-3"
                                  onClick={() => handleUploadClick(docType.value)}
                                  disabled={isUploading}
                                >
                                  <Upload size={12} className="mr-1.5" /> Replace
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] font-bold border-[#042C53] text-[#042C53] hover:bg-[#042C53] hover:text-white px-3"
                              onClick={() => handleUploadClick(docType.value)}
                              disabled={isUploading}
                            >
                              <Upload size={12} className="mr-1.5" /> Upload
                            </Button>
                          )}
                        </div>

                        {/* Reviewer remarks / reason callout for Agent */}
                        {doc?.remarks && (isCorrection || isRejected) && (
                          <div className={`mt-2 p-2.5 rounded-xl text-xs border ${
                            isCorrection ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-red-50/80 border-red-200 text-red-900'
                          }`}>
                            <span className="font-bold text-[10px] uppercase block mb-0.5">
                              {isCorrection ? 'More Information Requested By Admin:' : 'Rejection Reason:'}
                            </span>
                            {doc.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Other documents: any number, each with a name */}
                  <div className="p-4 border border-gray-100 rounded-2xl bg-[#F9FAFB]">
                    <p className="text-[13px] font-bold text-[#111827]">Other documents</p>
                    <div className="mt-2 space-y-1.5">
                      {(selectedStudent.documents || []).filter(d => (d.category || '').toLowerCase() === 'other').map(d => (
                        <div key={d.id || d._id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-gray-800 truncate">{d.name || d.originalFilename || 'Document'}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-[#042C53] px-2" onClick={() => viewStudentDocument(selectedStudent.id || selectedStudent._id, d.id || d._id)}>View</Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        value={otherName}
                        onChange={(e) => setOtherName(e.target.value)}
                        placeholder="Name, e.g. English test"
                        maxLength={100}
                        className="flex-1 min-w-0 h-8 px-2 text-xs border border-gray-200 rounded-md bg-white"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] font-bold border-[#042C53] text-[#042C53] hover:bg-[#042C53] hover:text-white"
                        onClick={() => handleUploadClick('Other')}
                        disabled={isUploading}
                      >
                        <Upload size={12} className="mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-6 border-t border-gray-100">

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Button
                    className="h-11 text-xs font-bold bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97] hover:bg-[#DCEFC0] hover:text-[#111827]"
                    onClick={() => navigate(`/agent/students/${selectedStudent.id || selectedStudent._id}`)}
                  >
                    <Eye size={14} className="mr-2" /> View Details
                  </Button>
                  <Button
                    className="h-11 text-xs font-bold bg-[#042C53] text-white hover:bg-[#0C447C] hover:text-white"
                    onClick={() => {
                      const email = getStudentValue(selectedStudent, 'email', 'Email Address');
                      if (email && email !== 'N/A') {
                        window.location.href = `mailto:${email}`;
                      } else {
                        toast.error('No email address available for this student');
                      }
                    }}
                  >
                    <Mail size={14} className="mr-2" /> Mail Student
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Button
                    variant="outline"
                    className="h-11 text-xs font-bold border-gray-200 hover:bg-[#F3F4F6] hover:text-[#111827]"
                    onClick={() => {
                      const name = getStudentName(selectedStudent);
                      const phone = getStudentValue(selectedStudent, 'phone', 'Phone Number');
                      if (!phone || phone === 'N/A') {
                        toast.error('No phone number available for this student');
                        return;
                      }
                      const cleanPhone = phone.replace(/[^\d+]/g, '');
                      const message = `Hi ${name}, I'm following up on your registration. Do you have any questions?`;
                      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                  >
                    <MessageSquare size={14} className="mr-2" /> Draft Follow-up
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 text-xs font-bold border-gray-200 hover:bg-[#F3F4F6] hover:text-[#111827]"
                    onClick={() => {
                      navigate('/agent/support', {
                        state: {
                          openNewTicket: true,
                          prefill: {
                            subject: `Student Issue: ${getStudentName(selectedStudent)}`,
                            category: 'Student-Related',
                            description: `Support requested for student ${getStudentName(selectedStudent)} (ID: ${selectedStudent.id || selectedStudent._id}).`
                          }
                        }
                      });
                    }}
                  >
                    <AlertCircle size={14} className="mr-2" /> Raise Ticket
                  </Button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default AgentStudentsPage;
