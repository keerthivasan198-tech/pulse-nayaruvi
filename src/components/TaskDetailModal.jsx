import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, User, Clock, Tag, MessageSquare, Image as ImageIcon, Plus } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase';
import { ref, update, set, push, get } from 'firebase/database';
import { getProject, updateTask, deleteTask, logActivity } from '../services/firebaseService';

export default function TaskDetailModal({ task, onClose, projectId, workspaceId }) {
  const [formData, setFormData] = useState({ ...task });
  const [members, setMembers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(task.photoBase64 || null);
  const [photos, setPhotos] = useState(task.photos || (task.photoBase64 ? [task.photoBase64] : []));
  const [isDragging, setIsDragging] = useState(false);

  const effectiveWorkspaceId = workspaceId || task.workspaceId;

  useEffect(() => {
    if (projectId) {
      const fetchMembers = async () => {
        try {
          const proj = await getProject(effectiveWorkspaceId, projectId);
          if (proj) {
            setMembers(proj.members || []);
          }
        } catch (err) {
          console.error("Failed to fetch members for task modal:", err);
        }
      };
      fetchMembers();
    }
  }, [effectiveWorkspaceId, projectId]);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) handleImageFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        if (file.type.startsWith('image/')) handleImageFile(file);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let updatedFormData = { ...formData };
      
      if (formData.assigneeId && formData.assigneeId !== task.assigneeId) {
        updatedFormData.assignedBy = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0];
      }

      await updateTask(effectiveWorkspaceId, projectId || task.projectId, task.id, {
        ...updatedFormData,
        photoBase64: photos.length > 0 ? photos[0] : null,
        photos: photos,
        updatedAt: new Date().toISOString()
      });

      if (formData.assigneeId && formData.assigneeId !== task.assigneeId) {
        let projName = 'the project';
        if (projectId) {
          const proj = await getProject(effectiveWorkspaceId, projectId);
          if (proj) projName = proj.title;
        }

        const assignee = members.find(m => m.uid === formData.assigneeId);
        await logActivity(effectiveWorkspaceId, {
          user: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'A member',
          action: 'assigned a task to',
          target: assignee ? (assignee.name || assignee.email) : 'someone',
          targetUserId: formData.assigneeId,
          content: `You've been assigned task "${formData.content}" in ${projName}.`,
          type: 'task_assignment',
          workspaceId: effectiveWorkspaceId || null,
          projectId: projectId || null,
          taskId: task.id,
          uid: auth.currentUser?.uid,
          timestamp: new Date().toISOString()
        });
      }

      // Notification for moving to review
      if (
        formData.status === 'col-review' && 
        task.status !== 'col-review' && 
        task.creatorId
      ) {
        let projName = 'the project';
        if (projectId) {
          const proj = await getProject(effectiveWorkspaceId, projectId);
          if (proj) projName = proj.title;
        }
        
        await logActivity(effectiveWorkspaceId, {
          user: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'A member',
          action: 'sent task to review',
          targetUserId: task.creatorId,
          content: `Task "${formData.content}" is sent to review in ${projName}. Please review.`,
          type: 'task_review',
          workspaceId: effectiveWorkspaceId || null,
          projectId: projectId || null,
          taskId: task.id,
          uid: auth.currentUser?.uid,
          timestamp: new Date().toISOString()
        });
      }

      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this task?")) return;
    try {
      await deleteTask(effectiveWorkspaceId, projectId || task.projectId, task.id);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to delete task.');
    }
  };

  const handleImageFile = (file) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large. Please upload an image under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos(prev => [...prev, reader.result]);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => handleImageFile(file));
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/10 rounded-xl flex items-center justify-center backdrop-blur-sm pointer-events-none">
            <div className="bg-surface p-6 rounded-2xl shadow-xl flex flex-col items-center">
              <ImageIcon size={48} className="text-primary mb-2 animate-bounce" />
              <p className="text-lg font-bold text-primary">Drop images here</p>
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-surface z-10 rounded-t-xl">
          <div className="flex items-center text-sm font-medium text-text-secondary">
            <span className="bg-[#F8FAFC] px-2 py-1 rounded border border-[var(--color-border)] flex items-center">
              <span className="w-2 h-2 rounded-full bg-primary mr-2"></span>
              Task
            </span>
            <span className="mx-2 text-[var(--color-border)]">|</span>
            <span className="text-xs uppercase tracking-wide">ID: {task.id.slice(-6)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleDelete} 
              className="px-4 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 text-sm font-bold rounded-md shadow-sm hover:bg-rose-100 transition-colors"
            >
              Delete
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="px-5 py-1.5 bg-primary text-white text-sm font-bold rounded-md shadow-sm hover:bg-primary/90 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary rounded-md hover:bg-slate-800/50 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row p-4 md:p-8 gap-4 md:gap-8 overflow-y-auto">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Title */}
            <input 
              type="text" 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})}
              onPaste={(e) => {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                      e.preventDefault();
                      handleImageFile(file);
                    }
                  }
                }
              }}
              className="text-2xl sm:text-3xl font-bold text-text-primary w-full border-none focus:outline-none focus:ring-0 mb-4 bg-transparent placeholder:text-gray-300"
              placeholder="Task Name..."
            />

            {/* Properties Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 mb-10 py-6 border-y border-dashed border-[var(--color-border)]">
              
              {/* Left Column Properties */}
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center">
                  <span className="w-28 text-sm text-text-secondary flex items-center">
                    <CheckCircle2 size={16} className="mr-2 opacity-60" /> Status
                  </span>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="flex-1 bg-surface border border-[var(--color-border)] rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide focus:outline-none hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <option value="col-todo">To Do</option>
                    <option value="col-progress">In Progress</option>
                    <option value="col-review">Review</option>
                    <option value="col-completed">Completed</option>
                  </select>
                </div>

                {/* Dates */}
                <div className="flex items-center">
                  <span className="w-28 text-sm text-text-secondary flex items-center">
                    <Calendar size={16} className="mr-2 opacity-60" /> Dates
                  </span>
                  <div className="flex-1 flex items-center bg-surface border border-[var(--color-border)] rounded-md px-3 py-1 text-sm font-medium hover:border-primary/50 transition-colors">
                    <span className="text-text-secondary text-xs mr-2">Due →</span>
                    <input 
                      type="date" 
                      value={formData.dueDate || ''}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                      className="bg-transparent border-none focus:outline-none p-0 text-sm text-text-primary w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column Properties */}
              <div className="space-y-6">
                {/* Assignees */}
                <div className="flex items-center">
                  <span className="w-28 text-sm text-text-secondary flex items-center">
                    <User size={16} className="mr-2 opacity-60" /> Assignees
                  </span>
                  <div className="flex-1">
                    <select 
                      value={formData.assigneeId || ''}
                      onChange={e => setFormData({...formData, assigneeId: e.target.value})}
                      className="w-full bg-surface border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => (
                        <option key={m.uid} value={m.uid}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center">
                  <span className="w-28 text-sm text-text-secondary flex items-center">
                    <Flag size={16} className="mr-2 opacity-60" /> Priority
                  </span>
                  <select 
                    value={formData.priority || 'Normal'}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className={`flex-1 bg-surface border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm font-bold focus:outline-none hover:border-primary/50 transition-colors cursor-pointer ${
                      formData.priority === 'Urgent' ? 'text-danger' : 
                      formData.priority === 'High' ? 'text-warning' : 
                      formData.priority === 'Low' ? 'text-success' : 'text-text-primary'
                    }`}
                  >
                    <option value="Urgent" className="text-danger">Urgent</option>
                    <option value="High" className="text-warning">High</option>
                    <option value="Normal" className="text-text-primary">Normal</option>
                    <option value="Low" className="text-success">Low</option>
                  </select>
                </div>
                
              </div>
            </div>

            {/* Photo Attachment (Full Width Layout) */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-text-primary flex items-center">
                  <ImageIcon size={16} className="mr-2 opacity-60" /> Attachments
                </h3>
                <span className="text-xs font-medium text-text-secondary">Paste (Ctrl+V) or drag & drop</span>
              </div>
              
              {photos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-[var(--color-border)] group bg-[#F8FAFC] shadow-sm">
                      <div className="p-3 bg-surface border-b border-[var(--color-border)] flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">Image {idx + 1}</span>
                        <button 
                          onClick={() => removePhoto(idx)}
                          className="text-text-secondary hover:text-danger p-1 rounded-md transition-colors"
                          title="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="p-4 flex justify-center bg-slate-800/50">
                        <img src={photo} alt={`Attachment ${idx + 1}`} className="max-w-full max-h-[300px] object-contain rounded shadow-sm border border-black/5" />
                      </div>
                    </div>
                  ))}
                  
                  {/* Add more button */}
                  <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 flex flex-col items-center justify-center hover:bg-[#F8FAFC] transition-colors cursor-pointer relative min-h-[150px]">
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                      <Plus size={20} />
                    </div>
                    <p className="text-sm font-bold text-text-primary">Add More</p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center hover:bg-[#F8FAFC] transition-colors cursor-pointer relative bg-slate-800/50">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <ImageIcon size={32} className="mx-auto text-text-secondary mb-3 opacity-40" />
                  <p className="text-sm font-bold text-text-primary">Click or drag images here</p>
                  <p className="text-xs font-medium text-text-secondary mt-1">PNG, JPG (Max 2MB per image)</p>
                </div>
              )}
            </div>

            {/* Issue Summary / Description */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center">
                Issue summary
              </h3>
              <TipTapEditor 
                value={formData.description || ''} 
                onChange={(val) => setFormData({...formData, description: val})} 
              />
            </div>
            
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}

