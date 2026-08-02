
import React from 'react';
import { X, Printer, ZoomIn } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageData: string;
  title: string;
}

export const HandwritingPreviewModal = ({ isOpen, onClose, imageData, title }: Props) => {
  if (!isOpen || !imageData) return null;

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<html><body style="margin:0; display:flex; justify-content:center; align-items:center; background:#f0f0f0; height:100vh;"><img src="${imageData}" style="max-width:100%; max-height:100%; object-fit:contain;"></body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => {
          win.print();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-5xl h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-white/10">
        
        {/* Header */}
        <div className="px-10 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-2xl flex items-center justify-center shadow-xl">
                <ZoomIn size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white">بازبینی دست‌خط: {title}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-0.5">Static Full-Page View Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
              <button onClick={handlePrint} className="p-3 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-2xl transition-all" title="چاپ تصویر">
                <Printer size={24} />
              </button>
              <button onClick={onClose} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all">
                <X size={28} />
              </button>
          </div>
        </div>

        {/* Content - Fixed Container with calculated constraints */}
        <div className="flex-1 bg-slate-100 dark:bg-gray-950 p-6 md:p-10 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full flex items-center justify-center rounded-[2.5rem] bg-white dark:bg-gray-900 shadow-2xl p-4 overflow-hidden relative border border-gray-100 dark:border-gray-800">
                <img 
                    src={imageData} 
                    alt={title} 
                    className="w-full h-full max-h-[calc(100vh-280px)] object-contain rounded-xl select-none"
                    onContextMenu={(e) => e.preventDefault()}
                />
            </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 text-center shrink-0">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Digital Healthcare Archiving System</p>
        </div>
      </div>
    </div>
  );
};
