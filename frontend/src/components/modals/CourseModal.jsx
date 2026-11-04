import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import useAllUniversities from '../../hooks/useAllUniversities';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { BookOpen, Building2, Globe2, MapPin, Plus, Trash2 } from 'lucide-react';

const initialFormState = {
  name: '',
  code: '',
  level: 'Undergraduate',
  department: '',
  universityId: '',
  duration: '',
  tuitionAmount: '',
  tuitionCurrency: 'MYR',
  tuitionPeriod: 'year',
  localTuitionAmount: '',
  localTuitionCurrency: 'MYR',
  localTuitionPeriod: 'year',
  nationalityTiers: [],
  status: 'active',
  description: ''
};

const DEGREE_LEVELS = [
  'Foundation',
  'Diploma',
  'Undergraduate',
  'Postgraduate',
  'Doctorate / PhD',
  'Certificate',
  'Associate Degree'
];

const DEPARTMENTS = [
  'Computer Science & IT',
  'Business & Management',
  'Accounting & Finance',
  'Engineering & Technology',
  'Hospitality & Tourism',
  'Health & Life Sciences',
  'Medicine & Nursing',
  'Arts & Humanities',
  'Social Sciences',
  'Law & Criminology',
  'Natural Sciences & Mathematics',
  'Architecture & Design'
];

const COURSE_DURATIONS = [
  '3 Months', '6 Months', '9 Months', '12 Months', '18 Months',
  '1 Year', '1.5 Years', '2 Years', '2.5 Years', '3 Years',
  '4 Years', '5 Years', '6 Years', '7 Years'
];

const FEE_CURRENCIES = [
  { code: 'MYR', symbol: 'RM' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'NZD', symbol: 'NZ$' },
  { code: 'INR', symbol: '₹' },
  { code: 'AED', symbol: 'AED' },
  { code: 'SGD', symbol: 'S$' }
];

const FEE_PERIODS = [
  { value: 'year', label: 'Per year' },
  { value: 'semester', label: 'Per semester' },
  { value: 'month', label: 'Per month' },
  { value: 'total', label: 'Total course fee' }
];

const NATIONALITY_PRESETS = [
  'ASEAN / Southeast Asia',
  'South Asia (India, Pakistan, Bangladesh, etc.)',
  'Middle East & North Africa (MENA)',
  'Africa',
  'China / East Asia',
  'Central Asia',
  'Europe / Americas'
];

// Parse a single stored fee string (e.g. "MYR 22,000 / year" or "RM 22,000 / year") into parts
const parseSingleTuitionFee = (raw, defaultCurrency = 'MYR') => {
  const parts = { amount: '', currency: defaultCurrency, period: 'year' };
  if (!raw) return parts;
  const str = String(raw).trim();
  const num = str.match(/\d[\d,]*(?:\.\d+)?/);
  if (num) parts.amount = num[0];
  const upper = str.toUpperCase();
  if (/\bRM\b|\bMYR\b/.test(upper)) {
    parts.currency = 'MYR';
  } else {
    const byCode = FEE_CURRENCIES.find(c => new RegExp(`\\b${c.code}\\b`).test(upper));
    if (byCode) {
      parts.currency = byCode.code;
    } else {
      const bySymbol = [...FEE_CURRENCIES]
        .sort((a, b) => b.symbol.length - a.symbol.length)
        .find(c => str.includes(c.symbol));
      if (bySymbol) parts.currency = bySymbol.code;
    }
  }
  const lower = str.toLowerCase();
  if (/semester|term/.test(lower)) parts.period = 'semester';
  else if (/month/.test(lower)) parts.period = 'month';
  else if (/total|full|whole/.test(lower)) parts.period = 'total';
  return parts;
};

