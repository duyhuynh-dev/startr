/**
 * Select dropdown component
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
      w-full px-3 py-2 border rounded-lg text-slate-100 bg-slate-800
      focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
      disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-400
      ${error ? 'border-red-500' : 'border-slate-600'}
      ${className}
    `;
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-1">
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
            <option key={option.value} value={option.value} className="bg-slate-800 text-slate-100">
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

