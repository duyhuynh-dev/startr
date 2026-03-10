/**
 * Market Selection – light theme
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { SUPPORTED_MARKETS } from '@/lib/constants/markets';

export interface MarketAutocompleteProps {
  value: string[];
  onChange: (markets: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  helperText?: string;
}

export function MarketAutocomplete({
  value = [],
  onChange,
  label = 'Focus Markets',
  placeholder = 'Search and select markets...',
  className = '',
  helperText = 'Select from supported markets for matching',
}: MarketAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMarkets, setFilteredMarkets] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMarkets(SUPPORTED_MARKETS.filter((m) => !value.includes(m)).slice(0, 10));
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    setFilteredMarkets(
      SUPPORTED_MARKETS.filter((m) => !value.includes(m) && m.toLowerCase().includes(q)).slice(0, 10)
    );
  }, [searchQuery, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (market: string) => {
    if (!value.includes(market)) onChange([...value, market]);
    setSearchQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemove = (m: string) => onChange(value.filter((v) => v !== m));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && searchQuery === '' && value.length > 0) {
      handleRemove(value[value.length - 1]);
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && filteredMarkets.length > 0) {
      e.preventDefault();
      setShowDropdown(true);
      setSelectedIndex((prev) =>
        e.key === 'ArrowDown'
          ? prev < filteredMarkets.length - 1 ? prev + 1 : 0
          : prev > 0 ? prev - 1 : filteredMarkets.length - 1
      );
      return;
    }
    if (e.key === 'Enter' && showDropdown && filteredMarkets.length > 0) {
      e.preventDefault();
      handleSelect(filteredMarkets[selectedIndex >= 0 ? selectedIndex : 0]);
      return;
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((market) => (
            <span
              key={market}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs border border-slate-200"
            >
              {market}
              <button
                type="button"
                onClick={() => handleRemove(market)}
                className="hover:text-slate-900 focus:outline-none"
                aria-label={`Remove ${market}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedIndex(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (filteredMarkets.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
        />

        {showDropdown && filteredMarkets.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {filteredMarkets.map((market, index) => (
              <button
                key={market}
                type="button"
                className={`w-full text-left px-4 py-2 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none text-sm text-slate-700 ${
                  index === selectedIndex ? 'bg-slate-100' : ''
                }`}
                onClick={() => handleSelect(market)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {market}
              </button>
            ))}
          </div>
        )}

        {showDropdown && searchQuery && filteredMarkets.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
            <p className="text-sm text-slate-400">No matching markets found.</p>
          </div>
        )}
      </div>

      {helperText && (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
