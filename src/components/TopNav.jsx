import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, Check, MessageSquare, X } from 'lucide-react';
import { db, auth } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { subscribeToTasks } from '../services/firebaseService';

export default function TopNav({ toggleSidebar, activeWorkspaceId, activeProjectId, setSelectedTask, setActiveTab }) {
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [dismissedIds, setDismissedIds] = useState(() => {
    const saved = localStorage.getItem('dismissed_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (activeProjectId) {
      const path = activeWorkspaceId 
        ? `workspaces/${activeWorkspaceId}/projects/${activeProjectId}`
        : `projects/${activeProjectId}`;
      const projRef = ref(db, path);
      const unsubProj = onValue(projRef, (snapshot) => {
        if (snapshot.exists()) setProjectName(snapshot.val().title);
      });
      return () => unsubProj();
    } else {
      setProjectName('');
    }
  }, [activeWorkspaceId, activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) {
      setNotifications([]);
      return;
    }

    const unsub = subscribeToTasks(activeWorkspaceId, activeProjectId, (allTasks) => {
      const myTasks = allTasks.filter(t => 
        auth.currentUser && 
        !dismissedIds.includes(t.id) &&
        t.status !== 'col-completed' &&
        (
          t.assigneeId === auth.currentUser.uid ||
          (t.status === 'col-review' && t.creatorId === auth.currentUser.uid)
        )
      );
      setNotifications(myTasks);
    });

    return () => unsub();
  }, [activeWorkspaceId, activeProjectId, dismissedIds]);

  const handleDismiss = (id, e) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsDropdownOpen(false);
    if (setActiveTab) setActiveTab('Tasks');
  };

  return (
    <header className="h-16 border-b border-border bg-surface px-4 md:px-8 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center space-x-3">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-lg hover:bg-black/5 text-primary transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>
        {projectName && (
          <span className="font-heading uppercase tracking-wide text-xs font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-border">
            {projectName}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 rounded-xl border border-border bg-background hover:bg-black/5 text-primary transition-colors relative cursor-pointer"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-background rounded-full text-[9px] font-black flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-surface rounded-2xl shadow-celestique-lg border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 text-primary">
              <div className="p-3 border-b border-border flex items-center justify-between bg-background">
                <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] font-bold text-text-secondary">{notifications.length} active</span>
              </div>

              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-text-secondary text-xs font-medium">
                    No new notifications
                  </div>
                ) : (
                  notifications.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="p-3 border-b border-border/40 hover:bg-background/60 transition-colors flex items-start justify-between cursor-pointer group"
                    >
                      <div className="flex-1 pr-2">
                        <span className="text-[10px] font-bold text-primary block leading-none mb-1">
                          {task.status === 'col-review' ? 'Review Requested' : 'Assigned to You'}
                        </span>
                        <p className="text-xs font-semibold text-text-primary line-clamp-2">
                          {task.content || 'Untitled Task'}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => handleDismiss(task.id, e)}
                        className="text-text-secondary/50 hover:text-text-primary p-1 rounded transition-colors"
                        title="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