// Parse stored tuitionFee string which may have both International and Local fees:
// e.g. "Intl: MYR 25,000 / year | Local: MYR 15,000 / year" or "MYR 22,000 / year"
const parseDualTuitionFee = (raw) => {
  const result = {
    intl: { amount: '', currency: 'MYR', period: 'year' },
    local: { amount: '', currency: 'MYR', period: 'year' }
  };
  if (!raw) return result;
  const str = String(raw).trim();

  if (str.includes('|') || /^(?:Intl|International|Local)\s*:/i.test(str)) {
    const segments = str.split('|').map(s => s.trim()).filter(Boolean);
    segments.forEach(seg => {
      const intlMatch = seg.match(/^(?:Intl|International)\s*:\s*(.+)$/i);
      const localMatch = seg.match(/^Local(?:\s*\(Malaysian\))?\s*:\s*(.+)$/i);
      if (intlMatch) {
        result.intl = parseSingleTuitionFee(intlMatch[1], 'MYR');
      } else if (localMatch) {
        result.local = parseSingleTuitionFee(localMatch[1], 'MYR');
      } else if (!result.intl.amount) {
        result.intl = parseSingleTuitionFee(seg, 'MYR');
      }
    });
    return result;
  }

  result.intl = parseSingleTuitionFee(str, 'MYR');
  return result;
};

// Split "Nationality fees: ..." line out of course description so it can be edited via structured inputs
const extractDescriptionAndNationalityTiers = (rawDescription) => {
  const cleanLines = [];
  const tiers = [];
  String(rawDescription || '').split('\n').forEach((line) => {
    const trimmed = line.trim();
    const m = trimmed.match(/^Nationality fees:\s*(.*)$/i);
    if (m) {
      m[1].split(';').map(s => s.trim()).filter(Boolean).forEach((entry) => {
        const eq = entry.indexOf('=');
        if (eq === -1) return;
        const nationality = entry.slice(0, eq).trim();
        const feePart = entry.slice(eq + 1).trim();
        const parsed = parseSingleTuitionFee(feePart, 'MYR');
        if (nationality) {
          tiers.push({
            nationality,
            amount: parsed.amount,
            currency: parsed.currency || 'MYR',
            period: parsed.period || 'year'
          });
        }
      });
    } else {
      cleanLines.push(line);
    }
  });
  return {
    cleanDescription: cleanLines.join('\n').trim(),
    nationalityTiers: tiers
  };
};

// Course length in years from text like "2 Years", "18 Months", "1 Year" (null if unknown)
const parseDurationYears = (duration) => {
  const m = String(duration || '').toLowerCase().match(/(\d+(?:\.\d+)?)\s*(year|yr|month|mo)/);
  if (!m) return null;
  const years = m[2].startsWith('y') ? parseFloat(m[1]) : parseFloat(m[1]) / 12;
  return years > 0 ? years : null;
};

// A total course fee is converted to a per-year fee using the course duration
const toPerYearFee = ({ amount, currency, period }, duration) => {
  const years = parseDurationYears(duration);
  const total = parseFloat(String(amount || '').replace(/,/g, ''));
  if (period !== 'total' || !years || !total) return { amount, currency, period };
  const perYear = Math.round((total / years) * 100) / 100;
  return { amount: String(perYear), currency, period: 'year' };
};

const formatTuitionFee = ({ amount, currency, period }) => {
  const clean = String(amount || '').replace(/[^\d.]/g, '');
  if (!clean) return null;
  const [whole, dec] = clean.split('.');
  const formatted = Number(whole || 0).toLocaleString('en-US') + (dec ? `.${dec}` : '');
  const suffix = period === 'total' ? 'total' : `/ ${period}`;
  return `${currency} ${formatted} ${suffix}`;
};

const formatNumberInput = (val) => {
  const raw = String(val || '').replace(/[^\d.]/g, '');
  const [whole, ...rest] = raw.split('.');
  const grouped = whole ? Number(whole).toLocaleString('en-US') : '';
  return rest.length ? `${grouped || '0'}.${rest.join('')}` : grouped;
};

