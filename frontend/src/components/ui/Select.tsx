/**
 * Select dropdown – light theme
 */

import { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', ...props }, ref) => {
    const selectClasses = `
      w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900
      placeholder:text-slate-200
      focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300
      disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400
      transition-colors
      ${error ? 'border-red-300' : ''}
      ${className}
    `;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={selectClasses}
          {...props}
        >
          {!props.required && <option value="">Select an option</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
