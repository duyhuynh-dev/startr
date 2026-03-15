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
        <textarea
          ref={ref}
          className={textareaClasses}
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

Textarea.displayName = 'Textarea';
