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
            className={`h-4 w-4 text-amber-500 focus:ring-amber-500/20 border-white/20 rounded bg-white/5 ${className}`}
            {...props}
          />
          {label && (
            <span className={`ml-2 text-sm ${error ? 'text-red-400' : 'text-white/70 group-hover:text-white'} transition-colors`}>
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
