/**
 * Market Selection Component
 * Multi-select dropdown with only predefined markets allowed
 * No custom input - only selection from the supported markets list
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

  // Filter markets based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMarkets(
        SUPPORTED_MARKETS.filter((market) => !value.includes(market)).slice(0, 10)
      );
      return;
    }

    const queryLower = searchQuery.toLowerCase().trim();
    const filtered = SUPPORTED_MARKETS.filter((market) => {
      const isNotSelected = !value.includes(market);
      const matchesQuery = market.toLowerCase().includes(queryLower);
      return isNotSelected && matchesQuery;
    });

    setFilteredMarkets(filtered.slice(0, 10));
  }, [searchQuery, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowDropdown(true);
    setSelectedIndex(-1);
  };

  const handleSelect = (market: string) => {
    if (!value.includes(market)) {
      onChange([...value, market]);
    }
    setSearchQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemove = (marketToRemove: string) => {
    onChange(value.filter((market) => market !== marketToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to remove last tag if input is empty
    if (e.key === 'Backspace' && searchQuery === '' && value.length > 0) {
      handleRemove(value[value.length - 1]);
      return;
    }

    // Handle arrow keys for navigation
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && filteredMarkets.length > 0) {
      e.preventDefault();
      setShowDropdown(true);
      if (e.key === 'ArrowDown') {
        setSelectedIndex((prev) =>
          prev < filteredMarkets.length - 1 ? prev + 1 : 0
        );
      } else {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredMarkets.length - 1));
      }
      return;
    }

    // Handle Enter to select
    if (e.key === 'Enter' && showDropdown && filteredMarkets.length > 0) {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredMarkets.length) {
        handleSelect(filteredMarkets[selectedIndex]);
      } else if (filteredMarkets.length > 0) {
        // Select first result if nothing is selected
        handleSelect(filteredMarkets[0]);
      }
      return;
    }

    // Close dropdown on Escape
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-100 mb-1">
          {label}
        </label>
      )}

      {/* Selected markets as tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((market) => (
            <span
              key={market}
              className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-100 rounded-full text-sm border border-amber-500/30"
            >
              {market}
              <button
                type="button"
                onClick={() => handleRemove(market)}
                className="hover:text-amber-300 focus:outline-none"
                aria-label={`Remove ${market}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredMarkets.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-3 py-2 border rounded-lg text-slate-100 bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 border-slate-600"
        />

        {/* Dropdown with filtered markets */}
        {showDropdown && filteredMarkets.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredMarkets.map((market, index) => (
              <button
                key={market}
                type="button"
                className={`w-full text-left px-4 py-2 hover:bg-slate-700 focus:bg-slate-700 focus:outline-none ${
                  index === selectedIndex ? 'bg-slate-700' : ''
                }`}
                onClick={() => handleSelect(market)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <p className="text-sm text-slate-100">{market}</p>
              </button>
            ))}
          </div>
        )}

        {/* Show message if no results */}
        {showDropdown && searchQuery && filteredMarkets.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-4">
            <p className="text-sm text-slate-400">
              No matching markets found. Select from the predefined list.
            </p>
          </div>
        )}
      </div>

      {helperText && (
        <p className="mt-1 text-sm text-slate-100">{helperText}</p>
      )}
    </div>
  );
}
