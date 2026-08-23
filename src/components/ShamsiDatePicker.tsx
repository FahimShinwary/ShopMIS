import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw, Globe } from 'lucide-react';
import { 
  gregorianToShamsi, 
  shamsiToGregorian,
  shamsiToGregorianStr, 
  formatShamsi, 
  parseShamsiStr, 
  AFGHAN_MONTHS, 
  getShamsiMonthDays,
  ShamsiDate
} from '../lib/shamsi';

interface ShamsiDatePickerProps {
  value?: string; // Gregorian YYYY-MM-DD or ISO string or Shamsi YYYY/MM/DD
  onChange: (gregorianStr: string, shamsiStr: string) => void;
  lang?: 'en' | 'ps' | 'dr';
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({
  value,
  onChange,
  lang = 'en',
  placeholder,
  className = '',
  id,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'shamsi' | 'gregorian'>('shamsi');
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to parse initial value to date object and shamsi object
  const getShamsiFromValue = (val?: string): ShamsiDate => {
    if (!val) return gregorianToShamsi(new Date());

    if (val.startsWith('13') || val.startsWith('14')) {
      const parsed = parseShamsiStr(val);
      if (parsed) return parsed;
    }

    return gregorianToShamsi(val);
  };

  const initialShamsi = getShamsiFromValue(value);
  const initialGreg = shamsiToGregorian(initialShamsi.jy, initialShamsi.jm, initialShamsi.jd);

  const [selectedShamsi, setSelectedShamsi] = useState<ShamsiDate>(initialShamsi);
  
  // Shamsi View state
  const [viewShamsiYear, setViewShamsiYear] = useState<number>(initialShamsi.jy);
  const [viewShamsiMonth, setViewShamsiMonth] = useState<number>(initialShamsi.jm);

  // Gregorian View state
  const [viewGregYear, setViewGregYear] = useState<number>(initialGreg.getFullYear());
  const [viewGregMonth, setViewGregMonth] = useState<number>(initialGreg.getMonth());

  useEffect(() => {
    const s = getShamsiFromValue(value);
    const g = shamsiToGregorian(s.jy, s.jm, s.jd);
    setSelectedShamsi(s);
    setViewShamsiYear(s.jy);
    setViewShamsiMonth(s.jm);
    setViewGregYear(g.getFullYear());
    setViewGregMonth(g.getMonth());
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const afghanMonthNames = AFGHAN_MONTHS[lang] || AFGHAN_MONTHS.en;

  // Selection handlers
  const handleSelectShamsiDay = (day: number) => {
    const newShamsi: ShamsiDate = { jy: viewShamsiYear, jm: viewShamsiMonth, jd: day };
    setSelectedShamsi(newShamsi);
    const gregStr = shamsiToGregorianStr(viewShamsiYear, viewShamsiMonth, day);
    const shamsiStr = formatShamsi(newShamsi, 'YYYY/MM/DD');
    onChange(gregStr, shamsiStr);
    setIsOpen(false);
  };

  const handleSelectGregDay = (day: number) => {
    const gDate = new Date(viewGregYear, viewGregMonth, day, 12, 0, 0);
    const newShamsi = gregorianToShamsi(gDate);
    setSelectedShamsi(newShamsi);

    const yyyy = gDate.getFullYear();
    const mm = String(gDate.getMonth() + 1).padStart(2, '0');
    const dd = String(gDate.getDate()).padStart(2, '0');
    const gregStr = `${yyyy}-${mm}-${dd}`;
    const shamsiStr = formatShamsi(newShamsi, 'YYYY/MM/DD');

    onChange(gregStr, shamsiStr);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const todayGreg = new Date();
    const todayShamsi = gregorianToShamsi(todayGreg);

    setSelectedShamsi(todayShamsi);
    setViewShamsiYear(todayShamsi.jy);
    setViewShamsiMonth(todayShamsi.jm);
    setViewGregYear(todayGreg.getFullYear());
    setViewGregMonth(todayGreg.getMonth());

    const yyyy = todayGreg.getFullYear();
    const mm = String(todayGreg.getMonth() + 1).padStart(2, '0');
    const dd = String(todayGreg.getDate()).padStart(2, '0');
    const gregStr = `${yyyy}-${mm}-${dd}`;
    const shamsiStr = formatShamsi(todayShamsi, 'YYYY/MM/DD');

    onChange(gregStr, shamsiStr);
    setIsOpen(false);
  };

  // Month navigation for Shamsi
  const handlePrevShamsiMonth = () => {
    if (viewShamsiMonth === 1) {
      setViewShamsiMonth(12);
      setViewShamsiYear(prev => prev - 1);
    } else {
      setViewShamsiMonth(prev => prev - 1);
    }
  };

  const handleNextShamsiMonth = () => {
    if (viewShamsiMonth === 12) {
      setViewShamsiMonth(1);
      setViewShamsiYear(prev => prev + 1);
    } else {
      setViewShamsiMonth(prev => prev + 1);
    }
  };

  // Month navigation for Gregorian
  const handlePrevGregMonth = () => {
    if (viewGregMonth === 0) {
      setViewGregMonth(11);
      setViewGregYear(prev => prev - 1);
    } else {
      setViewGregMonth(prev => prev - 1);
    }
  };

  const handleNextGregMonth = () => {
    if (viewGregMonth === 11) {
      setViewGregMonth(0);
      setViewGregYear(prev => prev + 1);
    } else {
      setViewGregMonth(prev => prev + 1);
    }
  };

  const totalShamsiDays = getShamsiMonthDays(viewShamsiYear, viewShamsiMonth);
  const totalGregDays = new Date(viewGregYear, viewGregMonth + 1, 0).getDate();

  const codeShamsiString = formatShamsi(selectedShamsi, 'YYYY/MM/DD');
  const gregString = shamsiToGregorianStr(selectedShamsi.jy, selectedShamsi.jm, selectedShamsi.jd);

  const shamsiYearOptions = Array.from({ length: 46 }, (_, i) => 1390 + i);
  const gregYearOptions = Array.from({ length: 41 }, (_, i) => 2010 + i);

  return (
    <div className={`relative inline-block w-full z-30 ${className}`} ref={containerRef}>
      {/* Input Trigger Button */}
      <div
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-card dark:bg-slate-900 border border-input rounded-xl text-sm shadow-sm cursor-pointer hover:border-brand-500 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap truncate text-xs font-bold">
            <span className="text-foreground">☀️ {codeShamsiString}</span>
            <span className="text-muted-foreground font-mono">| 📅 {gregString}</span>
          </div>
        </div>
        <span className="text-[10px] bg-brand-500/10 text-brand-500 font-extrabold px-2 py-0.5 rounded-lg border border-brand-500/20 shrink-0 ms-1">
          {calendarMode === 'shamsi' ? '☀️ AFG' : '📅 USA'}
        </span>
      </div>

      {/* Solid Non-Transparent Popup */}
      {isOpen && (
        <div className="absolute z-[200] mt-1.5 w-80 max-w-[calc(100vw-2rem)] p-3.5 bg-card dark:bg-slate-900 text-card-foreground border-2 border-border dark:border-slate-700 rounded-2xl shadow-2xl ltr:left-0 rtl:right-0 sm:ltr:left-0 sm:rtl:right-0 animate-in fade-in zoom-in-95 duration-150 top-full">
          
          {/* Calendar Selection Mode Tabs */}
          <div className="flex items-center p-1 bg-muted rounded-xl mb-3 border border-border">
            <button
              type="button"
              onClick={() => setCalendarMode('shamsi')}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                calendarMode === 'shamsi'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>☀️</span>
              <span>AFG (Shamsi)</span>
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('gregorian')}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                calendarMode === 'gregorian'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>📅</span>
              <span>USA (Gregorian)</span>
            </button>
          </div>

          {/* AFGHANISTAN SHAMSI CALENDAR MODE */}
          {calendarMode === 'shamsi' && (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <button
                  type="button"
                  onClick={handlePrevShamsiMonth}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    value={viewShamsiMonth}
                    onChange={(e) => setViewShamsiMonth(Number(e.target.value))}
                    className="bg-background dark:bg-slate-800 border border-input text-foreground rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {afghanMonthNames.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m} ({idx + 1})
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewShamsiYear}
                    onChange={(e) => setViewShamsiYear(Number(e.target.value))}
                    className="bg-background dark:bg-slate-800 border border-input text-foreground rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {shamsiYearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleNextShamsiMonth}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-3">
                {Array.from({ length: totalShamsiDays }, (_, i) => i + 1).map(day => {
                  const isSelected = 
                    selectedShamsi.jy === viewShamsiYear && 
                    selectedShamsi.jm === viewShamsiMonth && 
                    selectedShamsi.jd === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectShamsiDay(day)}
                      className={`h-8 w-8 text-xs font-bold rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-white shadow-md scale-105 ring-2 ring-brand-500/30'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ENGLISH USA GREGORIAN CALENDAR MODE */}
          {calendarMode === 'gregorian' && (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <button
                  type="button"
                  onClick={handlePrevGregMonth}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    value={viewGregMonth}
                    onChange={(e) => setViewGregMonth(Number(e.target.value))}
                    className="bg-background dark:bg-slate-800 border border-input text-foreground rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {GREGORIAN_MONTHS.map((m, idx) => (
                      <option key={idx} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewGregYear}
                    onChange={(e) => setViewGregYear(Number(e.target.value))}
                    className="bg-background dark:bg-slate-800 border border-input text-foreground rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {gregYearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleNextGregMonth}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-3">
                {Array.from({ length: totalGregDays }, (_, i) => i + 1).map(day => {
                  const currGregDate = new Date(viewGregYear, viewGregMonth, day);
                  const selGregDate = shamsiToGregorian(selectedShamsi.jy, selectedShamsi.jm, selectedShamsi.jd);
                  const isSelected = 
                    currGregDate.getFullYear() === selGregDate.getFullYear() &&
                    currGregDate.getMonth() === selGregDate.getMonth() &&
                    currGregDate.getDate() === selGregDate.getDate();

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectGregDay(day)}
                      className={`h-8 w-8 text-xs font-bold rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-white shadow-md scale-105 ring-2 ring-brand-500/30'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer with Today Quick Button & Both Date Summaries */}
          <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
            <button
              type="button"
              onClick={handleSetToday}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-brand-500 hover:bg-brand-500/10 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'ps' ? 'نن (امروز)' : lang === 'dr' ? 'امروز' : 'Today'}</span>
            </button>

            <div className="text-[10px] text-right font-bold text-muted-foreground">
              <div>☀️ {codeShamsiString}</div>
              <div className="font-mono text-brand-500">📅 {gregString}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShamsiDatePicker;
