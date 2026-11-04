import { DISPLAY_STAGE_INFO, PIPELINE_STAGES } from './pipeline';

// A student has no status of their own. Their progress is taken from their applications: the furthest
// visa stage among the live ones (the server sends it as `pipelineStage`, plus `feesPaid`), or
// "Application" when newly registered.

// Order of the journey shown as a stepper
export const STUDENT_JOURNEY = PIPELINE_STAGES;

const NO_APPLICATION = { label: 'Application Submitted', style: 'bg-[#F3F4F6] text-[#4B5563]' };

export const getStageLabel = (stage) => (DISPLAY_STAGE_INFO[stage] || NO_APPLICATION).label;

// The exact stage of a student, as a label and pill style
export const getStudentStageInfo = (student) => {
  const stage = student?.pipelineStage;
  return !stage || stage === 'NoApplication' ? NO_APPLICATION : (DISPLAY_STAGE_INFO[stage] || NO_APPLICATION);
};

// Position on the journey stepper (0 when the student is at initial application)
export const getStudentJourneyIndex = (student) => {
  const idx = STUDENT_JOURNEY.indexOf(student?.pipelineStage);
  return idx === -1 ? 0 : idx;
};

// Five groups used for counters, filters and charts (per client walkthrough [03:51 - 05:36]):
// 1. Application -> 2. Offer Letter Issued -> 3. Fees Paid -> 4. Visa in Process (5%, 15%, 35%, 70%, eVAL, Pickup/Stay, Arrival, Health Check, Registration, Tuition) -> 5. Visa 100% (Issue Invoice)
export const STUDENT_FUNNEL = [
  { key: 'Application', label: 'Application', hint: 'Submitted & under review', color: '#378ADD' },
  { key: 'OfferLetter', label: 'Offer Letter Issued', hint: 'Offer letter received', color: '#0EA5E9' },
  { key: 'FeesPaid', label: 'Fees paid', hint: 'Payment completed', color: '#EF9F27' },
  { key: 'InVisa', label: 'Visa in process', hint: 'Click to view stages', color: '#7F77DD' },
  { key: 'Visa100', label: 'Visa 100%', hint: 'Issue invoice', color: '#1D9E75' },
];

// Detailed sub-stages shown when clicking "Visa in process" (per client walkthrough [04:16 - 05:36])
export const VISA_SUBSTAGE_CHIPS = [
  { key: 'Visa5', label: '5%' },
  { key: 'Visa15', label: '15%' },
  { key: 'Visa35', label: '35%' },
  { key: 'Visa70', label: '70%' },
  { key: 'Visa80', label: '80%' },
  { key: 'VisaApproval', label: 'eVAL Issued' },
  { key: 'SEV', label: 'eVAL Approved' },
  { key: 'Departure', label: 'Airport Pickup & Accommodation' },
  { key: 'Arrival', label: 'Arrival' },
  { key: 'Medical', label: 'Health Check' },
  { key: 'Registration', label: 'Registration' },
  { key: 'FeesPaid', label: 'Tuition Fees Paid' },
  { key: 'Visa100', label: 'Visa 100% · Issue Invoice' },
];

const OFFER_LETTER_STAGES = ['OfferLetter'];
const FEES_PAID_STAGES = ['Payment', 'FeesPaid'];
const IN_VISA_BUCKET = ['Visa5', 'Visa15', 'Visa35', 'Visa70', 'Visa80', 'VisaApproval', 'SEV', 'Departure', 'Arrival', 'Medical', 'Registration'];

export const getFunnelKey = (student) => {
  const stage = student?.pipelineStage || 'Application';
  if (OFFER_LETTER_STAGES.includes(stage)) return 'OfferLetter';
  if (FEES_PAID_STAGES.includes(stage)) return 'FeesPaid';
  if (IN_VISA_BUCKET.includes(stage)) return 'InVisa';
  if (stage === 'Visa100') return 'Visa100';
  return 'Application';
};

export const getFunnelLabel = (student) =>
  (STUDENT_FUNNEL.find((group) => group.key === getFunnelKey(student)) || STUDENT_FUNNEL[0]).label;

// Students who are past the review: offer letter issued, fees paid, in the visa process, or beyond
export const isBeyondApplication = (student) => ['OfferLetter', 'FeesPaid', 'InVisa', 'Visa100'].includes(getFunnelKey(student));

export const hasFeesPaid = (student) => Boolean(student?.feesPaid) || ['Payment', 'FeesPaid', 'Visa100'].includes(student?.pipelineStage);
