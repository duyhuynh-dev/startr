/**
 * Checkbox component – light theme
 */

import { InputHTMLAttributes, forwardRef } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="flex items-center cursor-pointer group">
          <input
            ref={ref}
            type="checkbox"
            className={`h-4 w-4 text-slate-900 focus:ring-slate-900/20 border-slate-300 rounded ${className}`}
            {...props}
          />
          {label && (
            <span className={`ml-2 text-sm ${error ? 'text-red-500' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`}>
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
