import React, { useRef, useEffect, useState } from 'react';
import { DrawingPath, DrawingPoint, Tool } from '../types';
import { cn } from '../lib/utils';

interface AnnotationLayerProps {
  pageNumber: number;
  width: number;
  height: number;
  activeTool: Tool;
  paths: DrawingPath[];
  color: string;
  onSavePath: (page: number, path: DrawingPath) => void;
  onUpdatePath: (page: number, pathIndex: number, newPath: DrawingPath) => void;
  onClearPage: (page: number) => void;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  pageNumber,
  width,
  height,
  activeTool,
  paths,
  color,
  onSavePath,
  onUpdatePath,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textInput, setTextInput] = useState<{ x: number, y: number, canvasX: number, canvasY: number } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPoint[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<DrawingPoint>({ x: 0, y: 0 });
  const [isHoveringText, setIsHoveringText] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and Redraw
    ctx.clearRect(0, 0, width, height);
    
    // Draw existing paths
    paths.forEach(path => {
      if (path.tool === 'text' && path.text) {
        ctx.globalCompositeOperation = 'source-over';
        const size = path.fontSize || (path.width * 6) || 24;
        ctx.font = `bold ${size}px "Comic Sans MS", cursive, sans-serif`;
        ctx.fillStyle = path.color;
        ctx.fillText(path.text, path.points[0].x, path.points[0].y);
      } else {
        drawPath(ctx, path);
      }
    });

    // Draw current active path
    if (currentPath.length > 0) {
      if (activeTool === 'text') {
        // Just a cursor for text tool start
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(currentPath[0].x, currentPath[0].y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        const isGlow = activeTool === 'highlighter';
        const isEraser = activeTool === 'eraser';
        
        drawPath(ctx, {
          points: currentPath,
          color: isGlow ? color : color, // transparency handled in drawPath
          width: isGlow ? 25 : isEraser ? 40 : 6,
          tool: activeTool
        });
      }
    }
  }, [width, height, paths, currentPath, color, activeTool]);

  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 1) return;
    
    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    if (path.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply'; // Better for highlighting
      ctx.strokeStyle = `${path.color}88`; // Semi-transparent
      ctx.lineWidth = path.width;
      
      // Add a slight glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = path.color;
    } else if (path.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = path.width;
      ctx.shadowBlur = 0;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.shadowBlur = 0;
    }

    ctx.moveTo(path.points[0].x, path.points[0].y);
    path.points.forEach((point, i) => {
      if (i > 0) ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    
    // Reset shadow for next path
    ctx.shadowBlur = 0;
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { canvasCoords: DrawingPoint, relativeCoords: { x: number, y: number } } => {
    const canvas = canvasRef.current;
    if (!canvas) return { canvasCoords: { x: 0, y: 0 }, relativeCoords: { x: 0, y: 0 } };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      canvasCoords: {
        x: (clientX - rect.left) * (width / rect.width),
        y: (clientY - rect.top) * (height / rect.height)
      },
      relativeCoords: {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    // If clicking inside the form, don't trigger canvas start
    if ((e.target as HTMLElement).closest('form')) return;
    
    const { canvasCoords, relativeCoords } = getCoordinates(e);

    if (activeTool === 'pointer') {
      const ctx = canvasRef.current?.getContext('2d');
      // Find a text element to drag
      const idx = [...paths].reverse().findIndex(path => {
        if (path.tool !== 'text' || !path.text) return false;
        const p = path.points[0];
        
        // Better hit detection using text measurement
        if (ctx) {
          const size = path.fontSize || (path.width * 6) || 24;
          ctx.font = `bold ${size}px "Comic Sans MS", cursive, sans-serif`;
          const metrics = ctx.measureText(path.text);
          const width = metrics.width;
          const height = size; // rough estimate
          
          // fillText draws from the baseline (y) upwards or around it depending on textBaseline
          // Default is alphabetic. So y is the baseline.
          // Let's assume a box from x, y-height to x+width, y
          return canvasCoords.x >= p.x - 10 && 
                 canvasCoords.x <= p.x + width + 10 && 
                 canvasCoords.y >= p.y - height && 
                 canvasCoords.y <= p.y + 10;
        }

        // Fallback to point dist if no ctx
        const dist = Math.sqrt((p.x - canvasCoords.x)**2 + (p.y - canvasCoords.y)**2);
        return dist < 40;
      });

      if (idx !== -1) {
        const actualIdx = paths.length - 1 - idx;
        setDraggingIdx(actualIdx);
        setDragOffset({
          x: canvasCoords.x - paths[actualIdx].points[0].x,
          y: canvasCoords.y - paths[actualIdx].points[0].y
        });
        return;
      }
    }

    if (activeTool === 'select' || activeTool === 'pointer') return;
    
    if (activeTool === 'text') {
      // If we already have a text input, submit it first
      if (textInput && inputValue.trim()) {
        handleTextSubmit();
      }
      
      setTextInput({ 
        x: relativeCoords.x, 
        y: relativeCoords.y, 
        canvasX: canvasCoords.x, 
        canvasY: canvasCoords.y 
      });
      setInputValue("");
      return;
    }

    setIsDrawing(true);
    setCurrentPath([canvasCoords]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const { canvasCoords } = getCoordinates(e);

    if (draggingIdx !== null) {
      const updatedPath = { ...paths[draggingIdx] };
      updatedPath.points = [{
        x: canvasCoords.x - dragOffset.x,
        y: canvasCoords.y - dragOffset.y
      }];
      onUpdatePath(pageNumber, draggingIdx, updatedPath);
      return;
    }

    if (activeTool === 'pointer') {
      const ctx = canvasRef.current?.getContext('2d');
      const isOverText = paths.some(path => {
        if (path.tool !== 'text' || !path.text) return false;
        const p = path.points[0];
        if (ctx) {
          const size = path.fontSize || (path.width * 6) || 24;
          ctx.font = `bold ${size}px "Comic Sans MS", cursive, sans-serif`;
          const metrics = ctx.measureText(path.text);
          const width = metrics.width;
          const height = size;
          return canvasCoords.x >= p.x - 10 && 
                 canvasCoords.x <= p.x + width + 10 && 
                 canvasCoords.y >= p.y - height && 
                 canvasCoords.y <= p.y + 10;
        }
        return false;
      });
      setIsHoveringText(isOverText);
    } else {
      setIsHoveringText(false);
    }

    if (!isDrawing || activeTool === 'text') return;
    setCurrentPath(prev => [...prev, canvasCoords]);
  };

  const handleEnd = () => {
    setIsHoveringText(false);
    if (draggingIdx !== null) {
      setDraggingIdx(null);
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentPath.length > 0) {
      const widthMap: Record<Tool, number> = { 
        pen: 6, 
        highlighter: 25, 
        eraser: 40, 
        select: 0, 
        pointer: 0, 
        clear: 0, 
        text: 6 
      };
      onSavePath(pageNumber, {
        points: currentPath,
        color: color,
        width: widthMap[activeTool],
        tool: activeTool
      });
    }
    setCurrentPath([]);
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (textInput && inputValue.trim()) {
      onSavePath(pageNumber, {
        points: [{ x: textInput.canvasX, y: textInput.canvasY }],
        color,
        width: 6, // legacy scale
        fontSize: fontSize,
        tool: 'text',
        text: inputValue.trim()
      });
      setTextInput(null);
      setInputValue("");
    } else if (textInput) {
      setTextInput(null);
      setInputValue("");
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          "absolute top-0 left-0 z-10 touch-none w-full h-full",
          activeTool === 'pointer' ? (isHoveringText ? "cursor-move" : "cursor-default") : 
          activeTool === 'text' ? "cursor-text" : "cursor-crosshair"
        )}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      
      {textInput && (
        <div 
          className="absolute z-50 pointer-events-auto"
          style={{ left: textInput.x, top: textInput.y - 20 }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <form 
            onSubmit={handleTextSubmit}
            className="flex items-center gap-2"
          >
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setTextInput(null);
                    setInputValue("");
                  }
                }}
                placeholder="Type here..."
                style={{ color }}
                autoComplete="off"
                className="bg-white border-4 border-[#6C5CE7] rounded-xl px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.3)] outline-none font-bold min-w-[200px] text-xl"
              />
              <div className="flex items-center gap-2 bg-white rounded-xl p-2 border-2 border-gray-100 shadow-md">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Size:</span>
                {[16, 24, 32, 48, 64].map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFontSize(size)}
                    className={cn(
                      "w-8 h-8 rounded-lg font-bold text-xs transition-all",
                      fontSize === size ? "bg-[#6C5CE7] text-white scale-110" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {inputValue.trim() && (
                <button
                  type="submit"
                  className="bg-[#6C5CE7] text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform active:scale-95"
                >
                  ✅
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setTextInput(null);
                  setInputValue("");
                }}
                className="bg-white text-gray-400 p-2 rounded-xl shadow-lg hover:scale-110 transition-transform active:scale-95 border-2 border-gray-100"
              >
                ❌
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
