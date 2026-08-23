import React from 'react';
import { X, Printer, Download, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { printViaIframe, downloadPDFDirectly, getStandardPrintCss } from '../lib/pdfUtils';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  contentHtml: string;
  isRTL?: boolean;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  title,
  filename,
  contentHtml,
  isRTL = false,
}: PrintPreviewModalProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const [exported, setExported] = React.useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    printViaIframe(contentHtml, title, isRTL);
  };

  const handleDirectDownload = async () => {
    setIsExporting(true);
    try {
      await downloadPDFDirectly({
        title,
        filename,
        contentHtml,
        isRTL
      });
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error('Download failed, falling back to print dialog:', err);
      printViaIframe(contentHtml, title, isRTL);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="print-preview-modal-backdrop"
        className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-500">
                <Printer size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground leading-tight">{title}</h3>
                <p className="text-xs text-muted-foreground">Print & PDF Export Preview</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-modal-print-save-pdf"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Printer size={15} />
                <span>Save as PDF / Print</span>
              </button>

              <button
                type="button"
                id="btn-modal-direct-download"
                disabled={isExporting}
                onClick={handleDirectDownload}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all disabled:opacity-60 cursor-pointer"
              >
                {exported ? <CheckCircle2 size={15} /> : <Download size={15} />}
                <span>{isExporting ? 'Generating...' : exported ? 'Downloaded!' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Hint bar */}
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-5 py-2 flex items-center justify-between text-xs text-blue-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles size={14} className="text-blue-400 shrink-0" />
              Tip: Click <strong>"Save as PDF / Print"</strong> for instant high-resolution multi-page PDF generation without lag.
            </span>
          </div>

          {/* Content Document Canvas (Paper-like view) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0a0a0c] flex justify-center">
            <div 
              dir={isRTL ? 'rtl' : 'ltr'}
              className="bg-white text-slate-900 w-full max-w-[850px] min-h-full p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 overflow-x-auto select-text font-sans pdf-report-root"
              style={{
                fontFamily: "'Vazirmatn', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif"
              }}
            >
              <style>{getStandardPrintCss(isRTL)}</style>
              <div 
                className="pdf-report-root"
                dangerouslySetInnerHTML={{ __html: contentHtml }} 
              />
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="px-5 py-3 border-t border-border bg-muted/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              {filename}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5"
              >
                <Printer size={14} />
                Save as PDF / Print
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
