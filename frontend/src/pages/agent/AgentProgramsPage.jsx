import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  Search,
  GraduationCap,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  BookOpen,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import UniversityLogo from '../../components/university/UniversityLogo';
import { courseAPI, universityAPI, formatApiError } from '../../utils/api';
import { readFee, extractNationalityFees } from '../../utils/programFee';
import { toast } from 'sonner';

const LEVELS = [
  { value: 'Foundation', label: 'Foundation' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Bachelor', label: 'Bachelor / Degree' },
  { value: 'Master', label: 'Master' },
  { value: 'PhD', label: 'PhD / Doctorate' },
  { value: 'Certificate', label: 'Certificate' },
];

const SUBJECT_FIELDS = [
  { value: 'Business', label: 'Business & Management' },
  { value: 'Information Technology', label: 'IT & Computer Science' },
  { value: 'Accounting', label: 'Accounting & Finance' },
  { value: 'Engineering', label: 'Engineering & Built Environment' },
  { value: 'Hospitality', label: 'Hospitality, Tourism & Culinary' },
  { value: 'Health', label: 'Allied Health, Nursing & Pharmacy' },
  { value: 'Arts', label: 'Arts, Design & Media' },
  { value: 'Law', label: 'Law & Social Sciences' },
];

const loadAllUniversities = async () => {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data } = await universityAPI.getAll({ page, limit: 100, status: 'active', envelope: 'true' });
    all.push(...(data.universities || []));
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return all;
};

