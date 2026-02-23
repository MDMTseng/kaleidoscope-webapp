/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Settings2, 
  Upload, 
  RotateCcw, 
  Download, 
  Image as ImageIcon,
  Maximize2,
  Hexagon,
  Circle,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

type GeometricStyle = 'radial' | 'square' | 'hexagon';

interface KaleidoscopeParams {
  slices: number;
  zoom: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  kaleidoscopeRotation: number;
  style: GeometricStyle;
}

// --- Constants ---

const DEFAULT_PARAMS: KaleidoscopeParams = {
  slices: 12,
  zoom: 1.5,
  rotation: 0,
  offsetX: 0.5,
  offsetY: 0.5,
  kaleidoscopeRotation: 0,
  style: 'radial',
};

const PRESET_IMAGES = [
  'https://picsum.photos/seed/kaleido1/1200/1200',
  'https://picsum.photos/seed/kaleido2/1200/1200',
  'https://picsum.photos/seed/kaleido3/1200/1200',
  'https://picsum.photos/seed/kaleido4/1200/1200',
];

// --- Components ---

const Slider = ({ 
  label, 
  value, 
  min, 
  max, 
  step = 0.01, 
  onChange,
  onStart,
  onEnd
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step?: number;
  onChange: (val: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</label>
      <span className="text-[10px] font-mono text-emerald-500">{value.toFixed(step >= 1 ? 0 : 2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onTouchStart={onStart}
      onTouchEnd={onEnd}
      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
    />
  </div>
);

export default function App() {
  const [params, setParams] = useState<KaleidoscopeParams>(DEFAULT_PARAMS);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  const startInteraction = () => {
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    setIsInteracting(true);
  };

  const endInteraction = () => {
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 150);
  };

  // Load initial image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = PRESET_IMAGES[0];
    img.onload = () => setImage(img);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => setImage(img);
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use CSS pixels for calculations since the context is scaled by DPR
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate radius to cover the entire canvas (distance to furthest corner)
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);

    ctx.clearRect(0, 0, width, height);

    const slices = params.slices;
    const step = (Math.PI * 2) / slices;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((params.kaleidoscopeRotation * Math.PI) / 180);

    for (let i = 0; i < slices; i++) {
      ctx.save();
      ctx.rotate(i * step);

      // Create clipping path for the slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius * 1.5, -step / 2, step / 2);
      ctx.closePath();
      ctx.clip();

      // Mirror every other slice
      if (i % 2 === 1) {
        ctx.scale(1, -1);
      }

      // Draw the image
      const imgW = image.width;
      const imgH = image.height;
      const aspect = imgW / imgH;
      
      // Use the calculated radius for drawing size
      const drawH = radius * 2 * params.zoom;
      const drawW = drawH * aspect;

      ctx.rotate((params.rotation * Math.PI) / 180);
      
      const offX = (params.offsetX - 0.5) * drawW;
      const offY = (params.offsetY - 0.5) * drawH;

      ctx.drawImage(
        image,
        -drawW / 2 + offX,
        -drawH / 2 + offY,
        drawW,
        drawH
      );

      ctx.restore();
    }

    ctx.restore();
  }, [image, params]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = clientWidth * dpr;
        canvasRef.current.height = clientHeight * dpr;
        canvasRef.current.style.width = `${clientWidth}px`;
        canvasRef.current.style.height = `${clientHeight}px`;
        canvasRef.current.getContext('2d')?.scale(dpr, dpr);
        draw();
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [draw]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `kaleidoscope-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white overflow-hidden font-sans selection:bg-emerald-500/30 relative">
      {/* --- Sidebar Controls --- */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ 
              x: 0, 
              opacity: isInteracting ? 0.05 : 1,
              pointerEvents: isInteracting ? 'none' : 'auto'
            }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200,
              opacity: { duration: 0.2 }
            }}
            className="fixed inset-y-0 left-0 w-full md:w-80 h-full bg-[#0a0a0a]/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 shadow-2xl"
          >
            <div className="p-6 md:p-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Maximize2 className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h1 className="font-bold tracking-tight text-lg leading-none">Kaleido</h1>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Studio v1.0</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <Settings2 className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 space-y-8 md:space-y-10 custom-scrollbar">
              {/* Image Selection */}
              <section className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Source Image</h2>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_IMAGES.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.src = url;
                        img.onload = () => setImage(img);
                      }}
                      className={cn(
                        "aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300",
                        image?.src === url ? "border-emerald-500 scale-95 shadow-lg shadow-emerald-500/20" : "border-transparent opacity-40 hover:opacity-100"
                      )}
                    >
                      <img src={url} className="w-full h-full object-cover" alt={`Preset ${idx}`} />
                    </button>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
                    <Upload className="w-4 h-4 text-white/20 group-hover:text-emerald-500" />
                    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                  </label>
                </div>
              </section>

              {/* Geometric Style */}
              <section className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Geometric Style</h2>
                <div className="flex gap-2">
                  {[
                    { id: 'radial', icon: Circle, label: 'Radial' },
                    { id: 'square', icon: Square, label: 'Square' },
                    { id: 'hexagon', icon: Hexagon, label: 'Hex' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => {
                        let slices = params.slices;
                        if (style.id === 'square') slices = 8;
                        if (style.id === 'hexagon') slices = 12;
                        setParams(p => ({ ...p, style: style.id as GeometricStyle, slices }));
                      }}
                      className={cn(
                        "flex-1 py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-300",
                        params.style === style.id 
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-lg shadow-emerald-500/5" 
                          : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
                      )}
                    >
                      <style.icon className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{style.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Parameters */}
              <section className="space-y-6">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Parameters</h2>
                
                <Slider 
                  label="Slices" 
                  value={params.slices} 
                  min={2} 
                  max={32} 
                  step={2} 
                  onChange={(v) => setParams(p => ({ ...p, slices: v }))} 
                  onStart={startInteraction}
                  onEnd={endInteraction}
                />
                
                <Slider 
                  label="Zoom" 
                  value={params.zoom} 
                  min={0.1} 
                  max={5} 
                  onChange={(v) => setParams(p => ({ ...p, zoom: v }))} 
                  onStart={startInteraction}
                  onEnd={endInteraction}
                />

                <Slider 
                  label="Image Rotation" 
                  value={params.rotation} 
                  min={0} 
                  max={360} 
                  onChange={(v) => setParams(p => ({ ...p, rotation: v }))} 
                  onStart={startInteraction}
                  onEnd={endInteraction}
                />

                <Slider 
                  label="Canvas Rotation" 
                  value={params.kaleidoscopeRotation} 
                  min={0} 
                  max={360} 
                  onChange={(v) => setParams(p => ({ ...p, kaleidoscopeRotation: v }))} 
                  onStart={startInteraction}
                  onEnd={endInteraction}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Slider 
                    label="Offset X" 
                    value={params.offsetX} 
                    min={0} 
                    max={1} 
                    onChange={(v) => setParams(p => ({ ...p, offsetX: v }))} 
                    onStart={startInteraction}
                    onEnd={endInteraction}
                  />
                  <Slider 
                    label="Offset Y" 
                    value={params.offsetY} 
                    min={0} 
                    max={1} 
                    onChange={(v) => setParams(p => ({ ...p, offsetY: v }))} 
                    onStart={startInteraction}
                    onEnd={endInteraction}
                  />
                </div>
              </section>

              {/* Actions */}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setParams(DEFAULT_PARAMS)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Reset</span>
                </button>
                <button
                  onClick={downloadImage}
                  className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Export</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* --- Main Viewport --- */}
      <main 
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center bg-[#050505]"
      >
        {/* Toggle Sidebar Button */}
        <AnimatePresence>
          {!isSidebarOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isInteracting ? 0 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setIsSidebarOpen(true)}
              className="absolute top-6 md:top-8 left-6 md:left-8 z-30 p-4 bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-[#111] transition-all shadow-2xl group"
            >
              <Settings2 className="w-5 h-5 text-emerald-500 group-hover:rotate-90 transition-transform duration-500" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Full Screen Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
        
        {!image && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/20">
            <ImageIcon className="w-12 h-12 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-[0.3em]">Initializing...</p>
          </div>
        )}

        {/* Floating Info - Hidden on small mobile */}
        <div className="hidden sm:flex absolute bottom-8 right-8 items-center gap-6 bg-black/60 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span>Live Rendering</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <span>{params.slices} Segments</span>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-emerald-500/60">{params.style}</span>
        </div>
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
