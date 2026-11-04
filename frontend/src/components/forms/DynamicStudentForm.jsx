import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { readFee, extractNationalityFees } from '../../utils/programFee';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from "../../components/ui/radio-group";
import { Calendar } from '../../components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { CalendarIcon, GraduationCap, Coins } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import CountrySelector from './specialized/CountrySelector';
import PhoneInput from './specialized/PhoneInput';
import QualificationSelector from './specialized/QualificationSelector';

const DEFAULT_FORM_FIELDS = [
  { id: 'name', label: 'Full Name', type: 'text', required: true, order: 1, placeholder: 'e.g. John Doe' },
  { id: 'email', label: 'Email Address', type: 'email', required: true, order: 2, placeholder: 'e.g. john@example.com' },
  { id: 'phone', label: 'Phone Number', type: 'phone', required: true, order: 3, placeholder: '+60 12 345 6789' },
  {
    id: 'studentType',
    label: 'Student Category (Local / International)',
    type: 'select',
    options: ['International Student', 'Local (Malaysian) Student'],
    required: true,
    order: 3.5,
    placeholder: 'Select student category'
  },
  { id: 'nationality', label: 'Student Nationality', type: 'country', required: false, order: 4, placeholder: 'Select student nationality' },
  { id: 'universityId', label: 'University (Malaysia)', type: 'university', required: true, order: 5 },
  { id: 'courseInterested', label: 'Course', type: 'course', required: true, order: 6 },
  { id: 'education', label: 'Highest Qualification', type: 'qualification', required: true, order: 7 },
  { id: 'notes', label: 'Internal Notes', type: 'paragraph', required: false, order: 8, placeholder: 'Any background notes or remarks...' }
];

// Only these documents are uploaded at registration. Only confirmed applications are registered.
const DOCUMENT_SLOTS = [
  { category: 'Passport', label: 'Passport / IC' },
  { category: 'Photo', label: 'Photo' },
  { category: 'Results', label: 'Results' },
];

