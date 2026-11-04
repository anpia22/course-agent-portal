import React, { useState } from 'react';
import { Copy, Check, QrCode, Send } from 'lucide-react';
import { toast } from 'sonner';
import InviteAgentDialog from '../../components/modals/InviteAgentDialog';

// Design: "Roles & Responsibilities page-html/Main.dc.html".
// Keep the content in sync with the backend (middleware/auth.js, routes/*.js, agentReviewController.js):
// the backend enforces permissions, this page only explains them.
const ROLE = {
  agent: { name: 'Agent', color: '#475569', tint: '#F1F5F9' },
  am: { name: 'Account Manager', color: '#1D4ED8', tint: '#EFF6FF' },
  hor: { name: 'Head of Recruitment', color: '#6D28D9', tint: '#F5F3FF' },
  hoa: { name: 'CEO / Head of Admission', color: '#B45309', tint: '#FFFBEB' },
  acc: { name: 'Accounts/Finance', color: '#047857', tint: '#ECFDF5' },
  sa: { name: 'Super Admin', color: '#0F172A', tint: '#E2E8F0' },
};

const ROLE_CARDS = [
  {
    key: 'agent',
    purpose: 'Brings in students and earns commission.',
    points: [
      'Create a login from the Account Manager invite link or QR code',
      'Fill the 3-step profile (Company & PIC, Bank details) and upload 1 company document',
      'Sign the contract and upload the signed copy',
      'Register students (confirmed applications only — Malaysian universities)',
      'Upload passport, photo, academic results and other documents',
      'Make acceptance / visa payment and upload tuition fee payment proof',
      'Raise/upload invoices and fix any marked Needs amendment',
      'View assigned Malaysian universities, programs and published commissions',
    ],
  },
  {
    key: 'am',
    purpose: 'Brings in dedicated agents, looks after them, and verifies student documents.',
    points: [
      'Send personal invite link / QR code (agents auto-assign to that Account Manager)',
      'Start the review of a new agent application and recommend to Head of Recruitment',
      'Verify student registration documents (passport, photo, results) and move to application stage',
      'Send an agent or student file back for correction when documents are incomplete',
      'Works only with their dedicated assigned agents and their students',
    ],
  },
  {
    key: 'hor',
    purpose: 'Checks that new agents are genuine and oversees all Account Managers.',
    points: [
      'Verify every agent onboarding document',
      'Approve or reject an agent application at recruitment verification stage',
      'Send an application back for correction',
      'View all agents and students across the portal and filter by Account Manager',
    ],
  },
  {
    key: 'hoa',
    purpose: 'Makes the final call on agents, admission offer letters, visa processing and invoices.',
    points: [
      'Give final approval (CEO / Head of Admission) and issue the Agent ID',
      'Issue contracts and auto-issue branded E-Certificates (choosing agency name, issue date, validity)',
      'Collect uploaded student documents, check eligibility and issue Offer Letters',
      'Advance student applications through Visa stages (5% → 15% → 35% → 70% → eVAL → Airport Pickup & Accommodation → Arrival → Health Check → Registration)',
      'Accept or reject tuition fee payment proof and complete Visa 100% endorsement',
      'Approve invoices or mark Needs amendment, and manage Malaysian universities, programs & commissions',
    ],
  },
  {
    key: 'acc',
    purpose: 'Handles university clearance and releases agent commission payouts.',
    points: [
      'Record payments received from universities (University Paid)',
      'Process approved invoices and release payment to agent after university clearance',
      'Upload bank transfer / payment slip',
      'Cancel or replace a payoff when required',
    ],
  },
  {
    key: 'sa',
    purpose: 'Runs the system. Can do every task.',
    points: [
      'Manage staff accounts and roles',
      'See the Audit Log (strictly Super Admin only)',
      'Delete agents and override any workflow stage when needed',
      'Step in for any role across the portal',
    ],
  },
];

