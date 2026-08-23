import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  t?: any;
  lang?: 'en' | 'ps' | 'dr';
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  t,
  lang = 'en'
}) => {
  const [jumpInput, setJumpInput] = useState(currentPage.toString());

  useEffect(() => {
    setJumpInput(currentPage.toString());
  }, [currentPage]);

  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setJumpInput(currentPage.toString());
    }
  };

  // Generate page numbers range with ellipsis for large number of pages
  const getPageNumbers = () => {
    const delta = 1;
    const range: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }

    return range;
  };

  const isRtl = lang === 'ps' || lang === 'dr';

  const prevText = t?.previous || (lang === 'ps' ? 'تېره' : lang === 'dr' ? 'قبلی' : 'Previous');
  const nextText = t?.next || (lang === 'ps' ? 'راتلونکې' : lang === 'dr' ? 'بعدی' : 'Next');
  const pageText = lang === 'ps' ? 'صفحه' : lang === 'dr' ? 'صفحه' : 'Page';
  const ofText = lang === 'ps' ? 'څخه' : lang === 'dr' ? 'از' : 'of';
  const goText = lang === 'ps' ? 'تګ' : lang === 'dr' ? 'برو' : 'Go';

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 shadow-soft transition-all">
      {/* Item Count Summary */}
      <p className="text-xs font-semibold text-muted-foreground text-center lg:text-start">
        {lang === 'ps' ? (
          <>د <span className="text-foreground font-black">{totalItems}</span> ریکارډونو څخه <span className="text-foreground font-black">{startItem}</span> تر <span className="text-foreground font-black">{endItem}</span> ښودل کیږي</>
        ) : lang === 'dr' ? (
          <>نمایش <span className="text-foreground font-black">{startItem}</span> تا <span className="text-foreground font-black">{endItem}</span> از مجموع <span className="text-foreground font-black">{totalItems}</span> ریکارد</>
        ) : (
          <>Showing <span className="text-foreground font-black">{startItem}</span> to <span className="text-foreground font-black">{endItem}</span> of <span className="text-foreground font-black">{totalItems}</span> entries</>
        )}
      </p>

      {/* Center/Right Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
        {/* Direct Page Jump Search Bar */}
        <form onSubmit={handleJump} className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-xl px-2.5 py-1 text-xs">
          <span className="text-muted-foreground font-bold whitespace-nowrap">{pageText}</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            className="w-12 h-7 text-center bg-background border border-border rounded-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <span className="text-muted-foreground font-bold whitespace-nowrap">{ofText} {totalPages}</span>
          <button
            type="submit"
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-2 py-1 rounded-lg text-xs transition-colors ms-1 flex items-center gap-1"
          >
            <Search size={11} />
            <span>{goText}</span>
          </button>
        </form>

        {/* Buttons & Number List */}
        <div className="flex items-center gap-1.5">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            <span>{prevText}</span>
          </button>

          {/* Numbered Buttons */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground font-bold text-xs select-none">
                    ...
                  </span>
                );
              }

              const pageNum = p as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    "min-w-[32px] h-8 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center",
                    isActive
                      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30 ring-2 ring-brand-500/20"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            <span>{nextText}</span>
            {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
