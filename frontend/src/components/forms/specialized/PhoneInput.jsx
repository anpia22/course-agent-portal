import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui/popover';
import { countries } from '../../../lib/countries';

/**
 * Standard PhoneInput with Country Flag and Dial Code selector.
 * Strictly prevents entry of letters and symbols into the phone number.
 */
const PhoneInput = ({
  value = '',
  onChange,
  onBlur,
  onFocus,
  placeholder = '12 345 6789',
  className = '',
  defaultCountry = 'MY',
  disabled = false,
  required = false,
  id,
  name,
  hasError = false,
  error = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Helper to parse existing phone value into country and national number digits
  const parseValue = (val, defCountryCode) => {
    const def =
      countries.find((c) => c.code === defCountryCode) ||
      countries.find((c) => c.code === 'MY') ||
      countries[0];

    if (!val || typeof val !== 'string') {
      return { country: def, number: '' };
    }

    const digits = val.replace(/\D/g, '');
    if (!digits) {
      return { country: def, number: '' };
    }

    // Match longest dial prefix first
    const sorted = [...countries].sort((a, b) => {
      const aLen = a.phone.replace(/\D/g, '').length;
      const bLen = b.phone.replace(/\D/g, '').length;
      return bLen - aLen;
    });

    for (const c of sorted) {
      const cDigits = c.phone.replace(/\D/g, '');
      if (digits.startsWith(cDigits) && digits.length > cDigits.length) {
        return {
          country: c,
          number: digits.slice(cDigits.length),
        };
      }
    }

    return { country: def, number: digits };
  };

  const initial = parseValue(value, defaultCountry);
  const [selectedCountry, setSelectedCountry] = useState(initial.country);
  const [phoneNumber, setPhoneNumber] = useState(initial.number);

  // Sync state if external value changes (e.g. form reset, fetched data)
  useEffect(() => {
    if (value) {
      const parsed = parseValue(value, defaultCountry);
      setSelectedCountry(parsed.country);
      setPhoneNumber(parsed.number);
    } else {
      setPhoneNumber('');
    }
  }, [value, defaultCountry]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [open]);

  // Filter countries by name or phone code
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim().replace(/^\+/, '');
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.phone.replace(/\D/g, '').includes(q)
    );
  }, [searchQuery]);

  const emitChange = (country, number) => {
    if (!onChange) return;
    const cleanDial = country.phone.replace(/\D/g, '');
    const cleanDigits = number.replace(/\D/g, '');
    const fullValue = cleanDigits ? `+${cleanDial}${cleanDigits}` : '';
    onChange(fullValue);
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setOpen(false);
    emitChange(country, phoneNumber);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Strictly allow only numbers (0-9) and control/navigation keys
  const handleKeyDown = (e) => {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Tab',
      'Enter',
      'Home',
      'End',
    ];

    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow keyboard shortcuts (Ctrl/Cmd + A, C, V, X, Z)
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z', 'y'].includes(e.key.toLowerCase())) {
      return;
    }

    // Block any non-digit character (letters, spaces, symbols)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Paste handler: strips letters, symbols and spaces, keeping only digits
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const digitsOnly = pasted.replace(/\D/g, '');
    if (!digitsOnly) return;

    const input = e.target;
    const start = input.selectionStart ?? phoneNumber.length;
    const end = input.selectionEnd ?? phoneNumber.length;
    const nextVal = (phoneNumber.slice(0, start) + digitsOnly + phoneNumber.slice(end)).slice(0, 15);

    setPhoneNumber(nextVal);
    emitChange(selectedCountry, nextVal);
  };

  // Change handler: defense in depth against autofill or virtual keyboards
  const handleNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
    setPhoneNumber(digits);
    emitChange(selectedCountry, digits);
  };

  const isInvalid = Boolean(hasError || error);
  const cleanDialCode = selectedCountry.phone.replace(/\D/g, '');

  return (
    <div
      className={cn(
        'relative flex items-center w-full rounded-lg border bg-white transition text-sm',
        isInvalid
          ? 'border-red-500 ring-2 ring-red-500/20'
          : 'border-slate-200 focus-within:ring-2 focus-within:ring-[#0C447C] focus-within:border-transparent',
        disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
        className
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label="Select country code"
            disabled={disabled}
            className="h-[42px] px-3 rounded-l-lg border-r border-slate-200 flex shrink-0 items-center gap-1.5 hover:bg-slate-50 focus:outline-none text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed select-none"
            title={`${selectedCountry.name} (+${cleanDialCode})`}
          >
            <span className="text-lg leading-none" role="img" aria-label={selectedCountry.name}>
              {selectedCountry.flag}
            </span>
            <span className="text-xs font-semibold text-slate-700">+{cleanDialCode}</span>
            <ChevronsUpDown className="h-3 w-3 text-slate-400" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-0 bg-white shadow-xl border border-slate-200 rounded-xl" align="start">
          {/* Search box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or code..."
              className="w-full text-xs bg-transparent outline-none placeholder:text-slate-400 py-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Country list */}
          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No country found</div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = selectedCountry.code === c.code;
                const dial = c.phone.replace(/\D/g, '');
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:bg-slate-50',
                      isSelected && 'bg-blue-50/70 font-semibold text-[#0C447C]'
                    )}
                  >
                    <span className="text-base shrink-0 leading-none" role="img" aria-label={c.name}>
                      {c.flag}
                    </span>
                    <span className="flex-1 truncate text-slate-800">{c.name}</span>
                    <span className="text-slate-500 shrink-0 font-mono text-[11px]">+{dial}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#0C447C] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      <input
        ref={inputRef}
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="tel-national"
        maxLength={15}
        required={required}
        disabled={disabled}
        value={phoneNumber}
        onChange={handleNumberChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full h-[42px] px-3.5 py-2 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none rounded-r-lg disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default PhoneInput;