const PHASES = [
  {
    title: 'Agent joins',
    result: 'Ends with the Agent ID issued.',
    steps: [
      ['am', 'Sends personal invite link or QR code (agent is automatically assigned to this Account Manager)'],
      ['agent', 'Creates a login from the link / QR code'],
      ['agent', 'Completes 3-step profile (Company & PIC, Bank details) and uploads 1 official document'],
      ['am', 'Reviews the application and recommends it'],
      ['hor', 'Verifies the uploaded document'],
      ['hoa', 'CEO / Head of Admission gives final approval and issues the Agent ID'],
    ],
    note: 'Any reviewer can send the application back to the agent for correction. Head of Recruitment or CEO / Head of Admission can reject it.',
  },
  {
    title: 'Agent is activated',
    result: 'Ends with the agent able to add students.',
    steps: [
      ['hoa', 'Issues the contract'],
      ['agent', 'Signs the contract and uploads the signed copy'],
      ['hoa', 'CEO / Head of Admission auto-issues the E-Certificate (choosing agency name, issue date, and validity). The agent is now active.'],
    ],
    note: 'The agent can view and download the contract and auto-issued E-Certificate from their dashboard at any time.',
  },
  {
    title: 'Student admission and visa',
    result: 'Ends with final endorsement (Visa 100%) and Issue Invoice.',
    stages: true,
    steps: [
      ['agent', 'Registers the student and uploads passport, photo, academic results and other documents'],
      ['am', 'Account Manager verifies the student documents and moves the file to the application stage'],
      ['hoa', 'Admission collects the uploaded documents, checks eligibility and issues the Offer Letter'],
      ['agent', 'Makes acceptance and initial visa fee payment (Payment / Fees Paid)'],
      ['hoa', 'Admission starts working on Visa and moves through: 5% → 15% → 35% → 70% → eVAL Issued → eVAL Approved → Airport Pickup & Accommodation → Arrival → Health Check → Registration'],
      ['agent', 'Uploads proof of tuition fee payment'],
      ['hoa', 'Admission accepts the tuition fee proof and gives final endorsement (Visa 100%), unlocking Issue Invoice'],
    ],
    note: 'Only confirmed applications come in, not enquiries. All partner universities are in Malaysia.',
  },
  {
    title: 'Invoice and payment',
    result: 'Ends with Release Payment to Agent After University Clearance.',
    invoice: true,
    steps: [
      ['agent', 'Uploads / raises the commission invoice for the student (after Visa 100%)'],
      ['hoa', 'Approves it, or marks it Needs amendment with a note. Approval creates the agent payoff.'],
      ['acc', 'Records the payment received from the university (University paid)'],
      ['acc', 'Processes the invoice and releases payment to the agent after university clearance (uploading the payment slip)'],
    ],
    note: 'If the university has not paid yet, Head of Admission can allow early payment. Accounts/Finance can cancel a payoff and issue a replacement.',
  },
];

// Numbered across groups, matching the client walkthrough sequence.
const STAGE_GROUPS = (() => {
  let n = 0;
  const number = (names) => names.map((name) => ({ n: ++n, name }));
  return [
    {
      label: 'APPLICATION & OFFER',
      stages: number([
        'Application submitted',
        'Eligibility issued',
        'Offer letter issued',
        'Acceptance & payment made (fees paid)',
      ]),
    },
    {
      label: 'VISA IN PROCESS',
      stages: number([
        'Visa 5%',
        'Visa 15%',
        'Visa 35%',
        'Visa 70%',
        'Visa 80%',
        'eVAL issued',
        'eVAL approved / SEV',
      ]),
    },
    {
      label: 'ARRIVAL & CAMPUS',
      stages: number([
        'Airport pickup & accommodation bookings',
        'Student arrival',
        'Health check',
        'University registration',
      ]),
    },
    {
      label: 'FINISH & INVOICE',
      stages: number([
        'Tuition fees paid',
        'Visa 100% (final endorsement)',
        'Issue invoice',
      ]),
    },
  ];
})();

const INVOICE_STATUS = [
  'Invoice submitted',
  'Needs amendment (if correction needed)',
  'University paid',
  'Invoice processing',
  'Invoice paid (Release Payment to Agent After University Clearance)',
];

const FILTERS = [
  { key: 'all', label: 'All roles' },
  ...['agent', 'am', 'hor', 'hoa', 'acc'].map((k) => ({ key: k, label: ROLE[k].name })),
];

const buildPlainTextSummary = () => {
  const lines = [
    'Q-STUDY PORTAL — ROLES & RESPONSIBILITIES (EDITABLE TEXT FOR AMENDMENT)',
    '======================================================================',
    '',
    '1. WHO DOES WHAT',
    '----------------',
  ];
  ROLE_CARDS.forEach((c) => {
    const r = ROLE[c.key];
    lines.push(`\n[${r.name}] — ${c.purpose}`);
    c.points.forEach((pt) => lines.push(`  - ${pt}`));
  });
  lines.push('\n\n2. STEP-BY-STEP WORKFLOW');
  lines.push('------------------------');
  let n = 0;
  PHASES.forEach((ph, idx) => {
    lines.push(`\nPhase ${idx + 1}: ${ph.title} (${ph.result})`);
    ph.steps.forEach(([rk, text]) => {
      n += 1;
      lines.push(`  ${n}. ${ROLE[rk].name}: ${text}`);
    });
    lines.push(`  Note: ${ph.note}`);
  });
  lines.push('\n\n3. APPLICATION & VISA STAGES IN ORDER');
  lines.push('-------------------------------------');
  STAGE_GROUPS.forEach((g) => {
    lines.push(`\n${g.label}:`);
    g.stages.forEach((st) => lines.push(`  ${st.n}. ${st.name}`));
  });
  lines.push('\n\n4. INVOICE & PAYOFF STATUS IN ORDER');
  lines.push('-----------------------------------');
  lines.push(`  ${INVOICE_STATUS.join(' -> ')}`);
  return lines.join('\n');
};

