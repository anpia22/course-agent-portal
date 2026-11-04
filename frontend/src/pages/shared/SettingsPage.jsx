import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  User,
  Lock,
  CreditCard,
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  Clock,
  ChevronRight,
  Check,
  X,
  Eye,
  EyeOff,
  Bell,
  Globe,
  Calendar,
  AlertCircle,
  ExternalLink,
  Shield,
  Briefcase,
  Users,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Info,
  FileSignature,
  FileQuestion,
  Send,
  Camera,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { STAFF_ROLE_LABELS } from '../../utils/staffRoles';
import { COUNTRIES } from '../../utils/countries';
import { applicationStateFromUser } from '../../utils/agentApplication';
import { ticketAPI, formatApiError } from '../../utils/api';
import AgencyLogo from '../../components/common/AgencyLogo';

// Format readable dates
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

export default function SettingsPage() {
  const { user, updateProfile, updatePassword } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation tab based on role and query param
  const isAgent = user?.role === 'agent';
  const isAdmin = user?.role === 'admin';

  // Compliance Lock: Agents who are verified or have an active contract cannot silently alter legal/banking details
  const isPartnerLocked = isAgent && Boolean(
    user?.isVerified ||
    user?.isActivated ||
    ['verified', 'approved'].includes(user?.onboardingStatus)
  );

  const defaultTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync tab with URL search parameter
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAgency, setSavingAgency] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  // ── Profile form state ──
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    timezone: 'Asia/Kuala_Lumpur',
    dateFormat: 'DD/MM/YYYY',
  });

  // ── Password change state ──
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Agent application & Agency fields ──
  const [application, setApplication] = useState(() => applicationStateFromUser(user));

  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
      }));
      setApplication(applicationStateFromUser(user));
    }
  }, [user]);

  // ── Helper to optimize and resize images on client before uploading ──
  const compressImage = (file, maxDim = 512) => {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputType, 0.88);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ── Logo Upload & Removal ──
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP, SVG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file exceeds 10MB size limit');
      return;
    }

    setUploadingLogo(true);
    try {
      const base64Data = await compressImage(file, 512);
      const result = await updateProfile({ avatar: base64Data });
      if (result.success) {
        toast.success(isAgent ? 'Agency logo updated successfully!' : 'Profile picture updated successfully!');
      } else {
        toast.error(result.error || 'Failed to update logo');
      }
    } catch (err) {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      const result = await updateProfile({ avatar: '' });
      if (result.success) {
        toast.success(isAgent ? 'Agency logo removed; reverted to default initials' : 'Profile photo removed');
      } else {
        toast.error(result.error || 'Failed to remove logo');
      }
    } catch {
      toast.error('Failed to remove logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Change Request Modal State ──
  const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);
  const [amendmentType, setAmendmentType] = useState('bank'); // 'bank' or 'agency'
  const [amendmentForm, setAmendmentForm] = useState({
    proposedDetails: '',
    reason: '',
    urgency: 'Standard',
  });
  const [submittingAmendment, setSubmittingAmendment] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const openAmendmentDialog = (type) => {
    setAmendmentType(type);
    setAmendmentForm({
      proposedDetails: '',
      reason: '',
      urgency: 'Standard',
    });
    setAmendmentModalOpen(true);
  };

  const handleSubmitAmendment = async (e) => {
    e.preventDefault();
    if (!amendmentForm.proposedDetails.trim() || !amendmentForm.reason.trim()) {
      toast.error('Please fill in the proposed details and the reason for the update');
      return;
    }

    setSubmittingAmendment(true);
    try {
      const isBank = amendmentType === 'bank';
      const subject = isBank
        ? `[Compliance Request] Bank Remittance Amendment — ${user?.agencyName || user?.name} (${user?.agentCode || 'Partner'})`
        : `[Compliance Request] Agency Legal Entity Amendment — ${user?.agencyName || user?.name} (${user?.agentCode || 'Partner'})`;

      const description = `PARTNER AMENDMENT REQUEST
--------------------------------------------------
Partner Name: ${user?.name || 'N/A'}
Agency Legal Name: ${user?.agencyName || 'N/A'}
Agent Code: ${user?.agentCode || 'N/A'}
Requested Category: ${isBank ? 'Bank Remittance & Commission Payout Details' : 'Company Legal Name / Registration Particulars'}
Urgency: ${amendmentForm.urgency}

PROPOSED NEW PARTICULARS:
${amendmentForm.proposedDetails.trim()}

REASON / JUSTIFICATION FOR CHANGE:
${amendmentForm.reason.trim()}

--------------------------------------------------
Note for Compliance & Finance:
Please verify supporting corporate documents (bank statement header, SSM certificate) before updating this partner record.`;

      await ticketAPI.create({
        subject,
        description,
        priority: amendmentForm.urgency === 'High' ? 'High' : 'Medium',
      });

      toast.success('Amendment Request submitted to Compliance & Finance', {
        description: 'Our team will review your request and contact you once verified.',
      });
      setAmendmentModalOpen(false);
    } catch (err) {
      toast.error('Failed to submit amendment request', { description: formatApiError(err) });
    } finally {
      setSubmittingAmendment(false);
    }
  };

  // ── Notification preferences (persisted locally per user) ──
  const prefsKey = `qstudy_prefs_${user?.id || 'anon'}`;
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem(prefsKey);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return {
      emailStudentUpdates: true,
      emailOfferLetter: true,
      emailVisaMilestones: true,
      emailPayoutClearance: true,
      emailAnnouncements: true,
      inAppSoundAlerts: true,
      inAppDesktopToasts: true,
    };
  });

  const handleNotificationToggle = (key) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(prefsKey, JSON.stringify(next));
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

  const handleSavePreferences = () => {
    setSavingPreferences(true);
    try {
      localStorage.setItem(prefsKey, JSON.stringify(notifications));
      toast.success('Notification preferences updated successfully');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Helper to extract application fields
  const buildApplicationPayload = (keys) =>
    Object.fromEntries(
      keys
        .filter((k) => application[k] !== '' && application[k] !== null && application[k] !== undefined)
        .map((k) => [k, application[k]])
    );

  // ── Save Personal Profile ──
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    setSavingProfile(true);
    const payload = {
      name: profileData.name.trim(),
      phone: profileData.phone.trim(),
    };
    const result = await updateProfile(payload);
    setSavingProfile(false);
    if (result.success) {
      toast.success('Profile details saved successfully');
    } else {
      toast.error(result.error || 'Failed to update profile');
    }
  };

  // ── Save Agency Details (Agents) ──
  const handleAgencyUpdate = async (e) => {
    e.preventDefault();
    setSavingAgency(true);
    const agencyKeys = [
      'natureOfBusiness',
      'fullAddress',
      'region',
      'website',
      'contactPerson',
      'contactDesignation',
      'signatoryName',
      'signatoryDesignation',
      'isRelativeOfEmployee',
      'relativeName',
    ];

    // If not locked, allow legal fields
    if (!isPartnerLocked) {
      agencyKeys.push('agencyName', 'businessRegistrationNumber', 'country');
    }

    const payload = {
      fullAddress: application.fullAddress,
      ...buildApplicationPayload(agencyKeys),
    };

    if (!isPartnerLocked) {
      payload.agencyName = application.agencyName;
      payload.businessRegistrationNumber = application.businessRegistrationNumber;
      payload.country = application.country;
    }

    const result = await updateProfile(payload);
    setSavingAgency(false);
    if (result.success) {
      toast.success('Agency contact details updated successfully');
    } else {
      toast.error(result.error || 'Failed to update agency particulars');
    }
  };

  // ── Save Bank Particulars (Agents - only available before lock) ──
  const handleBankUpdate = async (e) => {
    e.preventDefault();
    if (isPartnerLocked) {
      toast.info('Bank details are locked. Please submit an Amendment Request.');
      openAmendmentDialog('bank');
      return;
    }

    setSavingBank(true);
    const bankKeys = ['bankBeneficiaryName', 'bankName', 'bankAccountNumber', 'bankSwiftCode', 'bankIban', 'bankAddress'];
    const payload = buildApplicationPayload(bankKeys);

    const result = await updateProfile(payload);
    setSavingBank(false);
    if (result.success) {
      toast.success('Bank details saved for commission payouts');
    } else {
      toast.error(result.error || 'Failed to update bank details');
    }
  };

  // ── Password validation ──
  const passwordStrength = useMemo(() => {
    const pwd = passwordData.new_password;
    const hasMinLength = pwd.length >= 10;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const matches = pwd && pwd === passwordData.confirm_password;
    const isDifferent = pwd && passwordData.current_password && pwd !== passwordData.current_password;

    let score = 0;
    if (hasMinLength) score += 1;
    if (hasLetter) score += 1;
    if (hasNumber) score += 1;
    if (pwd.length >= 14) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    return {
      hasMinLength,
      hasLetter,
      hasNumber,
      matches,
      isDifferent,
      score,
      isValid: hasMinLength && hasLetter && hasNumber && matches && isDifferent,
    };
  }, [passwordData]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwordData.current_password) {
      toast.error('Please enter your current password');
      return;
    }
    if (!passwordStrength.hasMinLength) {
      toast.error('New password must be at least 10 characters');
      return;
    }
    if (!passwordStrength.hasLetter || !passwordStrength.hasNumber) {
      toast.error('New password must include both letters and numbers');
      return;
    }
    if (passwordData.new_password === passwordData.current_password) {
      toast.error('New password must be different from your current password');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setSavingPassword(true);
    const result = await updatePassword(passwordData.current_password, passwordData.new_password);
    setSavingPassword(false);

    if (result.success) {
      toast.success('Password changed successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } else {
      toast.error(result.error || 'Failed to update password');
    }
  };

  // Role display label
  const roleDisplayLabel = useMemo(() => {
    if (isAdmin) {
      return STAFF_ROLE_LABELS[user?.staffRole] || 'Super Admin';
    }
    return 'Authorized Recruitment Partner';
  }, [isAdmin, user?.staffRole]);

  // Onboarding status badge for agent
  const getAgentStatusBadge = () => {
    if (user?.isActivated) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Contract Active
        </span>
      );
    }
    if (user?.isVerified) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Agency Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" /> Onboarding in Review
      </span>
    );
  };

  // Navigation Items
  const navItems = useMemo(() => {
    const list = [
      { id: 'profile', icon: User, label: 'Profile Details', shortLabel: 'Profile', desc: 'Personal info & preferences' },
    ];
    if (isAgent) {
      list.push(
        { id: 'agency', icon: Building2, label: 'Agency Profile', shortLabel: 'Agency', desc: isPartnerLocked ? 'Locked for legal compliance' : 'Company particulars & address' },
        { id: 'payouts', icon: CreditCard, label: 'Bank & Payouts', shortLabel: 'Payouts', desc: isPartnerLocked ? 'Locked for payout security' : 'Commission remittance details' }
      );
    }
    list.push(
      { id: 'security', icon: Lock, label: 'Password & Security', shortLabel: 'Security', desc: 'Credentials & login protection' },
      { id: 'notifications', icon: Bell, label: 'Notifications', shortLabel: 'Alerts', desc: 'Alerts & communications' }
    );
    if (isAdmin && !user?.staffRole) {
      list.push({ id: 'team', icon: Users, label: 'System & Team', shortLabel: 'Team', desc: 'Staff directory & governance' });
    }
    return list;
  }, [isAgent, isAdmin, user?.staffRole, isPartnerLocked]);

  return (
    <div className="bg-[#F9FAFB] min-h-screen font-sans pb-16" data-testid="settings-page">
      {/* Top Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#042C53] bg-[#E6F1FB] px-2.5 py-0.5 rounded-md">
                  Account Center
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500 font-medium">{roleDisplayLabel}</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
                Settings & Preferences
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                Manage your credentials, company branding, operational profile, and security settings.
              </p>
            </div>

            {/* Quick Agent ID / Staff Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {isAgent && user?.agentCode && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono font-semibold">
                  <span className="text-slate-400 font-sans text-[10px] uppercase font-bold tracking-wider">ID:</span>
                  <span className="text-[#042C53] font-bold">{user.agentCode}</span>
                </div>
              )}
              {isAgent && getAgentStatusBadge()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8">
        {/* ── MOBILE ONLY: Compact Profile Snapshot & Sticky Navigation ── */}
        <div className="lg:hidden mb-4 space-y-3">
          {/* Mobile Profile Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="relative group shrink-0">
                <AgencyLogo agent={user} size="md" />
                <label
                  htmlFor="logo-file-input-mobile"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#042C53] hover:bg-[#0C447C] text-white flex items-center justify-center cursor-pointer shadow-md"
                  title={isAgent ? 'Upload Agency Logo' : 'Upload Profile Picture'}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    id="logo-file-input-mobile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-[#111827] truncate font-['Outfit']">
                    {user?.agencyName || user?.name || 'Authorized User'}
                  </h3>
                  {isAgent && user?.agentCode && (
                    <span className="text-[10px] font-mono font-bold text-[#042C53] bg-[#E6F1FB] px-1.5 py-0.2 rounded border border-[#B5D4F4]">
                      {user.agentCode}
                    </span>
                  )}
                </div>
                {user?.agencyName && user?.name && user?.agencyName !== user?.name && (
                  <p className="text-xs text-slate-600 truncate font-medium">PIC: {user.name}</p>
                )}
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileDetailsOpen((v) => !v)}
                    className="text-[11px] font-bold text-[#042C53] hover:underline flex items-center gap-1"
                  >
                    {mobileDetailsOpen ? 'Hide Account Details' : 'View Account Details'}
                    <ChevronRight className={cn('w-3 h-3 transition-transform', mobileDetailsOpen && 'rotate-90')} />
                  </button>

                  {user?.avatar && (
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={handleRemoveLogo}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Account Details */}
            {mobileDetailsOpen && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Registered Date</span>
                  <span className="font-medium text-slate-800">{formatDate(user?.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Active</span>
                  <span className="font-medium text-slate-800">{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Active now'}</span>
                </div>
                {isAgent && user?.eCertificateNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Certificate #</span>
                    <span className="font-mono font-semibold text-[#042C53]">{user.eCertificateNumber}</span>
                  </div>
                )}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-slate-400">Support</span>
                  <Link
                    to={isAdmin ? '/admin/support' : '/agent/support'}
                    className="font-bold text-[#042C53] hover:underline inline-flex items-center gap-1"
                  >
                    Contact Support <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Sticky Horizontal Tabs Bar */}
          <div className="sticky top-0 z-30 -mx-3 px-3 py-2 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                      isActive
                        ? 'bg-[#042C53] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
                    <span>{item.shortLabel || item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Sidebar: Profile Snapshot & Navigation (DESKTOP ONLY) ── */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            {/* Identity & Company Logo Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Logo with upload overlay */}
                <div className="relative group shrink-0">
                  <AgencyLogo
                    agent={user}
                    size="lg"
                    className="transition-transform group-hover:scale-105"
                  />
                  <label
                    htmlFor="logo-file-input"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#042C53] hover:bg-[#0C447C] text-white flex items-center justify-center cursor-pointer shadow-md transition-all group-hover:scale-110"
                    title={isAgent ? 'Upload Agency Logo' : 'Upload Profile Picture'}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      id="logo-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={handleLogoUpload}
                    />
                  </label>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-[#111827] truncate font-['Outfit']">
                    {user?.agencyName || user?.name || 'Authorized User'}
                  </h3>
                  {user?.agencyName && user?.name && user?.agencyName !== user?.name && (
                    <p className="text-xs text-slate-600 truncate font-medium">
                      PIC: {user.name}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 truncate mt-0.5" title={user?.email}>
                    {user?.email}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {roleDisplayLabel}
                    </span>
                  </div>

                  {/* Remove logo action if present */}
                  {user?.avatar && (
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={handleRemoveLogo}
                      className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline mt-2 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Remove logo
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Registered Date
                  </span>
                  <span className="font-medium text-slate-800">{formatDate(user?.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Last Active
                  </span>
                  <span className="font-medium text-slate-800">{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Active now'}</span>
                </div>
                {isAgent && user?.eCertificateNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Certificate #
                    </span>
                    <span className="font-mono font-semibold text-[#042C53]">{user.eCertificateNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl text-left transition-all group',
                      isActive
                        ? 'bg-[#042C53] text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-semibold truncate', isActive ? 'text-white' : 'text-[#111827]')}>
                          {item.label}
                        </p>
                        <p className={cn('text-[11px] truncate', isActive ? 'text-slate-200' : 'text-slate-400')}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={cn('w-4 h-4 shrink-0 transition-transform', isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-500')} />
                  </button>
                );
              })}
            </div>

            {/* Need Help Box */}
            <div className="bg-[#E6F1FB] border border-[#B5D4F4] rounded-2xl p-5 text-slate-800">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-[#0C447C] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-[#042C53]">Need assistance?</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Have questions about your access, commission structures, or contract renewals?
                  </p>
                  <div className="pt-2">
                    <Link
                      to={isAdmin ? '/admin/support' : '/agent/support'}
                      className="inline-flex items-center gap-1 font-semibold text-[#042C53] hover:underline"
                    >
                      Open Support Ticket <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Content Area ── */}
          <div className="lg:col-span-8">
            {/* ────────────────── 1. PROFILE DETAILS TAB ────────────────── */}
            {activeTab === 'profile' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827] font-['Outfit']">Personal Information & Branding</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your identity, company logo, and regional preferences across the portal.
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                  {/* Company Logo Upload Section */}
                  <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <AgencyLogo agent={user} size="lg" />
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#111827]">
                          {isAgent ? 'Agency Company Logo' : 'Profile Picture'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {user?.avatar ? 'Custom company logo is active.' : 'Currently using default gradient lettermark.'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Supported: PNG, JPG, WEBP, SVG (Max 5MB). Square format recommended.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="inline-flex items-center justify-center px-4 h-9 rounded-xl bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm">
                        <Camera className="w-3.5 h-3.5 mr-1.5" />
                        {uploadingLogo ? 'Saving...' : user?.avatar ? 'Change Logo' : 'Upload Logo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {user?.avatar && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingLogo}
                          onClick={handleRemoveLogo}
                          className="h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Full Name *</label>
                        <Input
                          required
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="h-10 text-sm"
                        />
                      </div>

                      {/* Email (Read-only managed by QStudy) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>Email Address</span>
                          <span className="text-[10px] text-slate-400 font-normal">Primary Login</span>
                        </label>
                        <div className="relative">
                          <Input
                            disabled
                            value={user?.email || ''}
                            className="h-10 text-sm bg-slate-50 text-slate-500 cursor-not-allowed pl-9"
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Login email is managed by QStudy Operations. Contact your administrator to request a change.
                        </p>
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Phone / WhatsApp Number</label>
                        <div className="relative">
                          <Input
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            placeholder="+60 12-345 6789"
                            className="h-10 text-sm pl-9"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      {/* Role & Access Level */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Access Role</label>
                        <div className="h-10 px-3.5 border border-slate-200 rounded-lg flex items-center justify-between bg-slate-50 text-sm">
                          <span className="font-semibold text-slate-800">{roleDisplayLabel}</span>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                            {user?.role}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Regional Preferences */}
                    <div className="pt-6 border-t border-slate-100">
                      <h3 className="text-sm font-bold text-[#111827] mb-1">Regional & Localization Preferences</h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Timestamps and dates across students, visa applications, and payouts are formatted accordingly.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" /> Operational Timezone
                          </label>
                          <select
                            value={profileData.timezone}
                            onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#042C53]/15 focus:border-[#042C53]"
                          >
                            <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT - UTC+08:00 · Malaysia Standard)</option>
                            <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
                            <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30 · India)</option>
                            <option value="Asia/Dhaka">Asia/Dhaka (BST - UTC+06:00 · Bangladesh)</option>
                            <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00 · UAE)</option>
                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Display Format
                          </label>
                          <select
                            value={profileData.dateFormat}
                            onChange={(e) => setProfileData({ ...profileData, dateFormat: e.target.value })}
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#042C53]/15 focus:border-[#042C53]"
                          >
                            <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 02/11/2026)</option>
                            <option value="DD MMM YYYY">DD MMM YYYY (e.g. 02 Nov 2026)</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-02)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 font-medium text-center sm:text-left">Changes take effect across your active session immediately.</p>
                      <Button
                        type="submit"
                        disabled={savingProfile}
                        className="w-full sm:w-auto bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-11 sm:h-10 px-6 rounded-xl shadow-sm justify-center"
                      >
                        <Save className="w-3.5 h-3.5 mr-2" />
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ────────────────── 2. AGENCY PROFILE TAB (Agents) ────────────────── */}
            {activeTab === 'agency' && isAgent && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827] font-['Outfit']">Agency Legal Particulars & Brand</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your registered business information, company logo, and official contact point.
                    </p>
                  </div>
                  {isPartnerLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openAmendmentDialog('agency')}
                      className="text-xs font-bold text-[#042C53] border-[#B5D4F4] bg-[#E6F1FB] hover:bg-[#D4E8FA] h-8 shrink-0"
                    >
                      <FileSignature className="w-3.5 h-3.5 mr-1.5" /> Request Legal Amendment
                    </Button>
                  )}
                </div>

                <form onSubmit={handleAgencyUpdate} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                  {/* Compliance Notice Banner when locked */}
                  {isPartnerLocked && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
                      <Lock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-bold text-amber-950">Corporate Entity Locked for Compliance</p>
                        <p className="leading-relaxed text-amber-800">
                          Your Agency Legal Name, Business Registration Number, and Operating Country are legally bound to your signed
                          QStudy Partnership Agreement and active E-Certificate. To prevent contract invalidation, these fields are locked.
                          Contact details (PIC, Phone, Website, Address) can still be amended below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Agency Legal Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Agency Legal / Trade Name *</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <Input
                        disabled={isPartnerLocked}
                        value={application.agencyName || ''}
                        onChange={(e) => setApplication({ ...application, agencyName: e.target.value })}
                        placeholder="e.g. Zenith Global Education Consultants Sdn Bhd"
                        className={cn('h-10 text-sm font-semibold', isPartnerLocked && 'bg-slate-50 text-slate-600 cursor-not-allowed')}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Company Registration Number (SSM / Tax ID) *</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <Input
                        disabled={isPartnerLocked}
                        value={application.businessRegistrationNumber || ''}
                        onChange={(e) => setApplication({ ...application, businessRegistrationNumber: e.target.value })}
                        placeholder="e.g. 202401029384 (123456-X)"
                        className={cn('h-10 text-sm font-mono', isPartnerLocked && 'bg-slate-50 text-slate-600 cursor-not-allowed')}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Operating Country *</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <select
                        disabled={isPartnerLocked}
                        value={application.country || ''}
                        onChange={(e) => setApplication({ ...application, country: e.target.value })}
                        className={cn(
                          'w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#042C53]/15 focus:border-[#042C53]',
                          isPartnerLocked && 'bg-slate-50 text-slate-600 cursor-not-allowed'
                        )}
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Official Website URL</label>
                      <Input
                        value={application.website || ''}
                        onChange={(e) => setApplication({ ...application, website: e.target.value })}
                        placeholder="https://www.youragency.com"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">City / State / Region *</label>
                      <Input
                        value={application.region || ''}
                        onChange={(e) => setApplication({ ...application, region: e.target.value })}
                        placeholder="e.g. Kuala Lumpur / Dhaka / New Delhi"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Registered Office Full Address *</label>
                      <textarea
                        rows={2}
                        value={application.fullAddress || ''}
                        onChange={(e) => setApplication({ ...application, fullAddress: e.target.value })}
                        placeholder="Suite 12-05, Menara QStudy, Jalan Sultan Ismail, 50250 Kuala Lumpur"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#042C53]/15 focus:border-[#042C53]"
                      />
                    </div>
                  </div>

                  {/* Primary PIC & Signatory */}
                  <div className="pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-[#111827] mb-1">Key Person in Charge (PIC) & Signatory</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Person authorized to receive student admission updates and execute agreements.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Contact Person (PIC Name) *</label>
                        <Input
                          value={application.contactPerson || ''}
                          onChange={(e) => setApplication({ ...application, contactPerson: e.target.value })}
                          placeholder="e.g. Michael Chen"
                          className="h-10 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">PIC Designation *</label>
                        <Input
                          value={application.contactDesignation || ''}
                          onChange={(e) => setApplication({ ...application, contactDesignation: e.target.value })}
                          placeholder="e.g. Managing Director / Lead Counselor"
                          className="h-10 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Authorized Agreement Signatory</label>
                        <Input
                          value={application.signatoryName || ''}
                          onChange={(e) => setApplication({ ...application, signatoryName: e.target.value })}
                          placeholder="e.g. Michael Chen"
                          className="h-10 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Signatory Designation</label>
                        <Input
                          value={application.signatoryDesignation || ''}
                          onChange={(e) => setApplication({ ...application, signatoryDesignation: e.target.value })}
                          placeholder="e.g. Director"
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 font-medium text-center sm:text-left">Contact particulars are saved immediately.</p>
                    <Button
                      type="submit"
                      disabled={savingAgency}
                      className="w-full sm:w-auto bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-11 sm:h-10 px-6 rounded-xl shadow-sm justify-center"
                    >
                      <Save className="w-3.5 h-3.5 mr-2" />
                      {savingAgency ? 'Saving...' : 'Save Contact Particulars'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ────────────────── 3. BANKING & PAYOUTS TAB (Agents) ────────────────── */}
            {activeTab === 'payouts' && isAgent && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827] font-['Outfit']">Bank Particulars for Commission Payouts</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bank remittance instructions used by Finance to release your student recruitment commissions.
                    </p>
                  </div>
                  {isPartnerLocked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openAmendmentDialog('bank')}
                      className="text-xs font-bold text-[#042C53] border-[#B5D4F4] bg-[#E6F1FB] hover:bg-[#D4E8FA] h-8 shrink-0"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Request Bank Amendment
                    </Button>
                  )}
                </div>

                <form onSubmit={handleBankUpdate} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                  {/* Security Lock Banner when locked */}
                  {isPartnerLocked ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-emerald-950">Payout Remittance Records Verified & Locked</p>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                            Tamper Protected
                          </Badge>
                        </div>
                        <p className="leading-relaxed text-emerald-800">
                          To protect commission disbursements and prevent banking interception, verified bank details cannot be edited
                          directly on the web portal. To update your corporate bank account, submit a verified <strong>Bank Amendment Request</strong> with
                          a bank statement header or official account confirmation letter.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#B5D4F4] bg-[#E6F1FB] p-4 text-xs text-[#0C447C] flex items-start gap-3">
                      <Info className="w-4 h-4 text-[#042C53] mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-[#042C53]">Malaysian University Clearance Payout Policy</p>
                        <p className="mt-0.5 leading-relaxed text-slate-700">
                          Commission is disbursed under <em>"Release Payment to Agent After University Clearance"</em>.
                          Ensure the Beneficiary Name strictly matches your corporate bank account or legal trade registration.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Beneficiary Name */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Account Beneficiary Name *</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <Input
                        required
                        disabled={isPartnerLocked}
                        value={application.bankBeneficiaryName || ''}
                        onChange={(e) => setApplication({ ...application, bankBeneficiaryName: e.target.value })}
                        placeholder="Exact name registered on the bank account (e.g. Zenith Global Sdn Bhd)"
                        className={cn('h-10 text-sm font-semibold', isPartnerLocked && 'bg-slate-50 text-slate-700 cursor-not-allowed')}
                      />
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Bank / Financial Institution *</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <Input
                        required
                        disabled={isPartnerLocked}
                        value={application.bankName || ''}
                        onChange={(e) => setApplication({ ...application, bankName: e.target.value })}
                        placeholder="e.g. Maybank / CIMB Bank / HSBC / Standard Chartered"
                        className={cn('h-10 text-sm', isPartnerLocked && 'bg-slate-50 text-slate-700 cursor-not-allowed')}
                      />
                    </div>

                    {/* Account Number */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Bank Account Number *</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <Input
                        required
                        disabled={isPartnerLocked}
                        value={application.bankAccountNumber || ''}
                        onChange={(e) => setApplication({ ...application, bankAccountNumber: e.target.value })}
                        placeholder="e.g. 5140 1234 5678"
                        className={cn('h-10 text-sm font-mono font-semibold', isPartnerLocked && 'bg-slate-50 text-slate-700 cursor-not-allowed')}
                      />
                    </div>

                    {/* SWIFT / BIC Code */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">SWIFT / BIC Code</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <Input
                        disabled={isPartnerLocked}
                        value={application.bankSwiftCode || ''}
                        onChange={(e) => setApplication({ ...application, bankSwiftCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. MBBEMYKL"
                        className={cn('h-10 text-sm font-mono uppercase', isPartnerLocked && 'bg-slate-50 text-slate-700 cursor-not-allowed')}
                      />
                    </div>

                    {/* IBAN */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">IBAN (if applicable)</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <Input
                        disabled={isPartnerLocked}
                        value={application.bankIban || ''}
                        onChange={(e) => setApplication({ ...application, bankIban: e.target.value })}
                        placeholder="International Bank Account Number"
                        className={cn('h-10 text-sm font-mono', isPartnerLocked && 'bg-slate-50 text-slate-700 cursor-not-allowed')}
                      />
                    </div>

                    {/* Bank Branch Address */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Bank Branch Address *</label>
                        {isPartnerLocked && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        required
                        disabled={isPartnerLocked}
                        value={application.bankAddress || ''}
                        onChange={(e) => setApplication({ ...application, bankAddress: e.target.value })}
                        placeholder="e.g. Menara Maybank, 100 Jalan Tun Perak, 50050 Kuala Lumpur, Malaysia"
                        className={cn(
                          'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#042C53]/15 focus:border-[#042C53]',
                          isPartnerLocked && 'bg-slate-50 text-slate-700 cursor-not-allowed'
                        )}
                      />
                    </div>
                  </div>

                  {/* Submit / Action Button */}
                  <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 font-medium">
                      {isPartnerLocked
                        ? 'Bank changes require verification to prevent payment interception.'
                        : 'Bank slips and payout receipts are uploaded against these details.'}
                    </p>
                    {isPartnerLocked ? (
                      <Button
                        type="button"
                        onClick={() => openAmendmentDialog('bank')}
                        className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-10 px-6 rounded-xl shadow-sm shrink-0"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-2" /> Request Bank Amendment
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={savingBank}
                        className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-10 px-6 rounded-xl shadow-sm shrink-0"
                      >
                        <Save className="w-3.5 h-3.5 mr-2" />
                        {savingBank ? 'Saving...' : 'Save Bank Details'}
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* ────────────────── 4. PASSWORD & SECURITY TAB ────────────────── */}
            {activeTab === 'security' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827] font-['Outfit']">Password & Account Protection</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ensure your account is protected with strong credentials.
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePasswordUpdate} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                  <div className="max-w-xl space-y-5">
                    {/* Current Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Current Password *</label>
                      <div className="relative">
                        <Input
                          required
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.current_password}
                          onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                          placeholder="Enter your current password"
                          className="h-10 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">New Password *</label>
                      <div className="relative">
                        <Input
                          required
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.new_password}
                          onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                          placeholder="At least 10 characters, with letters and numbers"
                          className="h-10 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Confirm New Password *</label>
                      <div className="relative">
                        <Input
                          required
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirm_password}
                          onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                          placeholder="Re-enter your new password"
                          className="h-10 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Requirements Checklist */}
                    {passwordData.new_password && (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                        <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                          Password Security Checklist
                        </p>
                        <div className="space-y-1.5 text-slate-600">
                          <div className="flex items-center gap-2">
                            {passwordStrength.hasMinLength ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            <span className={passwordStrength.hasMinLength ? 'text-emerald-800 font-medium' : ''}>
                              At least 10 characters length
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordStrength.hasLetter ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            <span className={passwordStrength.hasLetter ? 'text-emerald-800 font-medium' : ''}>
                              Contains at least one letter (a-z, A-Z)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordStrength.hasNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            <span className={passwordStrength.hasNumber ? 'text-emerald-800 font-medium' : ''}>
                              Contains at least one number (0-9)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordStrength.matches && passwordData.confirm_password ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            <span
                              className={
                                passwordStrength.matches && passwordData.confirm_password
                                  ? 'text-emerald-800 font-medium'
                                  : ''
                              }
                            >
                              New passwords match
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Security Context */}
                  <div className="pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 text-center sm:text-left">
                      <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Encrypted with bcrypt (salted). Never share credentials with third parties.</span>
                    </div>

                    <Button
                      type="submit"
                      disabled={savingPassword || !passwordData.new_password}
                      className="w-full sm:w-auto bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-11 sm:h-10 px-6 rounded-xl shadow-sm justify-center"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ────────────────── 5. NOTIFICATIONS TAB ────────────────── */}
            {activeTab === 'notifications' && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827] font-['Outfit']">Notification Preferences</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure how you receive operational milestones, student stage updates, and payout alerts.
                    </p>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  {/* Student & Admissions Notification Group */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Briefcase className="w-4 h-4 text-[#042C53]" />
                      <h3 className="text-sm font-bold text-[#111827]">Student & Visa Progress Alerts</h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Student Application Submissions</p>
                          <p className="text-xs text-slate-500">Alerts when new student applications are registered or amended.</p>
                        </div>
                        <Switch
                          checked={notifications.emailStudentUpdates}
                          onCheckedChange={() => handleNotificationToggle('emailStudentUpdates')}
                        />
                      </div>

                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Offer Letter & Acceptance Updates</p>
                          <p className="text-xs text-slate-500">Instant notification when university issues an Offer Letter.</p>
                        </div>
                        <Switch
                          checked={notifications.emailOfferLetter}
                          onCheckedChange={() => handleNotificationToggle('emailOfferLetter')}
                        />
                      </div>

                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">EMGS Visa Progress & eVAL Approvals</p>
                          <p className="text-xs text-slate-500">Key visa status milestones (5%, 35%, 70%, 80%, eVAL Approval, Visa 100%).</p>
                        </div>
                        <Switch
                          checked={notifications.emailVisaMilestones}
                          onCheckedChange={() => handleNotificationToggle('emailVisaMilestones')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial & Commissions Group */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <CreditCard className="w-4 h-4 text-[#042C53]" />
                      <h3 className="text-sm font-bold text-[#111827]">Finance & Commission Payouts</h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Invoice Approval & Clearance Notifications</p>
                          <p className="text-xs text-slate-500">
                            Updates when invoices are approved, university clearance is verified, or bank transfers are released.
                          </p>
                        </div>
                        <Switch
                          checked={notifications.emailPayoutClearance}
                          onCheckedChange={() => handleNotificationToggle('emailPayoutClearance')}
                        />
                      </div>

                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Portal News & Malaysian Policy Bulletins</p>
                          <p className="text-xs text-slate-500">
                            Weekly operational circulars, ministry updates, and new partner university announcements.
                          </p>
                        </div>
                        <Switch
                          checked={notifications.emailAnnouncements}
                          onCheckedChange={() => handleNotificationToggle('emailAnnouncements')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* In-App Notifications */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Bell className="w-4 h-4 text-[#042C53]" />
                      <h3 className="text-sm font-bold text-[#111827]">In-Portal Toast & Sound Alerts</h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                      <div className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Desktop Pop-up Notifications</p>
                          <p className="text-xs text-slate-500">Display immediate toast notifications for status updates.</p>
                        </div>
                        <Switch
                          checked={notifications.inAppDesktopToasts}
                          onCheckedChange={() => handleNotificationToggle('inAppDesktopToasts')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 font-medium text-center sm:text-left">Preferences are stored and applied directly to your user session.</p>
                    <Button
                      type="button"
                      onClick={handleSavePreferences}
                      disabled={savingPreferences}
                      className="w-full sm:w-auto bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-11 sm:h-10 px-6 rounded-xl shadow-sm justify-center"
                    >
                      <Save className="w-3.5 h-3.5 mr-2" />
                      {savingPreferences ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ────────────────── 6. SYSTEM & TEAM TAB (Super Admin) ────────────────── */}
            {activeTab === 'team' && isAdmin && !user?.staffRole && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827] font-['Outfit']">System Administration & Team Governance</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Super Admin command center for staff management, security audit logs, and permission matrix.
                    </p>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Team Management Card */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold text-[#111827] font-['Outfit']">Staff & Role Directory</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Add new operational team members, assign Account Managers, Head of Admission, or Finance roles, and reassign portfolios.
                        </p>
                      </div>
                      <div className="pt-4">
                        <Link
                          to="/admin/team"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#042C53] hover:bg-[#0C447C] px-4 py-2 rounded-lg transition-colors"
                        >
                          Open Team Management <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Security Audit Log Card */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold text-[#111827] font-['Outfit']">Audit Trail & Security Logs</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Inspect immutable audit logs of agent approvals, invoice authorizations, payout disbursements, and document overrides.
                        </p>
                      </div>
                      <div className="pt-4">
                        <Link
                          to="/admin/audit-log"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 border border-slate-300 hover:bg-white px-4 py-2 rounded-lg transition-colors"
                        >
                          View Audit Trail <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Role Matrix Overview */}
                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-[#111827]">Active Role Access Matrix</h4>
                      <Link to="/admin/roles-guide" className="text-xs font-semibold text-[#042C53] hover:underline flex items-center gap-1">
                        View Complete Roles Guide <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-[#111827] block">Account Manager</span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">Assigned Agents & Verification</span>
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-[#111827] block">Head of Recruitment</span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">Onboarding Document Review</span>
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-[#111827] block">Head of Admission</span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">Offer Letters, Visa & Contracts</span>
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="font-bold text-[#111827] block">Finance</span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">University Clearance & Payouts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────── AMENDMENT REQUEST MODAL ────────────────── */}
      <Dialog open={amendmentModalOpen} onOpenChange={setAmendmentModalOpen}>
        <DialogContent className="w-[94vw] sm:max-w-lg p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center shrink-0">
                {amendmentType === 'bank' ? <CreditCard className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              </div>
              <DialogTitle className="text-lg font-bold text-[#111827] font-['Outfit']">
                {amendmentType === 'bank' ? 'Request Bank Details Amendment' : 'Request Legal Entity Amendment'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 pt-1 leading-relaxed">
              {amendmentType === 'bank'
                ? 'Submit a formal request to Finance & Compliance to update your official commission payout instructions.'
                : 'Submit a formal request to update your registered agency legal name or company registration number.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAmendment} className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
            <div className="p-3.5 rounded-xl border border-[#B5D4F4] bg-[#E6F1FB] text-xs text-[#0C447C] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#042C53] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                For security and anti-fraud verification, Compliance requires an official supporting document (e.g. Bank confirmation letter, statement header, or SSM certificate).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {amendmentType === 'bank' ? 'Proposed New Bank Particulars *' : 'Proposed New Legal Particulars *'}
              </label>
              <textarea
                rows={3}
                required
                value={amendmentForm.proposedDetails}
                onChange={(e) => setAmendmentForm({ ...amendmentForm, proposedDetails: e.target.value })}
                placeholder={
                  amendmentType === 'bank'
                    ? 'Beneficiary Name: ...\nBank Name: ...\nAccount Number: ...\nSWIFT Code: ...'
                    : 'New Company Name: ...\nRegistration Number: ...\nEffective Date: ...'
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#042C53]/15 focus:border-[#042C53] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Reason / Justification for Change *</label>
              <textarea
                rows={2}
                required
                value={amendmentForm.reason}
                onChange={(e) => setAmendmentForm({ ...amendmentForm, reason: e.target.value })}
                placeholder="e.g. Migrated corporate banking to Maybank Islamic / Company converted from enterprise to Sdn Bhd."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#042C53]/15 focus:border-[#042C53]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Urgency Level</label>
              <select
                value={amendmentForm.urgency}
                onChange={(e) => setAmendmentForm({ ...amendmentForm, urgency: e.target.value })}
                className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#042C53]/15 focus:border-[#042C53]"
              >
                <option value="Standard">Standard (Within 2 business days)</option>
                <option value="High">High (Pending active commission payoff)</option>
              </select>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmendmentModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAmendment}
                size="sm"
                className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingAmendment ? 'Submitting...' : 'Submit Change Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Icon helper for links
const ArrowUpRight = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </svg>
);
