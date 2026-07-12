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

const FONT_FAMILIES = [
  { label: 'Comic Sans', value: '"Comic Sans MS", cursive, sans-serif' },
  { label: 'Sans', value: 'Arial, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: '"Courier New", monospace' },
];

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
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPoint[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<DrawingPoint>({ x: 0, y: 0 });
  const [isHoveringText, setIsHoveringText] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [textDragStartPos, setTextDragStartPos] = useState<{ x: number, y: number } | null>(null);
  const [isCommittedDrag, setIsCommittedDrag] = useState(false);

  const getTextFont = (path?: DrawingPath, size?: number) => {
    const resolvedSize = size ?? path?.fontSize ?? 24;
    const resolvedFamily = path?.fontFamily || fontFamily;
    return `bold ${resolvedSize}px ${resolvedFamily}`;
  };

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
        ctx.font = getTextFont(path, size);
        ctx.fillStyle = path.color;
        ctx.fillText(path.text, path.points[0].x, path.points[0].y);
      } else if (path.tool !== 'text') {
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
  }, [width, height, paths, currentPath, color, activeTool, fontFamily]);

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
          ctx.font = getTextFont(path, size);
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
        // Check if this is a double-click for editing
        if ((e as any).detail === 2) {
          // Double-click: enter edit mode
          const textPath = paths[actualIdx];
          setEditingIdx(actualIdx);
          setInputValue(textPath.text || '');
          setFontSize(textPath.fontSize || 24);
          setFontFamily(textPath.fontFamily || FONT_FAMILIES[0].value);
          setTextInput({ x: 0, y: 0, canvasX: textPath.points[0].x, canvasY: textPath.points[0].y });
          return;
        }
        // Single-click: record position for potential drag or edit
        setTextDragStartPos(canvasCoords);
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

    if (draggingIdx !== null && textDragStartPos) {
      // Check if movement is significant (> 10px threshold)
      const dx = canvasCoords.x - textDragStartPos.x;
      const dy = canvasCoords.y - textDragStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 10 || isCommittedDrag) {
        // Significant movement: drag the text
        const updatedPath = { ...paths[draggingIdx] };
        updatedPath.points = [{
          x: canvasCoords.x - dragOffset.x,
          y: canvasCoords.y - dragOffset.y
        }];
        onUpdatePath(pageNumber, draggingIdx, updatedPath);
        
        // Mark that we've committed to dragging
        if (!isCommittedDrag) {
          setIsCommittedDrag(true);
        }
      }
      return;
    }

    if (activeTool === 'pointer') {
      const ctx = canvasRef.current?.getContext('2d');
      const isOverText = paths.some(path => {
        if (path.tool !== 'text' || !path.text) return false;
        const p = path.points[0];
        if (ctx) {
          const size = path.fontSize || (path.width * 6) || 24;
          ctx.font = getTextFont(path, size);
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
    
    // If we were about to drag text but didn't move much, trigger edit mode
    if (draggingIdx !== null && textDragStartPos !== null && !isCommittedDrag) {
      const textPath = paths[draggingIdx];
      setEditingIdx(draggingIdx);
      setInputValue(textPath.text || '');
      setFontSize(textPath.fontSize || 24);
      setFontFamily(textPath.fontFamily || FONT_FAMILIES[0].value);
      setTextInput({ x: 0, y: 0, canvasX: textPath.points[0].x, canvasY: textPath.points[0].y });
    }
    
    // Always reset dragging state
    setDraggingIdx(null);
    setTextDragStartPos(null);
    setIsCommittedDrag(false);
    
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
      const newPath: DrawingPath = {
        points: [{ x: textInput.canvasX, y: textInput.canvasY }],
        color,
        width: 6, // legacy scale
        fontSize: fontSize,
        fontFamily: fontFamily,
        tool: 'text',
        text: inputValue.trim()
      };
      
      if (editingIdx !== null) {
        // Update existing text
        onUpdatePath(pageNumber, editingIdx, newPath);
      } else {
        // Add new text
        onSavePath(pageNumber, newPath);
      }
      closeTextInput();
    } else if (textInput) {
      closeTextInput();
    }
  };

  const handleDeleteText = () => {
    if (editingIdx !== null) {
      // Mark text as empty to effectively delete it
      const emptyPath: DrawingPath = {
        ...paths[editingIdx],
        text: '',
        tool: 'text'
      };
      onUpdatePath(pageNumber, editingIdx, emptyPath);
      closeTextInput();
    }
  };

  const closeTextInput = () => {
    setTextInput(null);
    setInputValue("");
    setEditingIdx(null);
    setFontSize(24);
    setFontFamily(FONT_FAMILIES[0].value);
    setDraggingIdx(null);
    setTextDragStartPos(null);
    setIsCommittedDrag(false);
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
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <form 
            onSubmit={handleTextSubmit}
            className="flex flex-col items-center gap-3 pointer-events-auto bg-white rounded-3xl p-6 shadow-[0_15px_50px_rgba(0,0,0,0.3)] border-4 border-white max-w-[90vw] sm:max-w-md"
          >
            <h2 className="text-lg font-black text-[#6C5CE7] uppercase tracking-wide">
              {editingIdx !== null ? '✏️ Edit Text' : '✨ Add Text'}
            </h2>
            <div className="flex flex-col gap-3 w-full">
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    closeTextInput();
                  }
                }}
                placeholder="Type here..."
                style={{ color, fontSize: fontSize, fontFamily }}
                autoComplete="off"
                className="bg-gray-50 border-4 border-[#6C5CE7] rounded-2xl px-4 py-3 shadow-md outline-none font-bold w-full text-lg"
              />
              
              <div className="flex flex-col gap-3 bg-gray-50 rounded-2xl p-3 border-2 border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Font:</span>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 flex-1"
                  >
                    {FONT_FAMILIES.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Size:</span>
                  {[16, 24, 32, 48, 64].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size)}
                      className={cn(
                        "w-10 h-10 rounded-lg font-bold text-xs transition-all",
                        fontSize === size ? "bg-[#6C5CE7] text-white scale-110 shadow-lg" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {inputValue.trim() && (
                    <button
                      type="submit"
                      className="flex-1 bg-[#6C5CE7] text-white py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 font-bold uppercase text-sm tracking-wide"
                    >
                      {editingIdx !== null ? '✅ Update' : '✅ Add Text'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeTextInput}
                    className="flex-1 bg-gray-200 text-gray-600 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 font-bold uppercase text-sm tracking-wide"
                  >
                    ❌ Cancel
                  </button>
                </div>
                {editingIdx !== null && (
                  <button
                    type="button"
                    onClick={handleDeleteText}
                    className="w-full bg-red-500 text-white py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 font-bold uppercase text-sm tracking-wide"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