const RolesGuidePage = () => {
  const [sel, setSel] = useState('all');
  const [copiedText, setCopiedText] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const isOn = (key) => sel === 'all' || sel === key;
  let stepNo = 0;

  const sampleRegUrl = `${window.location.origin}/login`;

  const handleCopyAllText = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainTextSummary());
      setCopiedText(true);
      toast.success('Copied full Roles & Responsibilities text to clipboard for easy amendment');
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      toast.error('Could not copy text automatically');
    }
  };

  return (
    <div className="mx-auto flex flex-col gap-12 py-8 md:py-10 px-4" style={{ maxWidth: 1120 }}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[13px] text-slate-600">Help / Roles and Responsibilities</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#042C53] bg-[#E6F1FB] px-3.5 py-2 text-xs font-semibold text-[#042C53] hover:bg-[#d5e8fa] transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Generate Agent Invite Link & QR Code
            </button>
            <button
              type="button"
              onClick={handleCopyAllText}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Copy plain text so you can paste and amend in WhatsApp, Word, or Email"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedText ? 'Copied Text!' : 'Copy All Text (For Amendment)'}
            </button>
          </div>
        </div>
        <h1 className="m-0 text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-slate-900">Roles and Responsibilities</h1>
        <p className="m-0 max-w-[680px] text-base leading-normal text-slate-600">
          Who does what in Q-Study, and in what order. Pick a role to see only their work, or copy the text above to make amendments.
        </p>
        <div role="group" aria-label="Filter by role" className="flex flex-wrap gap-2 pt-2">
          {FILTERS.map((f) => {
            const on = sel === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => setSel(f.key)}
                className="min-h-[40px] cursor-pointer rounded-full px-4 text-sm font-semibold"
                style={{ border: `1px solid ${on ? '#0F172A' : '#CBD5E1'}`, background: on ? '#0F172A' : '#FFFFFF', color: on ? '#FFFFFF' : '#1E293B' }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* First Thing: How We Give to Agents — Registration Guide & QR Code */}
      <section aria-labelledby="agent-reg-guide" className="flex flex-col gap-5 rounded-xl border border-[#B5D4F4] bg-[#F8FBFF] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#042C53] flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" /> Agent Onboarding & QR Registration Guide
            </span>
            <h2 id="agent-reg-guide" className="m-0 text-[20px] font-bold text-slate-900">
              How to Register Guide (Scan QR Code or Open Personal Link)
            </h2>
            <p className="m-0 text-sm text-slate-600 max-w-2xl">
              Every Account Manager has a personal invite link and QR code. When an agent scans the QR code or opens the link given by an Account Manager, the agent is <strong>automatically assigned</strong> to that Account Manager.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shrink-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(sampleRegUrl)}`}
              alt="Portal QR Code"
              className="w-20 h-20 rounded border border-slate-100 p-1"
            />
            <div className="text-xs text-slate-600 space-y-1.5 max-w-[200px]">
              <div className="font-bold text-slate-900">Scan QR to Register</div>
              <p className="m-0 text-[11px] leading-snug">
                Click below to generate a personal single-use link &amp; QR code for a new agent.
              </p>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="text-[11px] font-bold text-[#042C53] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" /> Send Invite Link &amp; QR →
              </button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#042C53] mb-1">Step 1 · Scan QR &amp; Company Profile</div>
            <p className="m-0 text-xs text-slate-600 leading-relaxed">
              Agent scans the QR code or opens the invite link, creates their login, and enters <strong>Agency Legal Name first</strong>, Registration Number, Country, Address, and Person-in-Charge (PIC) details.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#042C53] mb-1">Step 2 · Bank Particulars</div>
            <p className="m-0 text-xs text-slate-600 leading-relaxed">
              Agent enters Corporate Bank Name, Branch Address, Beneficiary Name, Account Number / IBAN, and SWIFT / BIC code for commission payouts, and signs the digital declaration.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#042C53] mb-1">Step 3 · Upload 1 Document &amp; Auto E-Cert</div>
            <p className="m-0 text-xs text-slate-600 leading-relaxed">
              Agent uploads any <strong>ONE</strong> official document (Company Profile, SSM / Business Registration, or Director Passport). After AM → HoR → CEO/HoA approval and signed contract, the <strong>E-Certificate is auto-issued</strong>.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="who" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 id="who" className="m-0 text-[22px] font-bold text-slate-900">Who does what</h2>
          <p className="m-0 text-[15px] text-slate-600">Each role and the tasks it owns.</p>
        </div>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {ROLE_CARDS.map((card) => {
            const r = ROLE[card.key];
            return (
              <article
                key={card.key}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 transition-opacity duration-200"
                style={{ opacity: isOn(card.key) ? 1 : 0.35, boxShadow: sel === card.key ? `0 0 0 2px ${r.color}` : 'none' }}
              >
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-3 w-3 flex-none rounded" style={{ background: r.color }} />
                  <h3 className="m-0 text-[17px] font-bold text-slate-900">{r.name}</h3>
                </div>
                <p className="m-0 text-sm leading-normal text-slate-600">{card.purpose}</p>
                <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-slate-100 p-0 pt-4">
                  {card.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm leading-[1.45] text-slate-800">
                      <span aria-hidden="true" className="font-bold" style={{ color: r.color }}>-</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="flow" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 id="flow" className="m-0 text-[22px] font-bold text-slate-900">The flow, step by step</h2>
          <p className="m-0 text-[15px] text-slate-600">
            From a new agent joining to the agent getting paid. Every step is logged with its date, and each handoff sends an email.
          </p>
        </div>

        {PHASES.map((ph, i) => (
          <div key={ph.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-900 text-[15px] font-bold text-white">{i + 1}</span>
              <div className="flex flex-col gap-0.5">
                <h3 className="m-0 text-[17px] font-bold text-slate-900">{ph.title}</h3>
                <p className="m-0 text-sm text-slate-600">{ph.result}</p>
              </div>
            </div>

            <ol className="m-0 flex list-none flex-col px-6 py-2">
              {ph.steps.map(([role, text]) => {
                const r = ROLE[role];
                stepNo += 1;
                return (
                  <li
                    key={stepNo}
                    className="-mx-3 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border-b border-slate-100 px-3 py-3.5 transition-opacity duration-200"
                    style={{ opacity: isOn(role) ? 1 : 0.35, background: sel === role ? r.tint : 'transparent' }}
                  >
                    <span className="w-6 text-[13px] font-semibold tabular-nums text-slate-500">{stepNo}</span>
                    <span
                      className="min-w-[175px] rounded-md px-2.5 py-1 text-center text-xs font-semibold"
                      style={{ background: r.tint, color: r.color }}
                    >
                      {r.name}
                    </span>
                    <span className="min-w-[200px] flex-1 basis-[280px] text-[15px] leading-[1.45] text-slate-900">{text}</span>
                  </li>
                );
              })}
            </ol>

            {ph.stages && (
              <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5">
                <div className="text-[13px] font-semibold text-slate-900">Application &amp; Visa stages, in order</div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {STAGE_GROUPS.map((g) => (
                    <div key={g.label} className="flex flex-col gap-2">
                      <div className="text-[11px] font-bold tracking-[0.08em] text-slate-600">{g.label}</div>
                      {g.stages.map((st) => (
                        <div key={st.n} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-800">
                          <span className="w-[18px] text-[11px] font-bold tabular-nums text-slate-500">{st.n}</span>
                          <span>{st.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ph.invoice && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5">
                <div className="text-[13px] font-semibold text-slate-900">Invoice status, in order</div>
                <div className="flex flex-wrap items-center gap-2">
                  {INVOICE_STATUS.map((name, idx) => (
                    <React.Fragment key={name}>
                      <span className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800">{name}</span>
                      {idx < INVOICE_STATUS.length - 1 && <span aria-hidden="true" className="text-sm text-slate-400">→</span>}
                    </React.Fragment>
                  ))}
                </div>
                <div className="text-[13px] leading-normal text-slate-600">
                  A problem invoice is marked <strong style={{ color: '#B45309' }}>Needs amendment</strong> with a note, never Rejected. The agent fixes it and sends it again.
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 px-6 py-3.5 text-[13px] leading-normal text-slate-600" style={{ background: '#FCFCFD' }}>
              {ph.note}
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 pt-5 text-[13px] text-slate-500">
        Super Admin can do every task on this page, plus manage staff accounts, see the Audit Log and delete agents.
      </footer>

      <InviteAgentDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
};

export default RolesGuidePage;
