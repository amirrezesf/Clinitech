
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Eraser, Trash2, PenTool, CheckCircle, Zap, FilePlus, ChevronDown, CircleDot, MousePointer2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  type: 'pen' | 'eraser-path';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (imageData: string) => void;
  title: string;
  initialImage?: string;
}

type Tool = 'pen' | 'eraser';
type EraseMode = 'pixel' | 'objective';

const PRESET_COLORS = [
  { id: 'blue', value: '#1d4ed8', label: 'آبی' },
  { id: 'black', value: '#111827', label: 'مشکی' },
  { id: 'red', value: '#be123c', label: 'قرمز' },
  { id: 'green', value: '#15803d', label: 'سبز' },
  { id: 'purple', value: '#7e22ce', label: 'بنفش' },
  { id: 'orange', value: '#c2410c', label: 'نارنجی' },
];

const BRUSH_SIZES = [
  { id: 'thin', value: 1.5, label: 'نازک' },
  { id: 'medium', value: 3, label: 'معمولی' },
  { id: 'thick', value: 5, label: 'ضخیم' },
];

const ERASER_SIZE = 40;
const PAGE_INCREMENT = 800;

export const HandwritingModal = ({ isOpen, onClose, onComplete, title, initialImage }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  
  const [tool, setTool] = useState<Tool>('pen');
  const [eraseMode, setEraseMode] = useState<EraseMode>('objective');
  const [selectedColor, setSelectedColor] = useState('#1d4ed8');
  const [brushSize, setBrushSize] = useState(3);
  const [canvasHeight, setCanvasHeight] = useState(800);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isOverCanvas, setIsOverCanvas] = useState(false);

  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    
    // پاکسازی با در نظر گرفتن مختصات فیزیکی
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(ratio, ratio);

    const width = canvas.width / ratio;

    if (bgImageRef.current) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(bgImageRef.current, 0, 0, width, bgImageRef.current.height * (width / bgImageRef.current.width));
    }

    strokesRef.current.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.beginPath();
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.type === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const xc = (stroke.points[i].x + stroke.points[i - 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, xc, yc);
      }
      ctx.stroke();
    });
  }, []);

  const initCanvas = useCallback((height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth || 900;
    const ratio = window.devicePixelRatio || 1; 

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
    }
    
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (isOpen) {
      if (!loadedRef.current) {
          if (initialImage) {
              const img = new Image();
              img.src = initialImage;
              img.onload = () => {
                  bgImageRef.current = img;
                  const calculatedHeight = Math.max(800, (img.height * (900 / img.width)));
                  setCanvasHeight(calculatedHeight);
                  setTimeout(() => initCanvas(calculatedHeight), 50);
              };
          } else {
              bgImageRef.current = null;
              strokesRef.current = [];
              setCanvasHeight(800);
              setTimeout(() => initCanvas(800), 50);
          }
          loadedRef.current = true;
      }
    } else {
      loadedRef.current = false;
    }
  }, [isOpen, initialImage, initCanvas]);

  const addNewPage = () => {
    const newHeight = canvasHeight + PAGE_INCREMENT;
    setCanvasHeight(newHeight);
    setTimeout(() => initCanvas(newHeight), 50);
  };

  const getCoordinates = (e: React.PointerEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const distanceToSegment = (p: Point, a: Point, b: Point) => {
    const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (a.x + t * (b.x - a.x))) ** 2 + (p.y - (a.y + t * (b.y - a.y))) ** 2);
  };

  const handleObjectiveErase = (coords: Point) => {
    const initialCount = strokesRef.current.length;
    strokesRef.current = strokesRef.current.filter(stroke => {
      if (stroke.type !== 'pen') return true;
      return !stroke.points.some((pt, idx) => {
        if (idx === 0) return false;
        return distanceToSegment(coords, stroke.points[idx - 1], pt) < ERASER_SIZE / 2;
      });
    });
    if (strokesRef.current.length !== initialCount) {
      redraw();
    }
  };

  const startDrawing = (e: React.PointerEvent) => {
    const coords = getCoordinates(e);
    setIsDrawing(true);

    if (tool === 'pen') {
      currentStrokeRef.current = {
        id: Date.now().toString(),
        points: [coords],
        color: selectedColor,
        width: brushSize,
        type: 'pen'
      };
    } else if (tool === 'eraser') {
      if (eraseMode === 'objective') {
        handleObjectiveErase(coords);
      } else {
        currentStrokeRef.current = {
          id: Date.now().toString(),
          points: [coords],
          color: 'rgba(0,0,0,1)',
          width: ERASER_SIZE,
          type: 'eraser-path'
        };
      }
    }
    
    if (e.pointerType === 'touch') {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const draw = (e: React.PointerEvent) => {
    const coords = getCoordinates(e);
    setCursorPos(coords);

    if (!isDrawing) return;

    if (tool === 'eraser' && eraseMode === 'objective') {
      handleObjectiveErase(coords);
      return;
    }

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(coords);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pts = currentStrokeRef.current.points;
      const lastIdx = pts.length - 1;
      
      ctx.beginPath();
      ctx.lineWidth = currentStrokeRef.current.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = currentStrokeRef.current.type === 'pen' ? currentStrokeRef.current.color : 'rgba(0,0,0,1)';
      ctx.globalCompositeOperation = currentStrokeRef.current.type === 'pen' ? 'source-over' : 'destination-out';
      
      ctx.moveTo(pts[lastIdx - 1].x, pts[lastIdx - 1].y);
      ctx.lineTo(pts[lastIdx].x, pts[lastIdx].y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
      redraw();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (window.confirm('آیا از پاک کردن تمامی لایه‌ها و تصویر زمینه اطمینان دارید؟')) {
        // ۱. ریست مراجع داده
        strokesRef.current = [];
        bgImageRef.current = null;
        
        // ۲. ریست فیزیکی و فوری بوم (Canvas)
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0); // ریست اسکیل برای پاکسازی کامل پیکسل‌ها
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        // ۳. ریست وضعیت ارتفاع و مقداردهی مجدد بوم
        setCanvasHeight(800);
        setTimeout(() => {
            initCanvas(800);
            toast.success('بوم کاملاً پاک‌سازی شد.');
        }, 50);
    }
  };

  const handleFinish = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const fctx = finalCanvas.getContext('2d');
    if (fctx) {
        fctx.fillStyle = 'white';
        fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        fctx.drawImage(canvas, 0, 0);
        onComplete(finalCanvas.toDataURL('image/png', 0.9));
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-1.5 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-[2.5rem] w-full max-w-7xl h-[96dvh] sm:h-[94vh] shadow-2xl flex flex-col overflow-hidden border border-white/10">
        
        {/* Header */}
        <div className="px-4 sm:px-8 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 text-white rounded-xl shadow-md flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-xl font-black text-gray-800 dark:text-white truncate max-w-[200px] sm:max-w-none">{title}</h3>
              <p className="text-[8px] sm:text-[9px] text-primary-600 font-black uppercase tracking-wider sm:tracking-[0.2em] mt-0.5 flex items-center gap-1">
                <Zap size={8} fill="currentColor" /> Vector Ink Engine
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-xl transition-all"
            aria-label="بستن پنجره"
          >
            <X size={22} />
          </button>
        </div>

        {/* Toolbar - Horizontally scrollable on mobile */}
        <div className="px-3 sm:px-8 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2.5 sm:gap-6 shrink-0 overflow-x-auto custom-scrollbar">
           <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
               <button 
                  type="button"
                  onClick={() => setTool('pen')} 
                  className={clsx("px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black", tool === 'pen' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
               >
                 <PenTool size={14} /><span>قلم</span>
               </button>
               
               <div className="relative group">
                 <button 
                    type="button"
                    onClick={() => setTool('eraser')} 
                    className={clsx("px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black relative", tool === 'eraser' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                 >
                    <Eraser size={14} />
                    <span>پاک‌کن</span>
                    <ChevronDown size={10} className="mr-0.5 opacity-50" />
                 </button>
                 
                 <div className="absolute top-full right-0 mt-2 w-44 sm:w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                    <button 
                        type="button"
                        onClick={() => { setEraseMode('pixel'); setTool('eraser'); }}
                        className={clsx("w-full px-3.5 py-2.5 text-right text-[10px] font-black flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 transition-colors", eraseMode === 'pixel' ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600" : "text-gray-500 hover:bg-gray-50")}
                    >
                        <CircleDot size={13} /> <span>نقطه‌ای (Pixel)</span>
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setEraseMode('objective'); setTool('eraser'); }}
                        className={clsx("w-full px-3.5 py-2.5 text-right text-[10px] font-black flex items-center gap-2 transition-colors", eraseMode === 'objective' ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600" : "text-gray-500 hover:bg-gray-50")}
                    >
                        <MousePointer2 size={13} /> <span>شیءگرا (کل خط)</span>
                    </button>
                 </div>
               </div>
           </div>

           {tool === 'pen' && (
             <>
                <div className="h-6 sm:h-8 w-px bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {PRESET_COLORS.map(color => (
                        <button 
                            type="button"
                            key={color.id} 
                            onClick={() => setSelectedColor(color.value)} 
                            className={clsx(
                                "w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all transform hover:scale-110", 
                                selectedColor === color.value ? "border-primary-500 ring-2 sm:ring-4 ring-primary-500/20" : "border-white dark:border-gray-700"
                            )} 
                            style={{ backgroundColor: color.value }}
                            title={color.label}
                        />
                    ))}
                </div>
             </>
           )}

           <div className="h-6 sm:h-8 w-px bg-gray-200 dark:bg-gray-700 shrink-0"></div>

           <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
            {BRUSH_SIZES.map(size => (
                <button 
                  type="button"
                  key={size.id} 
                  onClick={() => { setBrushSize(size.value); setTool('pen'); }} 
                  className={clsx("px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] font-black transition-all", brushSize === size.value && tool === 'pen' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-xs" : "text-gray-400 hover:text-gray-600")}
                >
                  {size.label}
                </button>
            ))}
           </div>

           <div className="flex-1 min-w-[8px]"></div>
           
           <button 
             type="button"
             onClick={clearCanvas} 
             className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-[10px] font-bold transition-all shrink-0"
           >
             <Trash2 size={14} />
             <span>پاک‌سازی</span>
           </button>
        </div>

        <div 
          ref={scrollAreaRef}
          className="flex-1 relative bg-slate-200 dark:bg-gray-950 p-2 sm:p-6 touch-none overflow-y-auto custom-scrollbar"
        >
          <div 
            className="mx-auto rounded-2xl sm:rounded-[2.5rem] shadow-2xl relative bg-white border border-gray-200 dark:border-gray-800 overflow-hidden"
            style={{ width: '100%', maxWidth: '900px', height: `${canvasHeight}px` }}
            onMouseEnter={() => setIsOverCanvas(true)}
            onMouseLeave={() => { setIsOverCanvas(false); stopDrawing(); }}
          >
            <canvas 
                ref={canvasRef} 
                onPointerDown={startDrawing} 
                onPointerMove={draw} 
                onPointerUp={stopDrawing} 
                className="block select-none cursor-none relative z-10" 
            />

            {isOverCanvas && (
                <div 
                    className={clsx(
                        "absolute pointer-events-none rounded-full border-2 z-[20] flex items-center justify-center transition-none",
                        tool === 'eraser' ? "bg-white/40 border-primary-400 shadow-xl backdrop-blur-[1px]" : "border-primary-500 bg-primary-500/10"
                    )}
                    style={{
                        left: cursorPos.x,
                        top: cursorPos.y,
                        width: tool === 'eraser' ? ERASER_SIZE : (brushSize * 2) + 8,
                        height: tool === 'eraser' ? ERASER_SIZE : (brushSize * 2) + 8,
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    {tool === 'eraser' ? (
                        <div className="flex flex-col items-center">
                            <Eraser size={14} className="text-primary-700" />
                            {eraseMode === 'objective' && <MousePointer2 size={8} className="text-primary-500 mt-0.5" />}
                        </div>
                    ) : (
                        <div className="w-0.5 h-0.5 bg-primary-500 rounded-full" />
                    )}
                </div>
            )}
          </div>

          <div className="flex justify-center mt-6 sm:mt-8 pb-10">
                <button 
                  type="button"
                  onClick={addNewPage}
                  className="px-5 sm:px-8 py-3 sm:py-4 bg-primary-600 text-white shadow-xl rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-black hover:bg-primary-700 transition-all transform active:scale-95 group"
                >
                    <FilePlus size={18} className="group-hover:rotate-12 transition-transform" />
                    <span>افزودن فضای جدید در پایین</span>
                    <ChevronDown size={16} className="animate-bounce" />
                </button>
          </div>
        </div>

        <div className="px-4 sm:px-10 py-3 sm:py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex gap-2.5 sm:gap-6 shrink-0">
            <button 
              type="button"
              onClick={handleFinish} 
              className="flex-1 py-3 sm:py-4 bg-primary-600 text-white rounded-xl sm:rounded-2xl font-black text-sm sm:text-lg flex items-center justify-center gap-2 sm:gap-4 hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all transform active:scale-[0.98]"
            >
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>اتمام و ثبت دست‌خط</span>
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="px-5 sm:px-12 py-3 sm:py-4 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-base hover:bg-gray-100 transition-all active:scale-95"
            >
              انصراف
            </button>
        </div>
      </div>
    </div>
  );
};