const AgentProgramsPage = () => {
  const navigate = useNavigate();

  const [programs, setPrograms] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [debouncedSearch, flushSearch] = useDebouncedValue(searchQuery);
  const requestIdRef = useRef(0);

  useEffect(() => {
    loadAllUniversities()
      .then(setUniversities)
      .catch((error) => toast.error('Failed to load universities', { description: formatApiError(error) }));
  }, []);

  const loadPrograms = useCallback(async (page = 1) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (levelFilter !== 'all') params.level = levelFilter;
      if (fieldFilter !== 'all') params.department = fieldFilter;
      if (universityFilter !== 'all') params.universityId = universityFilter;

      const { data } = await courseAPI.getAll(params);
      if (requestId !== requestIdRef.current) return;
      setPrograms(data.courses || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || page);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      toast.error('Failed to load programs', { description: formatApiError(error) });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, levelFilter, fieldFilter, universityFilter, limit]);

  useEffect(() => {
    loadPrograms(1);
  }, [loadPrograms]);

  const handleReset = () => {
    setSearchQuery('');
    flushSearch('');
    setLevelFilter('all');
    setFieldFilter('all');
    setUniversityFilter('all');
  };

  const apply = (program) => {
    const university = program.university;
    navigate(university
      ? `/agent/students?action=register&university=${university.id}&course=${program.id}`
      : `/agent/students?action=register&course=${program.id}`);
  };

  const hasFilters = searchQuery || levelFilter !== 'all' || fieldFilter !== 'all' || universityFilter !== 'all';

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 bg-[#F9FAFB] min-h-screen space-y-4 sm:space-y-6" data-testid="agent-programs-page">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827] font-['Outfit'] tracking-tight">
            Programs &amp; Courses
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium max-w-2xl">
            Search Malaysian university programs by qualification level, subject field, or institution, then apply directly.
          </p>
        </div>
        <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3 py-1.5 sm:py-2 rounded-lg font-medium w-fit shrink-0">
          <span className="font-bold text-[#042C53]">{totalCount}</span> {totalCount === 1 ? 'program' : 'programs'}
        </div>
      </div>

      {/* ── Filters Card ── */}
      <Card className="border-[#E5E7EB] bg-white shadow-none rounded-2xl">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <form
            onSubmit={(e) => { e.preventDefault(); flushSearch(searchQuery); }}
            className="flex flex-col lg:flex-row gap-2.5 sm:gap-3"
          >
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by program name, code or subject..."
                className="pl-9 pr-8 text-xs bg-[#F9FAFB] border-gray-200 h-10 rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); flushSearch(''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-row items-center gap-2 w-full lg:w-auto">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full lg:w-[160px] text-xs bg-[#F9FAFB] border-gray-200 h-10 lg:h-9 rounded-xl lg:rounded-lg">
                  <SelectValue placeholder="Program Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Program Levels</SelectItem>
                  {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={fieldFilter} onValueChange={setFieldFilter}>
                <SelectTrigger className="w-full lg:w-[180px] text-xs bg-[#F9FAFB] border-gray-200 h-10 lg:h-9 rounded-xl lg:rounded-lg">
                  <SelectValue placeholder="Course / Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subject Fields</SelectItem>
                  {SUBJECT_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={universityFilter} onValueChange={setUniversityFilter}>
                <SelectTrigger className="w-full lg:w-[190px] text-xs bg-[#F9FAFB] border-gray-200 h-10 lg:h-9 rounded-xl lg:rounded-lg">
                  <SelectValue placeholder="University" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All Universities</SelectItem>
                  {universities.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 col-span-1 sm:col-span-3 lg:col-span-1 pt-1 sm:pt-0">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-semibold h-10 lg:h-9 px-5 rounded-xl lg:rounded-lg flex-1 lg:flex-initial justify-center"
                >
                  Search
                </Button>
                {hasFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs font-medium h-10 lg:h-9 px-3 rounded-xl lg:rounded-lg border-gray-200 text-gray-600 hover:text-gray-900 justify-center"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </form>

          {/* Quick Level Filter Chips (Horizontal swipe on mobile) */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 overflow-x-auto no-scrollbar scroll-row pb-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Level:</span>
            <button
              type="button"
              onClick={() => setLevelFilter('all')}
              className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-colors shrink-0 ${
                levelFilter === 'all' ? 'bg-[#042C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevelFilter(l.value)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-colors shrink-0 ${
                  levelFilter === l.value ? 'bg-[#042C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Programs List ── */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
          <p className="text-xs text-gray-500 mt-3 font-medium">Loading programs...</p>
        </div>
      ) : programs.length === 0 ? (
        <Card className="border-[#E5E7EB] bg-white shadow-none rounded-2xl">
          <CardContent className="text-center py-16 text-gray-500">
            <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-sm text-gray-700">No programs found</p>
            <p className="text-xs text-gray-400 mt-1">
              {hasFilters ? 'Try a different search or clear the filters.' : 'No programs are available to you yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {programs.map((program) => {
            const fee = readFee(program.tuitionFee);
            const natTiers = extractNationalityFees(program.description);
            const extra = (program.universityIds || []).length - 1;
            return (
              <div
                key={program.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-[#E5E7EB] hover:border-[#042C53]/40 hover:shadow-md transition-all p-4 sm:p-6 flex flex-col md:flex-row md:items-center gap-4 sm:gap-5"
              >
                {/* ── Left / Main Program Details ── */}
                <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3">
                  {/* Chips Row */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {program.level && (
                      <span className="inline-flex items-center gap-1.5 bg-[#EEF2FF] text-[#1E3A8A] text-[11px] sm:text-xs font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg">
                        <GraduationCap size={13} /> {program.level}
                      </span>
                    )}
                    {program.duration && (
                      <span className="inline-flex items-center gap-1.5 bg-[#F3F4F6] text-gray-700 text-[11px] sm:text-xs font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg">
                        <Clock size={13} /> {program.duration}
                      </span>
                    )}
                    {program.code && (
                      <span className="border border-gray-200 text-gray-600 text-[11px] sm:text-xs font-mono font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg">
                        {program.code}
                      </span>
                    )}
                    {natTiers.length > 0 && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                        Nationality Rates ({natTiers.length})
                      </span>
                    )}
                  </div>

                  {/* Program Title */}
                  <h2 className="text-base sm:text-xl font-bold text-[#111827] font-['Outfit'] leading-snug">
                    <button
                      type="button"
                      onClick={() => navigate(`/agent/programs/${program.id}`)}
                      className="text-left hover:text-[#042C53] hover:underline transition-colors"
                    >
                      {program.name}
                    </button>
                  </h2>

                  {/* University / Provider */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 flex-wrap">
                    {program.university ? (
                      <>
                        <UniversityLogo university={program.university} size="sm" className="shrink-0" />
                        <button
                          type="button"
                          onClick={() => navigate(`/agent/universities/${program.university.id}`)}
                          className="font-medium hover:text-[#042C53] hover:underline"
                        >
                          {program.university.name}
                        </button>
                        <span className="text-gray-300">•</span>
                        <span>Malaysia</span>
                        {extra > 0 && (
                          <Badge variant="outline" className="text-[10px] font-semibold py-0">
                            +{extra} more
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Building2 size={15} className="text-gray-400 shrink-0" /> Offered by partner universities
                      </span>
                    )}
                  </div>

                  {program.department && (
                    <p className="text-[11px] sm:text-xs text-gray-400 truncate">{program.department}</p>
                  )}
                </div>

                {/* ── Right / Bottom: Tuition Fee & Actions ── */}
                <div className="pt-3.5 border-t border-gray-100 md:pt-0 md:border-t-0 md:pl-6 md:border-l border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5 shrink-0">
                  {/* Fee Section */}
                  <div className="flex items-center justify-between md:block">
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                      Tuition Fee
                    </span>
                    {fee ? (
                      fee.hasDual ? (
                        <div className="flex items-center gap-2 md:space-y-1 md:block mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-[#042C53]">
                              Intl
                            </span>
                            <span className="text-sm sm:text-base font-bold text-[#111827] font-['Outfit'] whitespace-nowrap">
                              {fee.international.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                              Local
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-emerald-800 font-['Outfit'] whitespace-nowrap">
                              {fee.local.text}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-lg sm:text-2xl font-bold text-[#111827] font-['Outfit'] mt-0.5 whitespace-nowrap">
                          {fee.text}
                        </p>
                      )
                    ) : (
                      <p className="text-lg sm:text-2xl font-bold text-[#111827] font-['Outfit'] mt-0.5 whitespace-nowrap">
                        On request
                      </p>
                    )}
                  </div>

                  {/* Actions: Full 2-column touch buttons on mobile, inline on desktop */}
                  <div className="grid grid-cols-2 md:flex items-center gap-2 sm:gap-2.5 w-full md:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/agent/programs/${program.id}`)}
                      className="h-10 sm:h-11 rounded-xl px-4 text-xs sm:text-sm font-semibold border-gray-200 hover:border-[#042C53] hover:text-[#042C53] justify-center"
                    >
                      Details
                    </Button>
                    <Button
                      onClick={() => apply(program)}
                      className="h-10 sm:h-11 rounded-xl px-4 sm:px-5 bg-[#042C53] hover:bg-[#0C447C] text-white text-xs sm:text-sm font-semibold gap-1.5 justify-center shadow-xs"
                    >
                      Apply now <ArrowUpRight size={15} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalCount > 0 && (
        <div className="px-1 pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="text-center sm:text-left">
            Showing {programs.length} of {totalCount} programs · Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPrograms(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="flex-1 sm:flex-initial h-9 px-3 text-xs border-gray-200 bg-white hover:bg-gray-50"
            >
              <ChevronLeft size={14} className="mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPrograms(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="flex-1 sm:flex-initial h-9 px-3 text-xs border-gray-200 bg-white hover:bg-gray-50"
            >
              Next <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentProgramsPage;