const CourseModal = ({ open, onOpenChange, course = null, onSuccess }) => {
  const { createCourse, updateCourse } = useData();
  const { universities, loading: loadingUniversities } = useAllUniversities(open);
  const isEditing = Boolean(course);

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (course) {
      const offered = Array.isArray(course.universityIds) ? course.universityIds.map(String) : [];
      const initialUniversityId = offered.length === 1 ? offered[0] : (offered.length === 0 && course.universityId ? String(course.universityId) : '');
      const dualFee = parseDualTuitionFee(course.tuitionFee);
      const { cleanDescription, nationalityTiers } = extractDescriptionAndNationalityTiers(course.description);

      setFormData({
        name: course.name || '',
        code: course.code || '',
        level: course.level || 'Undergraduate',
        department: course.department || '',
        universityId: initialUniversityId,
        duration: course.duration || '',
        tuitionAmount: dualFee.intl.amount,
        tuitionCurrency: dualFee.intl.currency || 'MYR',
        tuitionPeriod: dualFee.intl.period || 'year',
        localTuitionAmount: dualFee.local.amount,
        localTuitionCurrency: dualFee.local.currency || 'MYR',
        localTuitionPeriod: dualFee.local.period || 'year',
        nationalityTiers,
        status: course.status || 'active',
        description: cleanDescription
      });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
  }, [course, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const addNationalityTier = () => {
    setFormData(prev => ({
      ...prev,
      nationalityTiers: [
        ...(prev.nationalityTiers || []),
        { nationality: '', amount: '', currency: 'MYR', period: 'year' }
      ]
    }));
  };

  const updateNationalityTier = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      nationalityTiers: prev.nationalityTiers.map((tier, idx) =>
        idx === index ? { ...tier, [field]: value } : tier
      )
    }));
  };

  const removeNationalityTier = (index) => {
    setFormData(prev => ({
      ...prev,
      nationalityTiers: prev.nationalityTiers.filter((_, idx) => idx !== index)
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Program name is required';
    }
    if (!formData.universityId) {
      newErrors.universityId = 'Choose the university this program belongs to';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildCombinedTuitionFee = () => {
    const intlStr = formatTuitionFee(toPerYearFee({
      amount: formData.tuitionAmount,
      currency: formData.tuitionCurrency,
      period: formData.tuitionPeriod
    }, formData.duration));

    const localStr = formatTuitionFee(toPerYearFee({
      amount: formData.localTuitionAmount,
      currency: formData.localTuitionCurrency,
      period: formData.localTuitionPeriod
    }, formData.duration));

    if (intlStr && localStr) {
      return `Intl: ${intlStr} | Local: ${localStr}`;
    }
    if (localStr && !intlStr) {
      return `Local: ${localStr}`;
    }
    return intlStr || null;
  };

  const buildCombinedDescription = () => {
    const base = (formData.description || '').trim();
    const validTiers = (formData.nationalityTiers || [])
      .map(t => {
        const feeStr = formatTuitionFee(toPerYearFee({
          amount: t.amount,
          currency: t.currency || 'MYR',
          period: t.period || 'year'
        }, formData.duration));
        if (!t.nationality?.trim() || !feeStr) return null;
        return `${t.nationality.trim()} = ${feeStr}`;
      })
      .filter(Boolean);

    if (validTiers.length === 0) return base || null;
    const nationalityLine = `Nationality fees: ${validTiers.join('; ')}`;
    return base ? `${base}\n${nationalityLine}` : nationalityLine;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase() || null,
        level: formData.level,
        department: formData.department.trim() || null,
        universityIds: [formData.universityId],
        universityId: formData.universityId,
        duration: formData.duration.trim() || null,
        tuitionFee: buildCombinedTuitionFee(),
        status: formData.status,
        description: buildCombinedDescription()
      };

      if (isEditing) {
        await updateCourse(course.id || course._id, payload);
      } else {
        await createCourse(payload);
      }

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving course:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] p-0 overflow-y-auto border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#042C53]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                {isEditing ? 'Edit Program' : 'Add New Program'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                {isEditing ? 'Update this program and its Malaysian / International tuition fees' : 'Add a degree program to a Malaysian university and configure Local, International & Nationality fees'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 bg-[#F9FAFB] space-y-4 max-h-[78vh] overflow-y-auto">
          {/* The one university this program belongs to */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#042C53]" /> University <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.universityId}
              onValueChange={(val) => handleChange('universityId', val)}
            >
              <SelectTrigger className={`bg-white ${errors.universityId ? 'border-red-500' : ''}`}>
                <SelectValue placeholder={loadingUniversities ? 'Loading universities...' : 'Choose the university'} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {universities.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    <span className="font-medium">{u.name}</span>
                    {u.country && <span className="text-gray-500 text-[11px] ml-1.5">({u.country})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.universityId && <p className="text-[11px] text-red-500">{errors.universityId}</p>}
            {isEditing && !formData.universityId && !loadingUniversities && (
              <p className="text-[11px] text-amber-600">
                This program was set up for several universities or all of them. Choose the one it belongs to; add a separate program for each other university, so each has its own price.
              </p>
            )}
            {!isEditing && (
              <p className="text-[11px] text-gray-500">A program belongs to one university. To offer the same program at another university, add it again there with that university's price.</p>
            )}
          </div>

          {/* Course Name */}
          <div className="space-y-1.5">
            <Label htmlFor="course-name" className="text-xs font-semibold text-gray-700">
              Course Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="course-name"
              placeholder="e.g. Bachelor of Computer Science (Hons)"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`bg-white ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-[11px] text-red-500">{errors.name}</p>}
          </div>

          {/* Code & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="course-code" className="text-xs font-semibold text-gray-700">
                Course Code
              </Label>
              <Input
                id="course-code"
                placeholder="e.g. CS101 / MBA"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Degree Level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.level}
                onValueChange={(val) => handleChange('level', val)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {DEGREE_LEVELS.map(lvl => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Department / Discipline
              </Label>
              <Select
                value={formData.department || 'other'}
                onValueChange={(val) => handleChange('department', val === 'other' ? '' : val)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="other">General / Not Specified</SelectItem>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-duration" className="text-xs font-semibold text-gray-700">
                Duration
              </Label>
              <Select
                value={formData.duration || 'none'}
                onValueChange={(val) => handleChange('duration', val === 'none' ? '' : val)}
              >
                <SelectTrigger id="course-duration" className="bg-white">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Specified</SelectItem>
                  {(formData.duration && !COURSE_DURATIONS.includes(formData.duration)
                    ? [formData.duration, ...COURSE_DURATIONS]
                    : COURSE_DURATIONS
                  ).map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tuition Fees: International vs Local (Malaysian) & Nationality Tiers */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-[#042C53] uppercase tracking-wider">
                  Tuition Fee Structure (RM / Multi-Currency)
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Set fees for International Students, Local (Malaysian) Students, or specific Nationalities
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* International Student Fee */}
              <div className="space-y-1.5 rounded-lg bg-blue-50/40 border border-blue-100 p-3">
                <Label htmlFor="course-tuition" className="text-xs font-semibold text-[#042C53] flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-[#042C53]" /> International Student Fee
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="course-tuition"
                    inputMode="decimal"
                    placeholder="e.g. 25,000"
                    value={formData.tuitionAmount}
                    onChange={(e) => handleChange('tuitionAmount', formatNumberInput(e.target.value))}
                    className="bg-white col-span-2"
                  />
                  <Select
                    value={formData.tuitionCurrency}
                    onValueChange={(val) => handleChange('tuitionCurrency', val)}
                  >
                    <SelectTrigger className="bg-white w-full min-w-0 text-xs" aria-label="International Currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.tuitionPeriod}
                    onValueChange={(val) => handleChange('tuitionPeriod', val)}
                  >
                    <SelectTrigger className="bg-white w-full min-w-0 text-xs" aria-label="International Fee duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_PERIODS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.tuitionPeriod === 'total' && formData.tuitionAmount && (
                  <p className="text-[11px] text-gray-500">
                    {parseDurationYears(formData.duration)
                      ? `Saved as ${formatTuitionFee(toPerYearFee({
                          amount: formData.tuitionAmount,
                          currency: formData.tuitionCurrency,
                          period: formData.tuitionPeriod
                        }, formData.duration))}`
                      : 'Select duration above to convert to per-year.'}
                  </p>
                )}
              </div>

              {/* Local (Malaysian) Student Fee */}
              <div className="space-y-1.5 rounded-lg bg-emerald-50/40 border border-emerald-100 p-3">
                <Label htmlFor="course-local-tuition" className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Local (Malaysian) Student Fee
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="course-local-tuition"
                    inputMode="decimal"
                    placeholder="e.g. 14,000 (Optional)"
                    value={formData.localTuitionAmount}
                    onChange={(e) => handleChange('localTuitionAmount', formatNumberInput(e.target.value))}
                    className="bg-white col-span-2"
                  />
                  <Select
                    value={formData.localTuitionCurrency}
                    onValueChange={(val) => handleChange('localTuitionCurrency', val)}
                  >
                    <SelectTrigger className="bg-white w-full min-w-0 text-xs" aria-label="Local Currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.localTuitionPeriod}
                    onValueChange={(val) => handleChange('localTuitionPeriod', val)}
                  >
                    <SelectTrigger className="bg-white w-full min-w-0 text-xs" aria-label="Local Fee duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_PERIODS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.localTuitionPeriod === 'total' && formData.localTuitionAmount && (
                  <p className="text-[11px] text-gray-500">
                    {parseDurationYears(formData.duration)
                      ? `Saved as ${formatTuitionFee(toPerYearFee({
                          amount: formData.localTuitionAmount,
                          currency: formData.localTuitionCurrency,
                          period: formData.localTuitionPeriod
                        }, formData.duration))}`
                      : 'Select duration above to convert to per-year.'}
                  </p>
                )}
              </div>
            </div>

            {/* Nationality-Based Tuition Tiers */}
            <div className="pt-2 border-t border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    Nationality-Specific Tuition Tiers (Optional)
                  </p>
                  <p className="text-[11px] text-gray-500">
                    For universities that charge different tuition fees based on student nationality or region
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNationalityTier}
                  className="h-8 text-xs font-semibold gap-1 border-[#042C53]/20 text-[#042C53]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Nationality Fee
                </Button>
              </div>

              {formData.nationalityTiers?.length > 0 && (
                <div className="space-y-2">
                  {formData.nationalityTiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-[#F9FAFB] p-2 rounded-lg border border-gray-200">
                      <div className="col-span-12 sm:col-span-5">
                        <Input
                          list={`nationality-presets-${index}`}
                          placeholder="Nationality / Region (e.g. ASEAN, India, MENA)"
                          value={tier.nationality}
                          onChange={(e) => updateNationalityTier(index, 'nationality', e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                        <datalist id={`nationality-presets-${index}`}>
                          {NATIONALITY_PRESETS.map(p => (
                            <option key={p} value={p} />
                          ))}
                        </datalist>
                      </div>
                      <div className="col-span-5 sm:col-span-3">
                        <Input
                          inputMode="decimal"
                          placeholder="Amount"
                          value={tier.amount}
                          onChange={(e) => updateNationalityTier(index, 'amount', formatNumberInput(e.target.value))}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <select
                          value={tier.currency || 'MYR'}
                          onChange={(e) => updateNationalityTier(index, 'currency', e.target.value)}
                          className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs"
                        >
                          {FEE_CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <select
                          value={tier.period || 'year'}
                          onChange={(e) => updateNationalityTier(index, 'period', e.target.value)}
                          className="h-8 w-full rounded-md border border-gray-200 bg-white px-1 text-[11px]"
                        >
                          <option value="year">/ yr</option>
                          <option value="semester">/ sem</option>
                          <option value="total">total</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNationalityTier(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Course Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(val) => handleChange('status', val)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (Visible to Students & Agents)</SelectItem>
                <SelectItem value="inactive">Inactive (Hidden)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="course-desc" className="text-xs font-semibold text-gray-700">
              Course Overview & Description
            </Label>
            <Textarea
              id="course-desc"
              rows={3}
              placeholder="Brief summary of program curriculum, eligibility, or prerequisites..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="bg-white resize-none"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 text-xs font-semibold text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-10 text-xs font-semibold bg-[#042C53] hover:bg-[#042C53]/90 text-white min-w-[120px]"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseModal;
