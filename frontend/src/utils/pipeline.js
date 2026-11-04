// Visa progress pipeline (mirrors backend/utils/visaPipeline.js):
//   Application -> Eligibility -> Offer Letter -> Payment -> Visa 5% -> 15% -> 35% -> 70% -> 80% -> Visa Approval (EVAL)
//   -> SEV -> Departure Briefing -> Arrival -> Health Check -> Registration -> Tuition Fees Payment -> Visa 100% -> invoice
// The Head of Admission moves students through it; agents watch it and upload the proof of fee payment.

export const PIPELINE_STAGES = [
  'Application', 'Eligibility', 'OfferLetter', 'Payment',
  'Visa5', 'Visa15', 'Visa35', 'Visa70', 'Visa80',
  'VisaApproval', 'SEV', 'Departure', 'Arrival', 'Medical', 'Registration', 'FeesPaid', 'Visa100',
];

// Stages between the application and the tuition payment: the student is in the visa process
export const IN_VISA_STAGES = PIPELINE_STAGES.filter((s) => !['Application', 'FeesPaid', 'Visa100'].includes(s));

export const PIPELINE_STAGE_LABELS = {
  Application: 'Application Submitted',
  Eligibility: 'Eligibility Issued',
  OfferLetter: 'Offer Letter Issued',
  Payment: 'Payment Made (Fees Paid)',
  Visa5: 'Visa 5%',
  Visa15: 'Visa 15%',
  Visa35: 'Visa 35%',
  Visa70: 'Visa 70%',
  Visa80: 'Visa 80%',
  VisaApproval: 'eVAL Issued',
  SEV: 'eVAL Approved (SEV)',
  Departure: 'Airport Pickup & Accommodation',
  Arrival: 'Student Arrival',
  Medical: 'Health Check',
  Registration: 'University Registration',
  FeesPaid: 'Tuition Fees Paid',
  Visa100: 'Visa 100% (Issue Invoice)',
};

// Heading shown on each step card of the stepper, above the stage name. Change the wording here.
export const PIPELINE_STAGE_HEADINGS = {
  Application: 'Application submitted',
  Eligibility: 'Eligibility',
  OfferLetter: 'Offer letter issued',
  Payment: 'Payment made (fees paid)',
  Visa5: 'Visa processing (5%)',
  Visa15: 'Visa processing (15%)',
  Visa35: 'Visa processing (35%)',
  Visa70: 'Visa processing (70%)',
  Visa80: 'Visa processing (80%)',
  VisaApproval: 'eVAL issued',
  SEV: 'eVAL approved / SEV',
  Departure: 'Airport pickup & accommodation',
  Arrival: 'Arrival',
  Medical: 'Health check',
  Registration: 'Registration',
  FeesPaid: 'Tuition fees paid',
  Visa100: 'Visa 100% · Issue invoice',
};

// The one bucket an application counts in: its stage
export const getDisplayStage = (application) => application?.pipelineStage || 'Application';

const GREY = 'bg-[#F3F4F6] text-[#4B5563]';
const BLUE = 'bg-[#E6F1FB] text-[#0C447C]';
const PURPLE = 'bg-[#EEEDFE] text-[#3C3489]';
const TEAL = 'bg-[#E1F5EE] text-[#085041]';

export const DISPLAY_STAGE_INFO = {
  Application: { label: PIPELINE_STAGE_LABELS.Application, style: GREY },
  Eligibility: { label: PIPELINE_STAGE_LABELS.Eligibility, style: GREY },
  OfferLetter: { label: PIPELINE_STAGE_LABELS.OfferLetter, style: GREY },
  Payment: { label: PIPELINE_STAGE_LABELS.Payment, style: GREY },
  Visa5: { label: 'Visa 5%', style: BLUE },
  Visa15: { label: 'Visa 15%', style: BLUE },
  Visa35: { label: 'Visa 35%', style: BLUE },
  Visa70: { label: 'Visa 70%', style: PURPLE },
  Visa80: { label: 'Visa 80%', style: PURPLE },
  VisaApproval: { label: 'eVAL Issued', style: PURPLE },
  SEV: { label: 'eVAL Approved (SEV)', style: PURPLE },
  Departure: { label: 'Airport Pickup & Accommodation', style: TEAL },
  Arrival: { label: 'Arrival', style: TEAL },
  Medical: { label: 'Health Check', style: TEAL },
  Registration: { label: 'Registration', style: TEAL },
  FeesPaid: { label: 'Tuition Fees Paid', style: 'bg-[#FAEEDA] text-[#633806]' },
  Visa100: { label: 'Visa 100% (Issue Invoice)', style: 'bg-[#EAF3DE] text-[#27500A]' },
};

export const getDisplayStageInfo = (application) => DISPLAY_STAGE_INFO[getDisplayStage(application)] || DISPLAY_STAGE_INFO.Application;

// The Head of Admission (or super admin) moves stages and reviews the fee proof
export const canManagePipeline = (user) =>
  user?.role === 'admin' && (!user.staffRole || user.staffRole === 'head_admission');

// Applications that are not live cannot move through the pipeline
export const isPipelineActive = (application) => !['Draft', 'Rejected', 'Withdrawn'].includes(application?.status);

export const FEE_STATUS_LABELS = {
  Pending: 'Not paid yet',
  ProofSubmitted: 'Proof uploaded, waiting for review',
  Accepted: 'Paid and confirmed',
  Rejected: 'Proof rejected',
};
