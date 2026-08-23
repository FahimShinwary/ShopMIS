import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Plus, Check, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, convertPersianDigits } from '../lib/utils';
import { Customer } from '../types';

interface CustomerSelectProps {
  customers: Customer[];
  selectedId?: number;
  onSelect: (customer: Customer) => void;
  onQuickAdd?: () => void;
  t?: any;
  error?: string;
}

export default function CustomerSelect({ customers, selectedId, onSelect, onQuickAdd, t, error }: CustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedId);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
        <User size={12} />
        <span>{t?.customer_name || 'Customer'}</span>
        <span className="text-red-500 font-bold">*</span>
      </label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-muted border border-border rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer hover:border-brand-500 transition-all shadow-sm",
          isOpen && "border-brand-500 ring-2 ring-brand-500/10 bg-background",
          error && "border-red-500"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <User size={16} className={cn("shrink-0", selectedCustomer ? "text-brand-500" : "text-muted-foreground")} />
          <span className={cn("text-sm truncate font-medium", !selectedCustomer && "text-muted-foreground")}>
            {selectedCustomer ? selectedCustomer.name : t.select_customer}
          </span>
        </div>
        <ChevronDown size={18} className={cn("text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-[100] w-full mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[280px]"
          >
            <div className="p-3 border-b border-border bg-muted/30">
              <div className="relative">
                <Search className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(convertPersianDigits(e.target.value))}
                  placeholder={t.search}
                  className="w-full bg-background border border-border rounded-lg py-2 ps-9 pe-9 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                />
                {search && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch('');
                    }}
                    className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
              {filtered.length > 0 ? (
                filtered.map((customer) => (
                  <button
                    type="button"
                    key={customer.id}
                    onClick={() => {
                      onSelect(customer);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors text-start",
                      selectedId === customer.id 
                        ? "bg-brand-500 text-white" 
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-bold">{customer.name}</span>
                      <span className={cn("text-[10px]", selectedId === customer.id ? "text-white/80" : "text-muted-foreground")}>
                        {customer.contact || 'No contact'}
                      </span>
                    </div>
                    {selectedId === customer.id && <Check size={16} />}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No customers found
                </div>
              )}
            </div>

            {onQuickAdd && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAdd();
                  setIsOpen(false);
                }}
                className="w-full p-3 border-t border-border bg-brand-500/5 text-brand-500 hover:bg-brand-500/10 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
              >
                <Plus size={16} />
                {t?.quick_add || 'Add New Customer'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="text-[10px] text-red-500 font-bold mt-1">{error}</p>}
    </div>
  );
}
