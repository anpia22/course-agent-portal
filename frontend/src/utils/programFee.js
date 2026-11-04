// Program tuition is stored as text such as "MYR 22,000 / year" or
// "Intl: MYR 25,000 / year | Local: MYR 14,000 / year".
// These helpers format fees with currency symbols (including RM / MYR),
// separate International vs Local (Malaysian) student fees, parse nationality-based
// tuition tiers, and calculate agent commission earnings.

export const CURRENCY_SYMBOLS = {
  MYR: 'RM ',
  RM: 'RM ',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$',
  CAD: 'C$',
  NZD: 'NZ$',
  INR: '₹',
  SGD: 'S$',
  AED: 'AED '
};

const parseSingleSegment = (rawSegment) => {
  if (!rawSegment) return null;
  const text = String(rawSegment).trim();
  if (!text) return null;
  const m = text.match(/^(MYR|RM|[A-Z]{3})\s+(.*)$/i);
  const code = m ? m[1].toUpperCase() : null;
  const known = code && CURRENCY_SYMBOLS[code];
  const symbol = known || (code ? `${code} ` : '');
  const numbers = text.match(/\d+(?:,\d{3})*(?:\.\d{1,2})?/g) || [];
  const amount = numbers.length === 1 ? parseFloat(numbers[0].replace(/,/g, '')) : null;
  return {
    text: known ? `${symbol}${m[2]}` : text,
    amount: amount > 0 ? amount : null,
    symbol,
    currency: code === 'RM' ? 'MYR' : (code || 'MYR')
  };
};

// { text, international, local, hasDual, amount, symbol } or null when there is no fee.
export const readFee = (fee) => {
  if (!fee) return null;
  const raw = String(fee).trim();
  if (!raw) return null;

  // Check if formatted with Intl / Local segments separated by "|"
  if (raw.includes('|') || /^(?:Intl|International|Local)\s*:/i.test(raw)) {
    const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);
    let international = null;
    let local = null;

    parts.forEach((part) => {
      const intlMatch = part.match(/^(?:Intl|International)\s*:\s*(.+)$/i);
      const localMatch = part.match(/^Local(?:\s*\(Malaysian\))?\s*:\s*(.+)$/i);
      if (intlMatch) {
        international = parseSingleSegment(intlMatch[1]);
      } else if (localMatch) {
        local = parseSingleSegment(localMatch[1]);
      } else if (!international) {
        international = parseSingleSegment(part);
      }
    });

    if (international && local) {
      return {
        text: `Intl: ${international.text} · Local: ${local.text}`,
        international,
        local,
        hasDual: true,
        amount: international.amount ?? local.amount,
        symbol: international.symbol || local.symbol || 'RM '
      };
    }
    if (local && !international) {
      return {
        text: `Local: ${local.text}`,
        international: null,
        local,
        hasDual: false,
        amount: local.amount,
        symbol: local.symbol || 'RM '
      };
    }
    if (international) {
      return {
        text: `Intl: ${international.text}`,
        international,
        local: null,
        hasDual: false,
        amount: international.amount,
        symbol: international.symbol || 'RM '
      };
    }
  }

  const single = parseSingleSegment(raw);
  if (!single) return null;
  return {
    text: single.text,
    international: single,
    local: null,
    hasDual: false,
    amount: single.amount,
    symbol: single.symbol
  };
};

// Parse "Nationality fees: ASEAN = MYR 18,000 / year; South Asia = MYR 20,000 / year" from description
export const extractNationalityFees = (description) => {
  const tiers = [];
  String(description || '').split('\n').forEach((line) => {
    const m = line.trim().match(/^Nationality fees:\s*(.*)$/i);
    if (!m) return;
    m[1].split(';').map((s) => s.trim()).filter(Boolean).forEach((entry) => {
      const eq = entry.indexOf('=');
      if (eq === -1) return;
      const nationality = entry.slice(0, eq).trim();
      const rawFee = entry.slice(eq + 1).trim();
      const parsed = parseSingleSegment(rawFee);
      if (nationality && rawFee) {
        tiers.push({
          nationality,
          rawFee,
          text: parsed ? parsed.text : rawFee,
          amount: parsed?.amount || null,
          currency: parsed?.currency || 'MYR'
        });
      }
    });
  });
  return tiers;
};

// What the agent earns: the commission percentage of the tuition, e.g. "RM 3,000"
export const earningsFor = (fee, rate) => {
  if (!fee || fee.amount === null || rate == null || Number(rate) <= 0) return null;
  const value = Math.round(fee.amount * Number(rate)) / 100;
  return `${fee.symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};
