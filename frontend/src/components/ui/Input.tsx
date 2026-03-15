/**
 * Input component – light theme
 */

import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', type = 'text', ...props }, ref) => {
    const inputClasses = `
      w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white
      placeholder:text-white/20
      focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20
      disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30
      transition-colors
      ${error ? 'border-red-500/30' : ''}
      ${className}
    `;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white/70 mb-1">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={inputClasses}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-white/40">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
