/**
 * Location Autocomplete – precise typeahead with consistent styling
 */

'use client';

import { useState, useEffect, useRef } from 'react';

export interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /** When 'city', selecting a suggestion stores just the city name (useful for filters).
   *  When 'full' (default), stores "City, State, Country". */
  selectFormat?: 'city' | 'full';
}

interface LocationSuggestion {
  display_name: string;
  place_id: string;
  city: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Start typing a location...',
  className = '',
  selectFormat = 'full',
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `format=json&` +
        `limit=8&` +
        `addressdetails=1&` +
        `featuretype=city`
      );

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      const queryLower = query.toLowerCase().trim();

      const formatted: LocationSuggestion[] = data
        .map((item: any) => {
          const addr = item.address || {};
          const city = addr.city || addr.town || addr.village || addr.county || '';
          const state = addr.state || addr.region || '';
          const country = addr.country || '';

          let displayName = '';
          if (city && state && country) {
            displayName = `${city}, ${state}, ${country}`;
          } else if (city && state) {
            displayName = `${city}, ${state}`;
          } else if (city && country) {
            displayName = `${city}, ${country}`;
          } else {
            displayName = item.display_name.split(',').slice(0, 3).join(',').trim();
          }

          return { display_name: displayName, place_id: String(item.place_id), city };
        })
        .filter((s: LocationSuggestion) => {
          const nameToCheck = s.city || s.display_name;
          return nameToCheck.toLowerCase().startsWith(queryLower);
        })
        .filter((s: LocationSuggestion, i: number, arr: LocationSuggestion[]) =>
          arr.findIndex((x) => x.display_name === s.display_name) === i
        )
        .slice(0, 5);

      setSuggestions(formatted);
      setShowSuggestions(formatted.length > 0);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error fetching location suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(newValue), 250);
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    const selectedValue = selectFormat === 'city' ? suggestion.city : suggestion.display_name;
    onChange(selectedValue || suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const queryLower = value.toLowerCase().trim();

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
      )}
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
      />

      {isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-[#0d0e1a] border border-white/10 rounded-xl shadow-lg p-3">
          <p className="text-sm text-white/30 text-center">Searching...</p>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-[#0d0e1a] border border-white/10 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {suggestions.map((suggestion, index) => {
            const name = suggestion.display_name;
            const matchLen = queryLower.length;
            const nameStart = name.substring(0, matchLen);
            const nameRest = name.substring(matchLen);

            return (
              <button
                key={suggestion.place_id}
                type="button"
                className={`w-full text-left px-4 py-2.5 hover:bg-white/5 focus:bg-white/5 focus:outline-none transition-colors ${
                  index === selectedIndex ? 'bg-white/5' : ''
                }`}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <p className="text-sm text-white">
                  <span className="font-medium">{nameStart}</span>
                  <span className="text-white/40">{nameRest}</span>
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
