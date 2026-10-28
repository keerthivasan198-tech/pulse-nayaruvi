import React, { useEffect, useState, useRef } from 'react';
import { db, auth } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { Bell, X, MessageSquare } from 'lucide-react';

export default function NotificationManager({ activeWorkspaceId, activeProjectId, onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const initialLoadDone = useRef(false);
  const lastActivityCount = useRef(0);
  const activeProjectIdRef = useRef(activeProjectId);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    const path = activeWorkspaceId ? `workspaces/${activeWorkspaceId}/activity` : 'dashboard_activity';
    const activityRef = ref(db, path);
    const unsubscribe = onValue(activityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const activities = Object.values(data);
        
        // Skip firing notifications on the very first load
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          lastActivityCount.current = activities.length;
          return;
        }

        // Check if there are new activities
        if (activities.length > lastActivityCount.current) {
          const newActivities = activities.slice(lastActivityCount.current);
          lastActivityCount.current = activities.length;

          newActivities.forEach(activity => {
            if (!auth.currentUser) return;
            
            const currentProjId = activeProjectIdRef.current;
            if (activity.projectId && currentProjId && activity.projectId !== currentProjId) {
              return;
            }

            // Message notifications
            if (
              activity.type === 'message' && 
              activity.target === (auth.currentUser.displayName || auth.currentUser.email?.split('@')[0])
            ) {
              const newNotif = {
                id: Date.now() + Math.random(),
                title: `New message from ${activity.user}`,
                content: activity.content,
                taskId: activity.taskId
              };
              
              setNotifications(prev => [...prev, newNotif]);
              
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
              }, 5000);
            }

            // Task assignment notifications
            if (
              activity.type === 'task_assignment' && 
              activity.targetUserId === auth.currentUser.uid
            ) {
              const newNotif = {
                id: Date.now() + Math.random(),
                title: `Task Assigned: ${activity.user}`,
                content: activity.content,
                taskId: activity.taskId
              };
              
              setNotifications(prev => [...prev, newNotif]);
              
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
              }, 5000);
            }

            // Task review notifications
            if (
              activity.type === 'task_review' && 
              activity.targetUserId === auth.currentUser.uid
            ) {
              const newNotif = {
                id: Date.now() + Math.random(),
                title: `Task Ready for Review`,
                content: activity.content,
                taskId: activity.taskId
              };
              
              setNotifications(prev => [...prev, newNotif]);
              
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
              }, 5000);
            }
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none">
      {notifications.map(notif => (
        <div 
          key={notif.id} 
          onClick={() => {
            if (notif.taskId && onNotificationClick) {
              onNotificationClick(notif.taskId);
              dismiss(notif.id);
            }
          }}
          className="bg-surface rounded-xl shadow-2xl border border-[var(--color-border)] p-4 w-80 flex items-start gap-4 pointer-events-auto animate-in slide-in-from-top-5 fade-in duration-300 cursor-pointer hover:bg-slate-800"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
            <MessageSquare size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-text-primary mb-1 truncate">{notif.title}</h4>
            <p className="text-xs font-medium text-text-secondary line-clamp-2">{notif.content}</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              dismiss(notif.id);
            }}
            className="text-text-secondary hover:text-danger shrink-0 transition-colors mt-1"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
