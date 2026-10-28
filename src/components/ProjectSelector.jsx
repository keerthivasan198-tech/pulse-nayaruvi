import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { Folder, FolderOpen, Plus } from 'lucide-react';
import { subscribeToProjects } from '../services/firebaseService';

export default function ProjectSelector({ activeWorkspaceId, activeProjectId, setActiveProjectId, onNavigateToProjects }) {
  const [projects, setProjects] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!activeWorkspaceId || !auth.currentUser) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const unSub = subscribeToProjects(activeWorkspaceId, auth.currentUser.uid, (projList) => {
      setProjects(projList);
      setLoading(false);
    });

    return () => unSub();
  }, [activeWorkspaceId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeProjName = activeProject ? activeProject.title : 'No Project Selected';

  return (
    <div className="relative mt-2" ref={dropdownRef}>
      {/* Selector Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-background border border-slate-700 transition-all duration-150 shadow-xs cursor-pointer group"
      >
        <div className="flex items-center space-x-3 truncate">
          <div className="w-8 h-8 rounded-lg bg-background/10 text-background flex items-center justify-center shrink-0">
            {activeProject ? <FolderOpen size={16} /> : <Folder size={16} />}
          </div>
          <div className="flex flex-col items-start truncate">
            <span className="text-[9px] font-bold text-background/60 uppercase tracking-wider leading-tight">Project</span>
            <span className="text-sm font-bold text-background truncate">
              {loading && projects.length === 0 ? 'Loading...' : activeProjName}
            </span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-background/50 group-hover:text-white transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-surface rounded-2xl shadow-celestique-lg border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 text-primary">
          
          <div className="p-3 text-[10px] font-black tracking-widest text-text-secondary uppercase flex items-center bg-background border-b border-border">
            <Folder size={12} className="mr-1.5" /> Select Project
          </div>

          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
              {/* All Projects Option */}
              <button
                onClick={() => {
                  setActiveProjectId('');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors ${
                  !activeProjectId 
                  ? 'bg-background text-primary' 
                  : 'hover:bg-background/50 text-text-primary'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  !activeProjectId ? 'bg-primary text-primary-foreground' : 'bg-border text-text-secondary'
                }`}>
                  <FolderOpen size={14} />
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-bold text-sm truncate">All Projects (Unselected)</span>
                  <span className="text-[10px] font-medium opacity-70">Workspace Level</span>
                </div>
              </button>

              {projects.length === 0 ? (
                <div className="px-4 py-4 text-center text-[#7D7268] text-xs font-bold">
                  No projects found
                </div>
              ) : (
                projects.map(proj => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors ${
                      activeProjectId === proj.id 
                      ? 'bg-background text-primary' 
                      : 'hover:bg-background/50 text-text-primary'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      activeProjectId === proj.id ? 'bg-primary text-primary-foreground' : 'bg-border text-text-secondary'
                    }`}>
                      {activeProjectId === proj.id ? <FolderOpen size={14} /> : <Folder size={14} />}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-sm truncate">{proj.title}</span>
                      <span className="text-[10px] font-medium opacity-70">
                        {proj.status || 'Active'}
                      </span>
                    </div>
                  </button>
                ))
              )}
          </div>

          {/* Action Button */}
          <div className="p-2 border-t border-border bg-background">
            <button
              onClick={() => {
                onNavigateToProjects();
                setIsOpen(false);
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-border text-text-primary hover:bg-surface hover:text-primary hover:border-primary transition-colors flex items-center justify-center text-xs font-bold"
            >
              <Plus size={14} className="mr-1.5" /> Manage Projects
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
