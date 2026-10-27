import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-bold uppercase tracking-wider text-[#FFDF00] drop-shadow-sm">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-[#F5A623] pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-[#002B12] text-white font-semibold text-lg placeholder-white/40 px-4 py-3.5 rounded-xl border-2 transition-all outline-none ${
            icon ? 'pl-11' : ''
          } ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-400'
              : 'border-[#28A745] focus:border-[#FFDF00] focus:ring-2 focus:ring-[#FFDF00]/30'
          } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs font-semibold text-red-400 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
};
