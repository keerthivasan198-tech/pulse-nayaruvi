import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { Video, Megaphone, Send, Pencil, Trash2, X, Check } from 'lucide-react';
import { logActivity, subscribeToActivities, subscribeToProjects, getWorkspace, getProject } from '../services/firebaseService';

const API_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

export default function ActivityView({ activeWorkspaceId, activeProjectId }) {
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setActivities([]);
      setProjects([]);
      return;
    }

    // Activities
    const unsubscribeAct = subscribeToActivities(activeWorkspaceId, (actList) => {
      let filtered = actList;
      if (activeProjectId) {
        filtered = actList.filter(a => a.projectId === activeProjectId);
      }
      setActivities(filtered);
    });

    // Projects for dropdown
    const unsubscribeProj = subscribeToProjects(activeWorkspaceId, auth.currentUser?.uid, (projList) => {
      const leaderProjs = projList.filter(p => {
        if (!p.members) return false;
        const userMember = Object.values(p.members).find(m => m.uid === auth.currentUser?.uid);
        return userMember && (userMember.role === 'Founder' || userMember.role === 'Co-Founder' || userMember.role === 'Admin');
      });
      setProjects(leaderProjs);
    });

    return () => {
      if (unsubscribeAct) unsubscribeAct();
      if (unsubscribeProj) unsubscribeProj();
    };
  }, [activeWorkspaceId, activeProjectId]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.trim() || !activeWorkspaceId || isPosting) return;

    setIsPosting(true);
    setStatusMsg(null);
    const announcementText = newAnnouncement.trim();

    try {
      // 1. Fetch current workspace and project details for title and recipients
      let workspaceData = null;
      let projectData = null;
      try {
        workspaceData = await getWorkspace(activeWorkspaceId);
      } catch (e) {
        console.warn('Could not fetch workspace data:', e);
      }

      if (activeProjectId) {
        try {
          projectData = await getProject(activeWorkspaceId, activeProjectId);
        } catch (e) {
          console.warn('Could not fetch project data:', e);
        }
      }

      const projTitle = projectData?.title || projects.find(p => p.id === activeProjectId)?.title || '';
      const wsName = workspaceData?.name || 'Workspace';
      const authorName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Team Lead';

      // 2. Log activity in Firebase RTDB
      await logActivity({
        user: authorName,
        action: 'posted an announcement',
        target: projTitle ? `in ${projTitle}` : 'to the Workspace',
        content: announcementText,
        type: 'announcement',
        workspaceId: activeWorkspaceId,
        projectId: activeProjectId || null,
        uid: auth.currentUser?.uid
      });

      // 3. Collect recipient email addresses
      const emailSet = new Set();
      if (projectData) {
        (projectData.members || []).forEach(m => { if (m?.email) emailSet.add(m.email.toLowerCase().trim()); });
        (projectData.invites || []).forEach(i => { if (i?.email) emailSet.add(i.email.toLowerCase().trim()); });
      }
      if (workspaceData) {
        (workspaceData.members || []).forEach(m => { if (m?.email) emailSet.add(m.email.toLowerCase().trim()); });
      }

      const recipientEmails = Array.from(emailSet).filter(email => email && email.includes('@'));

      // 4. Send email notification via backend
      let emailDispatched = false;
      if (recipientEmails.length > 0) {
        try {
          const resp = await fetch(`${API_URL}/notify/announcement`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              announcement: announcementText,
              authorName,
              projectTitle: projTitle,
              workspaceName: wsName,
              recipients: recipientEmails,
              workspaceId: activeWorkspaceId,
              projectId: activeProjectId || null,
              origin: window.location.origin
            })
          });
          const result = await resp.json();
          emailDispatched = !!result?.emailSent;
        } catch (err) {
          console.warn('Could not send announcement email notification:', err);
        }
      }

      setNewAnnouncement('');
      if (emailDispatched) {
        setStatusMsg({ type: 'success', text: `📢 Announcement posted & emailed to ${recipientEmails.length} team member(s)!` });
      } else if (recipientEmails.length > 0) {
        setStatusMsg({ type: 'info', text: `📢 Announcement posted to feed (emails queued for ${recipientEmails.length} members).` });
      } else {
        setStatusMsg({ type: 'info', text: '📢 Announcement posted to workspace feed.' });
      }

      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err) {
      console.error('Error posting announcement:', err);
      setStatusMsg({ type: 'error', text: 'Failed to post announcement. Please try again.' });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      if (activeWorkspaceId) {
        await remove(ref(db, `workspaces/${activeWorkspaceId}/activity/${id}`)).catch(() => {});
      }
      await remove(ref(db, `dashboard_activity/${id}`)).catch(() => {});
    } catch (err) {
      console.error("Delete activity error:", err);
    }
  };

  const handleUpdate = async (id) => {
    if (!editContent.trim()) return;
    try {
      if (activeWorkspaceId) {
        await update(ref(db, `workspaces/${activeWorkspaceId}/activity/${id}`), { content: editContent, edited: true }).catch(() => {});
      }
      await update(ref(db, `dashboard_activity/${id}`), {
        content: editContent,
        edited: true
      });
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      console.error("Update activity error:", err);
    }
  };

  const renderContent = (content) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const isMeet = part.includes('meet.google.com');
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`inline-flex items-center font-bold ${isMeet ? 'text-primary bg-primary/10 px-2 py-1 rounded-md' : 'text-blue-500 hover:underline'}`}
          >
            {isMeet && <Video size={14} className="mr-1" />}
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-full w-full flex-col p-4 md:p-8 bg-background overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-normal text-primary tracking-wide mb-1 font-heading uppercase">
            Activity & Announcements
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Stay updated with your workspace announcements, team actions, and meeting links.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {activities.length === 0 ? (
            <div className="celestique-card rounded-2xl p-12 text-center text-text-secondary">
              <p className="text-sm font-semibold">No activity recorded yet in this workspace.</p>
            </div>
          ) : (
            activities.map(act => (
              <div key={act.id} className="celestique-card rounded-2xl p-5 flex items-start text-primary">
                <div className="w-10 h-10 rounded-xl bg-primary text-surface flex items-center justify-center mr-4 shrink-0 font-bold text-sm shadow-sm font-heading">
                  {act.user.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-primary font-medium mb-1">
                      <span className="font-extrabold text-primary">{act.user}</span> {act.action} <span className="font-extrabold text-primary">{act.target}</span>
                    </p>
                    
                    {/* Action buttons (Edit/Delete) */}
                    {(act.uid === auth.currentUser?.uid || act.user === auth.currentUser?.displayName || act.user === auth.currentUser?.email?.split('@')[0]) && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button 
                          onClick={() => {
                            setEditingId(act.id);
                            setEditContent(act.content);
                          }}
                          className="text-text-secondary hover:text-primary transition-colors p-1"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(act.id)}
                          className="text-text-secondary hover:text-red-600 transition-colors p-1"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingId === act.id ? (
                    <div className="mt-2.5">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-surface border border-primary rounded-xl p-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-2"
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => setEditingId(null)}
                          className="text-xs font-bold text-text-secondary hover:text-primary px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleUpdate(act.id)}
                          className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-hover"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : act.content ? (
                    <div className="mt-2.5 p-3.5 bg-surface rounded-xl text-sm text-primary whitespace-pre-wrap border border-border font-medium overflow-wrap-anywhere">
                      {renderContent(act.content)}
                    </div>
                  ) : null}

                  <span className="text-[11px] font-semibold text-text-secondary mt-2 block">
                    {new Date(act.timestamp).toLocaleString()}
                    {act.edited && <span className="italic ml-2">(edited)</span>}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <div className="celestique-card rounded-2xl p-6 sticky top-0 text-primary">
            <h3 className="font-normal text-primary text-lg mb-3 tracking-wide flex items-center font-heading uppercase">
              <Megaphone size={18} className="mr-2 text-primary" /> Post Announcement
            </h3>
            
            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              {projects.length > 0 && (
                <div className="mb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                  {activeProjectId ? 'Posting to Project' : 'Posting to Workspace'}
                </div>
              )}

              {statusMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  statusMsg.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                    : statusMsg.type === 'error'
                    ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {statusMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">Announcement Content</label>
                <textarea
                  rows={4}
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Share a status update or Google Meet link..."
                  className="w-full bg-surface border border-border rounded-xl p-3 text-xs font-medium text-primary focus:outline-none focus:border-primary resize-none"
                  disabled={isPosting}
                />
              </div>

              <button
                type="submit"
                disabled={isPosting || !newAnnouncement.trim()}
                className="w-full py-2.5 btn-matte-primary rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer font-heading disabled:opacity-50"
              >
                {isPosting ? (
                  <>Posting & Notifying...</>
                ) : (
                  <>
                    <Send size={14} className="mr-2" /> Post Announcement
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
