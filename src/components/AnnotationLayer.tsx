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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textInput, setTextInput] = useState<{ x: number, y: number, canvasX: number, canvasY: number } | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPoint[]>([]);

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
        ctx.font = `bold ${path.width * 6}px "Comic Sans MS", cursive, sans-serif`;
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
        drawPath(ctx, {
          points: currentPath,
          color: activeTool === 'highlighter' ? `${color}44` : color,
          width: activeTool === 'pen' ? 4 : activeTool === 'highlighter' ? 20 : 30,
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
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;

    if (path.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.moveTo(path.points[0].x, path.points[0].y);
    path.points.forEach((point, i) => {
      if (i > 0) ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { canvasCoords: DrawingPoint, clientCoords: { x: number, y: number } } => {
    const canvas = canvasRef.current;
    if (!canvas) return { canvasCoords: { x: 0, y: 0 }, clientCoords: { x: 0, y: 0 } };
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
      clientCoords: {
        x: clientX,
        y: clientY
      }
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'select' || activeTool === 'pointer') return;
    
    const { canvasCoords, clientCoords } = getCoordinates(e);

    if (activeTool === 'text') {
      setTextInput({ 
        x: clientCoords.x, 
        y: clientCoords.y, 
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
    if (!isDrawing) return;
    const { canvasCoords } = getCoordinates(e);
    setCurrentPath(prev => [...prev, canvasCoords]);
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentPath.length > 0) {
      const widthMap: Record<Tool, number> = { 
        pen: 4, 
        highlighter: 20, 
        eraser: 30, 
        select: 0, 
        pointer: 0, 
        clear: 0, 
        text: 4 
      };
      onSavePath(pageNumber, {
        points: currentPath,
        color: activeTool === 'highlighter' ? `${color}44` : color,
        width: widthMap[activeTool],
        tool: activeTool
      });
    }
    setCurrentPath([]);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput && inputValue.trim()) {
      onSavePath(pageNumber, {
        points: [{ x: textInput.canvasX, y: textInput.canvasY }],
        color,
        width: 6, // font scale
        tool: 'text',
        text: inputValue.trim()
      });
    }
    setTextInput(null);
    setInputValue("");
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          "absolute top-0 left-0 z-10 touch-none",
          activeTool === 'pointer' ? "cursor-default" : "cursor-crosshair"
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
        <form 
          onSubmit={handleTextSubmit}
          className="fixed z-[100]"
          style={{ left: textInput.x, top: textInput.y }}
        >
          <input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleTextSubmit}
            placeholder="Type and press Enter..."
            style={{ color }}
            className="bg-white border-2 border-dashed border-gray-300 rounded-lg px-3 py-1.5 shadow-xl outline-none font-bold min-w-[200px]"
          />
        </form>
      )}
    </div>
  );
};
