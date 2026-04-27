import React from 'react';
import { 
  Pencil, 
  Eraser, 
  Highlighter, 
  MousePointer2, 
  Trash2, 
  Upload,
  Files,
  Type,
  Layout,
  StickyNote
} from 'lucide-react';
import { motion } from 'motion/react';
import { Tool, COLORS } from '../types';
import { cn } from '../lib/utils';

interface ToolbarProps {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  activeColor: string;
  onColorSelect: (color: string) => void;
  onClear: () => void;
  onFileClick: () => void;
  fileName: string | null;
  onToggleWhiteboard: () => void;
  isWhiteboard: boolean;
  onToggleNotes: () => void;
}

export const Toolbar = ({
  activeTool,
  onToolSelect,
  activeColor,
  onColorSelect,
  onClear,
  onFileClick,
  fileName,
  onToggleWhiteboard,
  isWhiteboard,
  onToggleNotes
}: ToolbarProps) => {
  return (
    <div className="flex flex-row md:flex-col gap-2 sm:gap-4 z-50 w-full md:w-20 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
      {/* Main Tools */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex flex-row md:flex-col gap-2 sm:gap-3"
      >
        <ToolButton 
          icon={<Layout size={24} />} 
          active={isWhiteboard} 
          onClick={onToggleWhiteboard}
          label="Board"
          colorClass="bg-pink-500"
          shadowColor="#be185d"
        />
        <ToolButton 
          icon={<Pencil size={24} />} 
          active={activeTool === 'pen'} 
          onClick={() => onToolSelect('pen')}
          label="Pen"
          colorClass="bg-[#4ECDC4]"
          shadowColor="#399D95"
        />
        <ToolButton 
          icon={<Type size={24} />} 
          active={activeTool === 'text'} 
          onClick={() => onToolSelect('text')}
          label="Text"
          colorClass="bg-orange-400"
          shadowColor="#c2410c"
        />
        <ToolButton 
          icon={<Highlighter size={24} />} 
          active={activeTool === 'highlighter'} 
          onClick={() => onToolSelect('highlighter')}
          label="Glow"
          colorClass="bg-[#FFD93D]"
          shadowColor="#E5C12D"
          textColor="text-[#8C6A00]"
        />
        <ToolButton 
          icon={<Eraser size={24} />} 
          active={activeTool === 'eraser'} 
          onClick={() => onToolSelect('eraser')}
          label="Erase"
          colorClass="bg-[#FF6B6B]"
          shadowColor="#D15555"
        />
        <ToolButton 
          icon={<MousePointer2 size={24} />} 
          active={activeTool === 'pointer'} 
          onClick={() => onToolSelect('pointer')}
          label="Point"
          colorClass="bg-[#6C5CE7]"
          shadowColor="#5448B7"
        />
        
        <div className="flex flex-row md:flex-col gap-2 sm:gap-3 mt-0 md:mt-4">
           {/* Colors */}
          <div className="bg-white/90 backdrop-blur-md p-2 md:p-3 rounded-2xl md:rounded-3xl shadow-xl border-2 md:border-4 border-white flex flex-row md:flex-col items-center gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => onColorSelect(color)}
                className={cn(
                  "w-6 h-6 md:w-8 md:h-8 rounded-full transition-all hover:scale-110 active:scale-95 border-2",
                  activeColor === color ? "border-black scale-125 shadow-lg" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <ToolButton 
            icon={<Trash2 size={18} />} 
            active={false} 
            onClick={onClear}
            label="Clear"
            colorClass="bg-white"
            shadowColor="#E0E0E0"
            textColor="text-red-500"
            className="border-2 md:border-4 border-[#E0E0E0]"
          />
        </div>
      </motion.div>

      <div className="flex-1" />

      {/* File & Notes Control */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-row md:flex-col gap-2"
      >
        <ToolButton 
          icon={<StickyNote size={24} />} 
          onClick={onToggleNotes} 
          active={false} 
          label="Notes"
          colorClass="bg-yellow-100"
          shadowColor="#eab308"
          textColor="text-yellow-700"
        />
        <ToolButton 
          icon={fileName ? <Files size={24} /> : <Upload size={24} />} 
          onClick={onFileClick} 
          active={false} 
          label="Files"
          colorClass="bg-white"
          shadowColor="#E0E0E0"
          className="border-4 border-[#E0E0E0]"
        />
      </motion.div>
    </div>
  );
};

interface ToolButtonProps {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
  colorClass?: string;
  shadowColor?: string;
  textColor?: string;
}

const ToolButton = ({ 
  icon, 
  active, 
  onClick, 
  label, 
  disabled, 
  className,
  colorClass = "bg-white",
  shadowColor = "#ddd",
  textColor = "text-white"
}: ToolButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    style={{ boxShadow: active ? 'none' : `0 6px 0 ${shadowColor}`, transform: active ? 'translateY(4px)' : 'none' }}
    className={cn(
      "w-full aspect-square rounded-3xl transition-all relative group disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1",
      colorClass,
      active ? "shadow-inner brightness-95" : "hover:-translate-y-0.5",
      className
    )}
  >
    <div className={active ? "text-white" : textColor}>{icon}</div>
    <span className={cn("text-[9px] font-black uppercase tracking-tighter", active ? "text-white" : textColor)}>
      {label}
    </span>
  </button>
);
