/**
 * Input component with variants
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
          <p className="mt-1 text-sm text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

