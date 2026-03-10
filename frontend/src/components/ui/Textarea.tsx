/**
 * Textarea component – light theme
 */

import { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const textareaClasses = `
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
        <textarea
          ref={ref}
          className={textareaClasses}
          {...props}
        />
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

Textarea.displayName = 'Textarea';