const DynamicStudentForm = ({ studentData, onSuccess, defaultUniversityId = '', defaultCourseId = '' }) => {
  const [files, setFiles] = useState({});
  // 'Other documents' can hold several files, each with a name: [{ file, name }]
  const [otherFiles, setOtherFiles] = useState([]);
  const { addStudent, updateStudent, uploadStudentDocument, agents, universities, fetchUniversities, courses, fetchCourses } = useData();
  const { user, isAdmin } = useAuth();
  const [formSchema, setFormSchema] = useState(null);
  const isEditMode = !!studentData;

  // Load universities if empty
  useEffect(() => {
    if (!universities || universities.length === 0) {
      if (typeof fetchUniversities === 'function') {
        fetchUniversities();
      }
    }
  }, [universities, fetchUniversities]);

  // Load courses if empty
  useEffect(() => {
    if (!courses || courses.length === 0) {
      if (typeof fetchCourses === 'function') {
        fetchCourses();
      }
    }
  }, [courses, fetchCourses]);

  const activeFields = DEFAULT_FORM_FIELDS;

  // Generate dynamic Zod schema based on active fields
  useEffect(() => {
    const schemaFields = {};

    activeFields.forEach(field => {
      let fieldSchema;

      switch (field.type) {
        case 'text':
        case 'email':
        case 'phone':
        case 'country':
        case 'university':
        case 'course':
        case 'qualification':
        case 'select':
        case 'radio':
          if (field.required) {
            fieldSchema = z.string().min(1, `${field.label} is required`);
          } else {
            fieldSchema = z.string().optional();
          }

          if (field.type === 'email' || field.label.toLowerCase().includes('email')) {
            if (field.required) {
              fieldSchema = z.string().email('Invalid email address');
            } else {
              fieldSchema = z.string().email('Invalid email address').optional().or(z.literal(''));
            }
          }
          break;
        case 'date':
          fieldSchema = field.required
            ? z.date({ error: `${field.label} is required` })
            : z.date().optional();
          break;
        case 'paragraph':
          fieldSchema = field.required
            ? z.string().min(1, `${field.label} is required`)
            : z.string().optional();
          break;
        default:
          fieldSchema = field.required
            ? z.string().min(1, `${field.label} is required`)
            : z.string().optional();
      }

      if (field.regex) {
        const regexPattern = new RegExp(field.regex);
        fieldSchema = fieldSchema.regex(regexPattern, field.regexError || 'Invalid format');
      }

      schemaFields[field.id] = fieldSchema;
    });

    if (isAdmin()) {
      schemaFields.agentId = z.string().optional();
    }

    setFormSchema(z.object(schemaFields));
  }, [activeFields, isAdmin]);

  // Prepare default values for the form
  const getDefaultValues = () => {
    if (studentData) {
      const values = {};
      if (studentData.customFields) {
        Object.entries(studentData.customFields).forEach(([key, value]) => {
          values[key] = value;
        });
      }
      if (studentData.name) values.name = studentData.name;
      if (studentData.email) values.email = studentData.email;
      if (studentData.phone) values.phone = studentData.phone;
      if (studentData.country) values.country = studentData.country;
      if (studentData.education) values.education = studentData.education;
      if (studentData.courseInterested) values.courseInterested = studentData.courseInterested;
      if (studentData.notes) values.notes = studentData.notes;
      if (studentData.agentId) values.agentId = studentData.agentId;
      if (!values.studentType) values.studentType = 'International Student';
      if (studentData.universityId || studentData.customFields?.universityId) {
        values.universityId = studentData.universityId || studentData.customFields?.universityId;
      }
      return values;
    }
    return {
      studentType: 'International Student',
      nationality: '',
      universityId: defaultUniversityId || '',
      courseInterested: defaultCourseId || ''
    };
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: formSchema ? zodResolver(formSchema) : undefined,
    defaultValues: getDefaultValues()
  });

  useEffect(() => {
    if (!studentData) {
      if (defaultUniversityId) {
        setValue('universityId', defaultUniversityId, { shouldValidate: true, shouldDirty: true });
      }
      if (defaultCourseId) {
        setValue('courseInterested', defaultCourseId, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [defaultUniversityId, defaultCourseId, studentData, setValue]);

  // Update form values when studentData changes
  useEffect(() => {
    if (studentData) {
      const values = getDefaultValues();
      Object.entries(values).forEach(([key, value]) => {
        setValue(key, value);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentData, setValue]);

  const watchedUniversityId = watch('universityId');
  const watchedCourseInterested = watch('courseInterested');
  const watchedStudentType = watch('studentType') || 'International Student';
  const watchedNationality = watch('nationality') || '';

  // Keep studentType and nationality in sync when Malaysia is selected
  useEffect(() => {
    if (watchedStudentType === 'Local (Malaysian) Student' && !watchedNationality) {
      setValue('nationality', 'Malaysia', { shouldDirty: true });
    }
  }, [watchedStudentType, watchedNationality, setValue]);

  const filteredUniversities = useMemo(() => {
    return universities || [];
  }, [universities]);

  // Filter courses based on selected Target University (if one is chosen).
  const filteredCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    const active = courses.filter(c => c.status === 'active' || !c.status);
    if (!watchedUniversityId) return active;
    return active.filter(c => {
      const uniIds = Array.isArray(c.universityIds) && c.universityIds.length > 0
        ? c.universityIds.map(String)
        : (c.universityId ? [String(c.universityId)] : []);
      if (uniIds.length === 0) return true;
      return uniIds.includes(String(watchedUniversityId));
    });
  }, [courses, watchedUniversityId]);

  const selectedCourseObj = useMemo(() => {
    if (!watchedCourseInterested || !courses) return null;
    return courses.find(c => c.name === watchedCourseInterested || String(c.id || c._id) === String(watchedCourseInterested)) || null;
  }, [courses, watchedCourseInterested]);

  const onSubmit = async (data) => {
    try {
      const effectiveAgentId = isAdmin()
        ? (data.agentId || studentData?.agentId || user?.id)
        : user?.id;

      const studentPayload = {
        agentId: effectiveAgentId,
        customFields: {
          ...data,
          studentType: data.studentType || 'International Student',
          nationality: data.nationality || (data.studentType === 'Local (Malaysian) Student' ? 'Malaysia' : '')
        }
      };

      // Map university if selected
      if (data.universityId) {
        const matchedUni = (universities || []).find(u => (u.id === data.universityId || u._id === data.universityId));
        studentPayload.customFields.universityId = data.universityId;
        studentPayload.customFields.university = matchedUni?.name || '';
        studentPayload.customFields.universityName = matchedUni?.name || '';
      }

      // Map course if selected
      if (data.courseInterested) {
        studentPayload.courseInterested = data.courseInterested;
        studentPayload.customFields.courseInterested = data.courseInterested;
        const matchedCourse = (courses || []).find(c => c.name === data.courseInterested || c.id === data.courseInterested);
        if (matchedCourse) {
          studentPayload.customFields.courseId = matchedCourse.id;
        }
      }

      // Map fields to root properties
      activeFields.forEach(field => {
        const val = data[field.id];
        if (!val) return;

        const label = (field.label || '').toLowerCase();
        const idKey = (field.id || '').toLowerCase();

        if (label.includes('name') || idKey === 'name') studentPayload.name = val;
        else if (label.includes('email') || idKey === 'email') studentPayload.email = val;
        else if (label.includes('phone') || label.includes('mobile') || idKey === 'phone') studentPayload.phone = val;
        else if (idKey === 'country') studentPayload.country = val;
        else if (label.includes('city') || idKey === 'city') studentPayload.city = val;
        else if (label.includes('education') || label.includes('qualification') || idKey === 'education') studentPayload.education = val;
        else if (label.includes('course') || idKey === 'courseinterested') studentPayload.courseInterested = val;
        else if (label.includes('note') || idKey === 'notes') studentPayload.notes = val;
      });

      // Direct fallback if standard fields exist on data
      if (data.name) studentPayload.name = data.name;
      if (data.email) studentPayload.email = data.email;
      if (data.phone) studentPayload.phone = data.phone;
      if (data.education) studentPayload.education = data.education;
      if (data.courseInterested) studentPayload.courseInterested = data.courseInterested;
      if (data.notes) studentPayload.notes = data.notes;

      if (isEditMode && studentData) {
        await updateStudent(studentData.id || studentData._id, studentPayload);
        toast.success('Student updated successfully');
      } else {
        studentPayload.country = 'Malaysia';
        const created = await addStudent(studentPayload);
        const newId = created?.id || created?._id || created?.student?.id;
        const picked = DOCUMENT_SLOTS.filter(slot => files[slot.category]);
        const failed = [];
        if (newId) {
          for (const item of otherFiles.filter(o => o.file)) {
            try {
              await uploadStudentDocument(newId, item.file, 'Other', item.name.trim() || item.file.name);
            } catch (_) {
              failed.push(item.name.trim() || item.file.name);
            }
          }
          for (const slot of picked) {
            try {
              await uploadStudentDocument(newId, files[slot.category], slot.category);
            } catch (_) {
              failed.push(slot.label);
            }
          }
        }
        toast.success(created?.applicationWarning ? 'Student registered' : 'Student registered and application submitted');
        if (created?.applicationWarning) toast.warning(created.applicationWarning);
        if (failed.length) toast.error(`Could not upload: ${failed.join(', ')}`, { description: 'Upload them from the student page.' });
        setFiles({});
        setOtherFiles([]);
      }

      if (onSuccess) {
        onSuccess();
      }
      reset();
    } catch (error) {
      console.error('Failed to save student:', error);
    }
  };

  const renderFormField = (field) => {
    const fieldValue = watch(field.id);
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
        if (field.id === 'courseInterested' || field.label?.toLowerCase().includes('course')) {
          return renderFormField({ ...field, type: 'course' });
        }
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type === 'email' ? 'email' : 'text'}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={cn("h-10 text-sm", error ? 'border-red-500' : 'border-gray-200')}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type="email"
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={cn("h-10 text-sm", error ? 'border-red-500' : 'border-gray-200')}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'course': {
        const parsedSelectedFee = selectedCourseObj ? readFee(selectedCourseObj.tuitionFee) : null;
        const selectedNatTiers = selectedCourseObj ? extractNationalityFees(selectedCourseObj.description) : [];
        const isLocalStudent = watchedStudentType === 'Local (Malaysian) Student';
        const matchingNatTier = watchedNationality
          ? selectedNatTiers.find(t => t.nationality.toLowerCase().includes(watchedNationality.toLowerCase()))
          : null;

        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              {watchedUniversityId ? (
                <span className="text-[11px] font-medium text-[#042C53] bg-blue-50 px-2 py-0.5 rounded-md">
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} available
                </span>
              ) : (
                <span className="text-[11px] font-medium text-gray-400">
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} total
                </span>
              )}
            </div>
            <select
              id={field.id}
              {...register(field.id)}
              className={cn(
                "w-full h-10 px-3 py-2 text-sm rounded-lg border outline-none focus:border-[#042C53] bg-white transition-colors",
                error ? 'border-red-500' : 'border-gray-200'
              )}
            >
              <option value="">Select Course</option>
              {fieldValue && !filteredCourses.some(c => c.name === fieldValue) && (
                <option value={fieldValue}>{fieldValue} (Current)</option>
              )}
              {filteredCourses.map(c => {
                const uniCount = (c.universityIds && c.universityIds.length > 0) ? c.universityIds.length : (c.universityId ? 1 : 0);
                let uniLabel = '';
                if (!watchedUniversityId) {
                  if (uniCount === 0) uniLabel = ' (All Universities)';
                  else if (uniCount === 1) {
                    const uniId = c.universityIds?.[0] || c.universityId;
                    const u = universities?.find(x => String(x.id || x._id) === String(uniId));
                    if (u) uniLabel = ` - ${u.name}`;
                  } else {
                    uniLabel = ` (${uniCount} Universities)`;
                  }
                }
                const cFee = readFee(c.tuitionFee);
                let feeHint = '';
                if (cFee) {
                  if (isLocalStudent && cFee.local) feeHint = ` · Local: ${cFee.local.text}`;
                  else if (!isLocalStudent && cFee.international) feeHint = ` · Intl: ${cFee.international.text}`;
                  else feeHint = ` · ${cFee.text}`;
                }
                const labelText = `${c.name}${c.level ? ` (${c.level})` : ''}${uniLabel}${feeHint}`;
                return (
                  <option key={c.id || c._id} value={c.name}>
                    {labelText}
                  </option>
                );
              })}
            </select>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
            {selectedCourseObj && (parsedSelectedFee || selectedNatTiers.length > 0) && (
              <div className="rounded-lg bg-[#F9FAFB] border border-gray-200 px-3 py-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#042C53]" />
                    Applicable Tuition ({isLocalStudent ? 'Local Malaysian' : 'International'}):
                  </span>
                  <span className="font-bold text-[#042C53]">
                    {matchingNatTier
                      ? `${matchingNatTier.text} (${matchingNatTier.nationality})`
                      : isLocalStudent
                        ? (parsedSelectedFee?.local?.text || parsedSelectedFee?.text || 'On request')
                        : (parsedSelectedFee?.international?.text || parsedSelectedFee?.text || 'On request')}
                  </span>
                </div>
                {parsedSelectedFee?.hasDual && (
                  <p className="text-[11px] text-gray-500">
                    Full Schedule — International: <strong>{parsedSelectedFee.international.text}</strong> · Local (Malaysian): <strong>{parsedSelectedFee.local.text}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'university':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              <span className="text-[11px] font-medium text-gray-400">
                {filteredUniversities.length} {filteredUniversities.length === 1 ? 'university' : 'universities'} available
              </span>
            </div>
            <select
              id={field.id}
              {...register(field.id)}
              className={cn(
                "w-full h-10 px-3 py-2 text-sm rounded-lg border outline-none focus:border-[#042C53] bg-white transition-colors",
                error ? 'border-red-500' : 'border-gray-200'
              )}
            >
              <option value="">Select University in Malaysia</option>
              {filteredUniversities.map(u => (
                <option key={u.id || u._id} value={u.id || u._id}>
                  {u.name} {u.city ? `(${u.city})` : ''}
                </option>
              ))}
            </select>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'paragraph':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              rows={3}
              className={cn("text-sm resize-none", error ? 'border-red-500' : 'border-gray-200')}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={fieldValue || ''}
              onValueChange={(value) => setValue(field.id, value, { shouldValidate: true, shouldDirty: true })}
            >
              <SelectTrigger className={cn("h-10 text-sm bg-white", error ? 'border-red-500' : 'border-gray-200')}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'country':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <CountrySelector
              value={fieldValue || ''}
              onChange={(value) => {
                setValue(field.id, value || '', { shouldValidate: true, shouldDirty: true });
                if (field.id === 'nationality' && value === 'Malaysia') {
                  setValue('studentType', 'Local (Malaysian) Student', { shouldValidate: true, shouldDirty: true });
                }
              }}
              placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'qualification':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <QualificationSelector
              value={fieldValue || ''}
              onChange={(value) => setValue(field.id, value)}
              placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <PhoneInput
              value={fieldValue || ''}
              onChange={(value) => setValue(field.id, value)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              defaultCountry={field.defaultCountry || 'MY'}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <RadioGroup
              value={fieldValue || ''}
              onValueChange={(value) => setValue(field.id, value)}
              className={cn("p-2 rounded-md", error ? 'border border-red-500' : '')}
            >
              {(field.options || []).map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                  <Label htmlFor={`${field.id}-${index}`} className="text-sm">{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-10',
                    !fieldValue && 'text-muted-foreground',
                    error && 'border-red-500'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fieldValue ? format(fieldValue, 'PPP') : field.placeholder || 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fieldValue}
                  onSelect={(date) => setValue(field.id, date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={cn("h-10 text-sm", error ? 'border-red-500' : 'border-gray-200')}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-testid="dynamic-student-form">
      {/* If Admin, render Assigned Agent selector */}
      {isAdmin() && !isEditMode && (
        <div className="space-y-2 pb-6 border-b border-gray-200">
          <Label htmlFor="agentId" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Assigned Agent
          </Label>
          <select
            id="agentId"
            {...register('agentId')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#042C53] bg-white"
          >
            <option value="">Admin / Direct Registration</option>
            {(agents || []).map(a => (
              <option key={a.id || a._id} value={a.id || a._id}>
                {a.name} ({a.agencyName || a.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Render all active fields */}
      {activeFields
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(field => renderFormField(field))}

      {!isEditMode && (
        <div className="space-y-3 pt-2 border-t border-gray-200">
          <div>
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Documents</Label>
            <p className="text-xs text-gray-500 mt-1">Optional now. PDF, JPG, PNG or Word, up to 10 MB each.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {DOCUMENT_SLOTS.map(slot => (
              <div key={slot.category} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3">
                <span className="text-sm font-medium text-gray-800 sm:w-36 shrink-0">{slot.label}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFiles(prev => ({ ...prev, [slot.category]: e.target.files?.[0] || null }))}
                  className="text-xs text-gray-500 w-full min-w-0 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#042C53]/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#042C53] hover:file:bg-[#042C53]/20"
                />
              </div>
            ))}
            <div className="px-4 py-3 space-y-2">
              <span className="text-sm font-medium text-gray-800 block">Other documents</span>
              {otherFiles.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) => setOtherFiles(prev => prev.map((o, j) => j === i ? { ...o, name: e.target.value } : o))}
                    placeholder="Name, e.g. English test"
                    maxLength={100}
                    className="sm:w-48 h-9 text-xs"
                  />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setOtherFiles(prev => prev.map((o, j) => j === i ? { ...o, file: e.target.files?.[0] || null } : o))}
                    className="text-xs text-gray-500 flex-1 min-w-0 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#042C53]/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#042C53] hover:file:bg-[#042C53]/20"
                  />
                  <button type="button" className="text-xs font-semibold text-red-600 hover:underline" onClick={() => setOtherFiles(prev => prev.filter((_, j) => j !== i))}>Remove</button>
                </div>
              ))}
              <button type="button" className="text-xs font-semibold text-[#042C53] hover:underline" onClick={() => setOtherFiles(prev => [...prev, { file: null, name: '' }])}>
                + Add a document
              </button>
            </div>
          </div>
        </div>
      )}

      {!isEditMode && (
        <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#042C53] shrink-0" />
          <span>Registering this student will immediately create and submit their university course application.</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-[#042C53] hover:bg-[#0C447C] h-12 text-sm font-bold shadow-sm"
        disabled={isSubmitting}
        data-testid="dynamic-student-submit-btn"
      >
        {isSubmitting
          ? (isEditMode ? 'Updating...' : 'Registering & Submitting Application...')
          : (isEditMode ? 'Update Student' : 'Register Student & Submit Application')}
      </Button>
    </form>
  );
};

export default DynamicStudentForm;
