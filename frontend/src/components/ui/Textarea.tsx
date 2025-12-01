/**
 * Textarea component
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
      w-full px-3 py-2 border rounded-lg text-slate-100 bg-slate-800
      focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
      disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-100
      ${error ? 'border-red-500' : 'border-slate-600'}
      ${className}
    `;
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-100 mb-1">
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
          <p className="mt-1 text-sm text-slate-100">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

