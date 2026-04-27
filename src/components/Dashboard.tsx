import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, Clock, BookOpen, GraduationCap, ArrowRight, UserPlus, Trash2, Pencil } from 'lucide-react';
import { Student } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onAddStudent: (student: Omit<Student, 'id' | 'stars'>) => void;
  onDeleteStudent: (id: string) => void;
}

export const Dashboard = ({ students, onSelectStudent, onAddStudent, onDeleteStudent, onUpdateStudent }: DashboardProps & { onUpdateStudent: (student: Student) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    level: '',
    schedule: ''
  });

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({ name: '', subject: '', level: '', schedule: '' });
    setIsAdding(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({ 
      name: student.name, 
      subject: student.subject, 
      level: student.level, 
      schedule: student.schedule 
    });
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        ...formData
      });
    } else {
      onAddStudent(formData);
    }
    
    setFormData({ name: '', subject: '', level: '', schedule: '' });
    setIsAdding(false);
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[#FF7D5E] rounded-2xl flex items-center justify-center text-2xl shadow-lg border-b-4 border-[#D45D40]">
                🏫
              </div>
              <h1 className="text-3xl font-black text-[#2D3436]">Teacher Dashboard</h1>
            </div>
            <p className="text-gray-500 font-bold ml-2">Welcome back! You have {students.length} students today.</p>
          </div>
          
          <button 
            onClick={handleOpenAdd}
            className="group flex items-center gap-2 bg-[#6C5CE7] hover:bg-[#5448B7] text-white px-6 py-3 rounded-2xl font-black shadow-[0_4px_0_#483D9E] active:translate-y-1 active:shadow-none transition-all"
          >
            <UserPlus size={20} />
            ADD NEW STUDENT
          </button>
        </header>

        {/* Student Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {students.map((student) => (
            <motion.div
              key={student.id}
              whileHover={{ y: -8 }}
              className="bg-white rounded-[32px] p-6 border-[6px] border-white shadow-xl hover:shadow-2xl transition-all relative group overflow-hidden"
            >
              {/* Background Decoration */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F8F9FA] rounded-full group-hover:bg-indigo-50 transition-colors" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 bg-[#88C0D0] rounded-2xl flex items-center justify-center text-2xl border-b-4 border-[#5E81AC] text-white shadow-md">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(student);
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-500 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 bg-gray-50 sm:bg-white shadow-sm rounded-full"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${student.name}'s classroom?`)) {
                          onDeleteStudent(student.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 bg-gray-50 sm:bg-white shadow-sm rounded-full"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <span className="bg-[#FFE58F] text-[#8C6A00] px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                    {student.level || "Unprioritized"}
                  </span>
                </div>

                <h2 className="text-xl font-black text-[#2D3436] mb-1">{student.name}</h2>
                <p className="text-indigo-500 font-bold text-sm mb-4">{student.subject || "No Subject"}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold bg-gray-50 p-2 rounded-xl">
                    <Clock size={14} className="text-[#FF7D5E]" />
                    {student.schedule || "No Schedule Set"}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold bg-gray-50 p-2 rounded-xl">
                    <GraduationCap size={14} className="text-[#4ECDC4]" />
                    {student.stars} Stars Earned
                  </div>
                </div>

                <button 
                  onClick={() => onSelectStudent(student)}
                  className="w-full flex items-center justify-center gap-2 bg-[#6C5CE7] hover:bg-[#5448B7] text-white py-3.5 rounded-2xl font-black shadow-[0_4px_0_#483D9E] active:translate-y-1 active:shadow-none transition-all group/btn"
                >
                  ENTER CLASS
                  <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}

          {/* Empty State / Add Card */}
          {students.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                👋
              </div>
              <h3 className="text-2xl font-black text-gray-400">No students yet!</h3>
              <p className="text-gray-300 font-bold mb-6">Add your first student to start teaching.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md p-8 relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#FF7D5E]" />
              
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-[#2D3436]">New Student</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Student Name</label>
                  <input 
                    autoFocus
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#F8F9FA] border-2 border-transparent focus:border-indigo-400 outline-none rounded-2xl px-5 py-4 font-bold text-[#2D3436] transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Subject</label>
                    <input 
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      placeholder="Math, English..."
                      className="w-full bg-[#F8F9FA] border-2 border-transparent focus:border-indigo-400 outline-none rounded-2xl px-5 py-3 font-bold text-[#2D3436] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Level</label>
                    <input 
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value})}
                      placeholder="Grade 5..."
                      className="w-full bg-[#F8F9FA] border-2 border-transparent focus:border-indigo-400 outline-none rounded-2xl px-5 py-3 font-bold text-[#2D3436] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Schedule</label>
                  <input 
                    value={formData.schedule}
                    onChange={e => setFormData({...formData, schedule: e.target.value})}
                    placeholder="Mon-Wed 10:00 AM"
                    className="w-full bg-[#F8F9FA] border-2 border-transparent focus:border-indigo-400 outline-none rounded-2xl px-5 py-4 font-bold text-[#2D3436] transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#FF7D5E] hover:bg-[#ff6a45] text-white py-4 rounded-2xl font-black text-lg shadow-[0_6px_0_#D45D40] active:translate-y-1 active:shadow-none transition-all mt-4"
                >
                  SAVE STUDENT
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
