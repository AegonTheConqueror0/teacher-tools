/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Search, GraduationCap, RotateCcw, StickyNote, Layout, Type } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { AnnotationLayer } from './components/AnnotationLayer';
import { Dashboard } from './components/Dashboard';
import { Tool, DrawingPath, AnnotationData, COLORS, Student } from './types';
import { cn } from './lib/utils';
import { v4 as uuidv4 } from 'uuid';

// Set up PDF.js worker to use the modern ESM build
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function App() {
  const [view, setView] = useState<'dashboard' | 'classroom'>('dashboard');
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('students');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [activeTool, setActiveTool] = useState<Tool>('pointer');
  const [activeColor, setActiveColor] = useState<string>(COLORS[0]);
  const [annotations, setAnnotations] = useState<AnnotationData>(() => {
    const saved = localStorage.getItem('teacher-annotations');
    return saved ? JSON.parse(saved) : {};
  });
  const [stars, setStars] = useState<number>(() => {
    const saved = localStorage.getItem('stars');
    return saved ? parseInt(saved) : 1250;
  });
  const [showStarAnim, setShowStarAnim] = useState(false);
  const [pageInput, setPageInput] = useState<string>('');
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [isWhiteboard, setIsWhiteboard] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(() => localStorage.getItem('teacher-notes') || '');

  useEffect(() => {
    localStorage.setItem('teacher-notes', notes);
    if (currentStudent) {
      setStudents(prev => prev.map(s => 
        s.id === currentStudent.id ? { ...s, notes } : s
      ));
    }
  }, [notes, currentStudent]);

  useEffect(() => {
    localStorage.setItem('teacher-annotations', JSON.stringify(annotations));
    if (currentStudent) {
      setStudents(prev => prev.map(s => 
        s.id === currentStudent.id ? { ...s, annotations } : s
      ));
    }
  }, [annotations, currentStudent]);

  useEffect(() => {
    localStorage.setItem('stars', stars.toString());
    if (currentStudent) {
      setStudents(prev => prev.map(s => 
        s.id === currentStudent.id ? { ...s, stars } : s
      ));
    }
  }, [stars, currentStudent]);

  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);
  
  const handleAddStudent = (studentData: Omit<Student, 'id' | 'stars'>) => {
    const newStudent: Student = {
      ...studentData,
      id: uuidv4(),
      stars: 0
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const handleDeleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const handleSelectStudent = (student: Student) => {
    setCurrentStudent(student);
    setStars(student.stars);
    setNotes(student.notes || ''); 
    setView('classroom');
    setFile(null); // Reset file when entering new student classroom
    setAnnotations(student.annotations || {});
    setPageNumber(1);
    setIsWhiteboard(false);
  };

  const handleExitClassroom = () => {
    // Save current session data to student record before leaving
    if (currentStudent) {
      setStudents(prev => prev.map(s => 
        s.id === currentStudent.id ? { ...s, stars, notes, annotations } : s
      ));
    }
    setView('dashboard');
    setCurrentStudent(null);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [viewerSize, setViewerSize] = useState({ width: 800, height: 450 });

  useEffect(() => {
    const updateSize = () => {
      if (viewerContainerRef.current) {
        const width = viewerContainerRef.current.clientWidth * 0.9;
        setViewerSize({
          width,
          height: width * (9/16)
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [file, isWhiteboard]);

  // Sound Effect for Rewards
  const playRewardSound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  };

  const giveStar = () => {
    setStars(prev => prev + 10);
    setShowStarAnim(true);
    playRewardSound();
    setTimeout(() => setShowStarAnim(false), 1500);
  };

  const resetStars = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStars(0);
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const newPage = parseInt(pageInput);
    if (!isNaN(newPage) && newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
    }
    setIsEditingPage(false);
  };

  const [pdfPageSize, setPdfPageSize] = useState<{ width: number, height: number } | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0];
    if (nextFile) {
      setFile(nextFile);
      setPageNumber(1);
      setAnnotations({});
      setPdfPageSize(null);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onPageRenderSuccess = useCallback((page: any) => {
    // page.getViewport provides exact dimensions at current scale
    const viewport = page.getViewport({ scale });
    setPdfPageSize({
      width: viewport.width,
      height: viewport.height
    });
  }, [scale]);

  const handleSavePath = useCallback((page: number, path: DrawingPath) => {
    setAnnotations(prev => ({
      ...prev,
      [page]: [...(prev[page] || []), path]
    }));
  }, []);

  const handleUpdatePath = useCallback((page: number, index: number, path: DrawingPath) => {
    setAnnotations(prev => {
      const pagePaths = [...(prev[page] || [])];
      pagePaths[index] = path;
      return {
        ...prev,
        [page]: pagePaths
      };
    });
  }, []);

  const handleClearPage = useCallback(() => {
    setAnnotations(prev => {
      const next = { ...prev };
      delete next[pageNumber];
      return next;
    });
  }, [pageNumber]);

  const changePage = (dir: 'prev' | 'next') => {
    if (dir === 'prev' && pageNumber > 1) {
      setPageNumber(prev => prev - 1);
    } else if (dir === 'next') {
      if (isWhiteboard) {
        setPageNumber(prev => prev + 1);
      } else if (pageNumber < numPages) {
        setPageNumber(prev => prev + 1);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') changePage('prev');
      if (e.key === 'ArrowRight') changePage('next');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages, isWhiteboard]);

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#2D3436] font-sans selection:bg-indigo-100 overflow-hidden flex flex-col">
      <AnimatePresence mode="wait">
        {view === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Dashboard 
              students={students} 
              onSelectStudent={handleSelectStudent}
              onAddStudent={handleAddStudent}
              onDeleteStudent={handleDeleteStudent}
              onUpdateStudent={handleUpdateStudent}
            />
          </motion.div>
        ) : (
          <motion.div
            key="classroom"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-screen"
          >
            {/* Header */}
            <header className="px-4 sm:px-6 py-2 sm:py-3 bg-[#FF7D5E] border-b-[4px] sm:border-b-[6px] border-[#D45D40] flex items-center justify-between z-20 shadow-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  onClick={handleExitClassroom}
                  className="w-9 h-9 sm:w-11 sm:h-11 bg-white rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-sm hover:scale-110 active:scale-95 transition-all"
                >
                  🏠
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                    Classroom: <span className="font-normal opacity-90 truncate max-w-[150px] sm:max-w-none inline-block align-bottom">{currentStudent?.name || "Ready?"}</span>
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-[#FFE58F] text-[#8C6A00] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black text-[10px] sm:text-xs tracking-wider shadow-sm hidden xs:block uppercase">
                  {currentStudent?.subject} • {currentStudent?.level}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-xs hidden sm:block uppercase">Teacher Logged</span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#88C0D0] border-2 sm:border-3 border-white shadow-md flex items-center justify-center text-white font-black">
                    T
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 relative overflow-hidden p-3 sm:p-5">
              {/* Teaching Toolbar - Floating on the left */}
              <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none h-auto max-h-[85vh] flex items-center">
                <div className="pointer-events-auto">
                  <Toolbar 
                    activeTool={activeTool}
                    onToolSelect={setActiveTool}
                    activeColor={activeColor}
                    onColorSelect={setActiveColor}
                    onClear={handleClearPage}
                    onFileClick={() => fileInputRef.current?.click()}
                    fileName={file?.name || null}
                    isWhiteboard={isWhiteboard}
                    onToggleWhiteboard={() => {
                      setIsWhiteboard(!isWhiteboard);
                      if (!isWhiteboard) {
                        setPageNumber(1);
                      }
                    }}
                    onToggleNotes={() => setShowNotes(!showNotes)}
                  />
                </div>
              </div>

              <div className="h-full flex flex-col md:flex-row gap-3 sm:gap-5">
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={onFileChange} 
                  accept=".pdf" 
                  className="hidden" 
                />

                {/* PDF Viewer Area - Add margin-left on desktop to clear floating toolbar */}
                <div 
                  ref={viewerContainerRef}
                  className="flex-1 bg-[#E2E8F0] rounded-[32px] border-[10px] border-white shadow-[inset_0_2px_15px_rgba(0,0,0,0.1)] overflow-auto flex flex-col items-center py-8 relative sm:ml-24"
                >
          <AnimatePresence mode="wait">
            {!file && !isWhiteboard ? (
              <motion.div 
                key="empty"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.1, opacity: 0 }}
                className="max-w-md w-full bg-white rounded-[40px] p-12 text-center shadow-xl flex flex-col items-center gap-6 my-auto"
              >
                <div className="w-24 h-24 bg-[#E8F5E9] rounded-3xl flex items-center justify-center mb-2 transform rotate-6 border-4 border-white shadow-lg">
                  <Upload size={48} className="text-[#4ECDC4]" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-[#2D3436] mb-2">Welcome Teacher!</h2>
                  <p className="text-gray-500 font-bold">Pick a PDF lesson or use the Magic Board.</p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 bg-[#FF7D5E] hover:bg-[#ff6a45] text-white rounded-3xl font-black text-lg shadow-[0_6px_0_#D45D40] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    LOAD LESSON
                  </button>
                  <button 
                    onClick={() => setIsWhiteboard(true)}
                    className="w-full py-5 bg-[#4ECDC4] hover:bg-[#3db8af] text-white rounded-3xl font-black text-lg shadow-[0_6px_0_#399D95] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    MAGIC BOARD
                  </button>
                </div>
              </motion.div>
            ) : isWhiteboard ? (
              <motion.div 
                key="whiteboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative shadow-[0_15px_40px_rgba(0,0,0,0.2)] bg-white rounded-2xl"
                style={{ width: '80%', aspectRatio: '16/9' }}
              >
                <AnnotationLayer
                  pageNumber={pageNumber}
                  width={viewerSize.width}
                  height={viewerSize.height}
                  activeTool={activeTool}
                  paths={annotations[pageNumber] || []}
                  color={activeColor}
                  onSavePath={handleSavePath}
                  onUpdatePath={handleUpdatePath}
                  onClearPage={handleClearPage}
                />
                <div className="absolute top-4 right-4 text-gray-200 pointer-events-none select-none text-4xl font-black opacity-10">
                  MAGIC BOARD
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="document"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative shadow-[0_15px_40px_rgba(0,0,0,0.2)] bg-white p-2 rounded-sm"
              >
                <Document
                  file={file}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div className="p-12 text-center font-black text-[#FF7D5E]">OPENING BOOK...</div>}
                >
                  <div className="relative" style={pdfPageSize ? { width: pdfPageSize.width, height: pdfPageSize.height } : {}}>
                    <Page 
                      pageNumber={pageNumber} 
                      scale={scale} 
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onRenderSuccess={onPageRenderSuccess}
                      loading={<div className="bg-gray-100 animate-pulse" style={pdfPageSize ? { width: pdfPageSize.width, height: pdfPageSize.height } : { width: 400, height: 600 }} />}
                    />
                    {/* Annotation Layer should overlay exactly on the page */}
                    {pdfPageSize && (
                      <div className="absolute inset-0 z-10">
                        <AnnotationLayer
                          pageNumber={pageNumber}
                          width={pdfPageSize.width}
                          height={pdfPageSize.height}
                          activeTool={activeTool}
                          paths={annotations[pageNumber] || []}
                          color={activeColor}
                          onSavePath={handleSavePath}
                          onUpdatePath={handleUpdatePath}
                          onClearPage={handleClearPage}
                        />
                      </div>
                    )}
                  </div>
                </Document>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Control Bar */}
          {(file || isWhiteboard) && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#2D3436] rounded-full flex items-center p-3 px-8 gap-10 shadow-[0_12px_40px_rgba(0,0,0,0.4)] border-2 border-white/10 max-w-[90vw]">
              {!isWhiteboard && (
                <div className="flex items-center gap-4 sm:gap-6">
                  <button onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} className="text-xl sm:text-2xl text-white hover:scale-125 transition-transform">➖</button>
                  <span className="text-white font-black text-xs sm:text-sm w-10 sm:w-12 text-center">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(s + 0.25, 4))} className="text-xl sm:text-2xl text-white hover:scale-125 transition-transform">➕</button>
                </div>
              )}
              
              {!isWhiteboard && <div className="w-px h-6 bg-white/20" />}

              <div className="flex items-center gap-3 sm:gap-5">
                <button 
                  onClick={() => changePage('prev')}
                  disabled={pageNumber <= 1}
                  className="bg-[#444] text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center disabled:opacity-20 hover:bg-[#666] transition-colors"
                >
                  ◀
                </button>
                <div className="flex flex-col items-center min-w-[80px] sm:min-w-[100px]">
                  {isEditingPage && !isWhiteboard ? (
                    <form onSubmit={handlePageJump} className="flex items-center">
                      <input
                        autoFocus
                        type="text"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onBlur={() => setIsEditingPage(false)}
                        className="w-10 sm:w-12 bg-white text-[#2D3436] font-black text-center rounded-lg text-sm"
                        placeholder="Page"
                      />
                    </form>
                  ) : (
                    <button 
                      onClick={() => {
                        if (!isWhiteboard) {
                          setPageInput(pageNumber.toString());
                          setIsEditingPage(true);
                        }
                      }}
                      className="text-white font-black text-xs sm:text-sm uppercase tracking-tighter hover:scale-110 transition-transform"
                    >
                      {isWhiteboard ? `Board ${pageNumber}` : `Page ${pageNumber} / ${numPages}`}
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => changePage('next')}
                  disabled={!isWhiteboard && pageNumber >= numPages}
                  className="bg-[#444] text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center disabled:opacity-20 hover:bg-[#666] transition-colors"
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar / Fun Stats */}
        <aside className="w-full md:w-32 lg:w-40 flex flex-row md:flex-col gap-3 sm:gap-5 h-auto md:h-full">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] p-3 sm:p-5 border-[4px] sm:border-[6px] border-[#E8F5E9] shadow-md flex-1 md:flex-initial lg:flex-1 min-w-[120px] sm:min-w-0 hidden sm:block">
            <h3 className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 sm:mb-4">Class Log</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="bg-[#F8F9FA] p-2 sm:p-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold border-2 border-gray-100">Welcome! 👋</div>
              <div className="bg-[#F8F9FA] p-2 sm:p-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold border-2 border-gray-100 truncate">
                {isWhiteboard ? 'Magic Board' : (file ? `PDF: ${file.name.slice(0, 5)}...` : 'No PDF')}
              </div>
            </div>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={giveStar}
            className="flex-1 md:flex-initial bg-[#6C5CE7] rounded-[24px] sm:rounded-[32px] p-3 sm:p-5 text-center shadow-[0_4px_0_#5448B7] border-3 sm:border-4 border-white/20 group relative overflow-hidden flex flex-col items-center cursor-pointer"
          >
             <div className="text-2xl sm:text-3xl mb-1 group-hover:animate-bounce">⭐</div>
             <div className="text-xl sm:text-2xl font-black text-white">{stars.toLocaleString()}</div>
             <div className="text-[8px] sm:text-[10px] font-black text-white/70 uppercase tracking-tighter">Star Reward</div>
             
             {/* Reset Button */}
             <button 
                onClick={resetStars}
                className="absolute top-2 right-2 w-6 h-6 bg-white/10 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                title="Reset Stars"
             >
               <RotateCcw size={12} />
             </button>

             {/* Simple flash effect on click */}
             <AnimatePresence>
               {showStarAnim && (
                 <motion.div 
                   initial={{ scale: 0, opacity: 1 }}
                   animate={{ scale: 6, opacity: 0 }}
                   className="absolute inset-0 bg-white/20 rounded-full"
                 />
               )}
             </AnimatePresence>
          </motion.div>
        </aside>
      </div>

      {/* Teacher Notes Drawer */}
        <AnimatePresence>
          {showNotes && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-white shadow-2xl z-[60] flex flex-col border-l-8 border-[#FFD93D]"
            >
              <div className="p-6 bg-[#FFD93D] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="text-[#8C6A00]" />
                  <h2 className="font-black text-[#8C6A00] uppercase tracking-widest">Teacher Notes</h2>
                </div>
                <button onClick={() => setShowNotes(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="text-[#8C6A00]" />
                </button>
              </div>
              <div className="p-6 flex-1 flex flex-col gap-4">
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type your lesson plans here... (Saved automatically!)"
                  className="flex-1 bg-[#FFF9F2] rounded-2xl p-4 font-medium text-gray-700 outline-none border-2 border-transparent focus:border-[#FFD93D] transition-all resize-none"
                />
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Synced to Local Device
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Star Animation Overlay */}
        <AnimatePresence>
          {showStarAnim && (
            <motion.div 
              initial={{ y: 100, scale: 0, opacity: 0 }}
              animate={{ y: -200, scale: [0, 1.5, 1], opacity: 1 }}
              exit={{ y: -400, opacity: 0 }}
              className="fixed bottom-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-[100]"
            >
              <div className="sm:text-8xl text-6xl filter drop-shadow-2xl text-center">⭐</div>
              <div className="sm:text-2xl text-lg font-black text-[#6C5CE7] mt-4 bg-white px-6 py-2 rounded-full shadow-xl text-center whitespace-nowrap">
                SUPER JOB! +10
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  )}
</AnimatePresence>

      {/* Decorative Corner Icon */}
      <div className="fixed bottom-4 right-4 text-6xl opacity-10 pointer-events-none select-none">
        🚀
      </div>
    </div>
  );
}

// Additional icons needed in Toolbar
function ChevronLeft(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
}

function ChevronRight(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
}