// TipTap Editor Components
const MenuBar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-[var(--color-border)] bg-slate-800/50 overflow-x-auto">
      <button onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive('bold') ? 'bg-slate-700 text-text-primary' : 'text-text-secondary hover:bg-slate-800/50'}`}>B</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded text-sm italic ${editor.isActive('italic') ? 'bg-slate-700 text-text-primary' : 'text-text-secondary hover:bg-slate-800/50'}`}>I</button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={`px-2 py-1 rounded text-sm line-through ${editor.isActive('strike') ? 'bg-slate-700 text-text-primary' : 'text-text-secondary hover:bg-slate-800/50'}`}>S</button>
      <div className="w-px h-4 bg-gray-300 mx-1"></div>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-700 text-text-primary' : 'text-text-secondary hover:bg-slate-800/50'}`}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-700 text-text-primary' : 'text-text-secondary hover:bg-slate-800/50'}`}>H2</button>
      <div className="w-px h-4 bg-gray-300 mx-1"></div>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('bulletList') ? 'bg-slate-700 text-text-primary' : 'text-text-secondary hover:bg-slate-800/50'}`}>• List</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 rounded text-sm ${editor.isActive('orderedList') ? 'bg-slate-700 text-text-primary' : 'text-text-secondary hover:bg-slate-800/50'}`}>1. List</button>
    </div>
  );
};

const TipTapEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Describe the task or bug in detail...' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 text-sm font-medium text-text-primary',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="flex flex-col bg-surface border border-[var(--color-border)] rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

// Add a simple CheckCircle2 component since it might not be imported if the file wasn't complete
function CheckCircle2(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
