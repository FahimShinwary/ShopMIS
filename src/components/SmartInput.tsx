import React from 'react';
import { convertPersianDigits, cn } from '../lib/utils';

interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  className?: string;
}

export default function SmartInput(allProps: any) {
  const { label, icon, error, className, ...props } = allProps;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const converted = convertPersianDigits(e.target.value);
    e.target.value = converted;
    
    if (allProps.onChange) {
      allProps.onChange(e);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {icon}
          {label}
        </label>
      )}
      <input
        {...props}
        onChange={handleChange}
        className={cn(
          "w-full bg-muted border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors text-sm",
          error && "border-red-500 focus:border-red-500",
          className
        )}
      />
      {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
    </div>
  );
}
