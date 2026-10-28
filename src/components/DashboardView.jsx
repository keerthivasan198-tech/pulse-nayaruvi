import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, FolderOpen, 
  Plus, X
} from 'lucide-react';
import { auth } from '../firebase';
import { 
  subscribeToProjects, 
  subscribeToActivities, 
  createProject, 
  logActivity 
} from '../services/firebaseService';

export default function DashboardView({ activeWorkspaceId }) {
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', category: '', dueDays: '7' });

  useEffect(() => {
    if (!activeWorkspaceId || !auth.currentUser) {
      setProjects([]);
      setActivities([]);
      return;
    }

    // Real-time subscription to projects
    const unSubProjects = subscribeToProjects(activeWorkspaceId, auth.currentUser.uid, (projList) => {
      const sorted = [...projList].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setProjects(sorted);
    });

    // Real-time subscription to activities
    const unSubActivities = subscribeToActivities(activeWorkspaceId, (actList) => {
      setActivities(actList.slice(0, 5));
    });

    return () => {
      unSubProjects();
      unSubActivities();
    };
  }, [activeWorkspaceId]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.title || !auth.currentUser || !activeWorkspaceId) return;

    try {
      await createProject({
        title: newProject.title,
        status: 'Active',
        category: newProject.category || 'General',
        workspaceId: activeWorkspaceId,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0],
        dueDays: newProject.dueDays || '7'
      });
      
      await logActivity({
        user: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User',
        action: 'created project',
        target: newProject.title,
        type: 'project',
        workspaceId: activeWorkspaceId
      });

      setIsProjectModalOpen(false);
      setNewProject({ title: '', category: '', dueDays: '7' });
    } catch (error) {
      console.error("Create project error:", error);
    }
  };

  const activeProjectsCount = projects.length;

  return (
    <div className="flex h-full w-full bg-background">
      {/* Main Column */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-8">
          <div>
            <h2 className="text-3xl font-normal text-primary tracking-wide mb-1 font-heading uppercase">
              Workspace Overview
            </h2>
            <p className="text-sm font-medium text-text-secondary">
              A curated view of your active creations and team movements.
            </p>
          </div>
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center px-5 py-2.5 btn-matte-primary rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer font-heading"
          >
            <Plus size={16} className="mr-1.5" strokeWidth={2.5} />
            New Project
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            icon={<CheckCircle2 size={22} className="text-primary" />} 
            title="Tasks Completed" value={0} 
            accent="bg-primary/5 border-primary/15"
          />
          <StatCard 
            icon={<Clock size={22} className="text-amber-700" />} 
            title="In Progress" value={0} 
            accent="bg-amber-500/10 border-amber-500/20"
          />
          <StatCard 
            icon={<FolderOpen size={22} className="text-primary" />} 
            title="Active Projects" value={activeProjectsCount} 
            accent="bg-primary/5 border-primary/15"
          />
        </div>

        {/* Projects Overview */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-normal text-primary tracking-wide font-heading uppercase">Active Projects</h3>
            <span className="text-xs font-semibold text-primary bg-surface px-3 py-1 rounded-full border border-border shadow-xs">
              {projects.length} Total
            </span>
          </div>
          
          <div className="celestique-card rounded-2xl overflow-hidden text-primary">
            {projects.length === 0 ? (
              <div className="p-12 text-center text-text-secondary">
                <div className="w-12 h-12 rounded-2xl bg-[#E8E0BF] border border-[#C9BD91] flex items-center justify-center mx-auto mb-3">
                  <FolderOpen size={24} className="text-primary" />
                </div>
                <h4 className="text-primary font-bold text-sm mb-1 font-heading">No Projects Found</h4>
                <p className="font-medium text-xs max-w-xs mx-auto text-text-secondary">Create your first project in this workspace to start tracking tasks and activity.</p>
              </div>
            ) : (
              projects.map((proj, i) => (
                <ProjectRow 
                  key={proj.id}
                  iconBg="bg-primary" 
                  title={proj.title} 
                  category={proj.category} 
                  progress={proj.progress || 0} 
                  due={proj.dueDays ? `Due in ${proj.dueDays} days` : 'Active'} 
                  borderBottom={i !== projects.length - 1} 
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="w-[340px] flex-shrink-0 bg-primary/90 backdrop-blur-2xl border-l border-border overflow-y-auto custom-scrollbar hidden xl:block">
        
        {/* Activity Feed */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-normal text-primary-foreground text-lg tracking-wide font-heading uppercase">Recent Activity</h3>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          </div>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="p-6 text-center text-text-secondary border border-dashed border-border rounded-xl bg-surface/40">
                <p className="text-xs font-semibold">No activity recorded yet.</p>
              </div>
            ) : (
              activities.map(act => (
                <ActivityItem 
                  key={act.id} 
                  user={act.user} 
                  action={act.action} 
                  target={act.target} 
                  time={formatTimeAgo(act.timestamp)} 
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="celestique-card rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 text-primary">
            <div className="flex justify-between items-center mb-5 border-b border-[#DDD5CC] pb-3">
              <h3 className="text-lg font-extrabold text-primary font-heading">Create New Project</h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-text-secondary hover:text-primary transition-colors p-1 rounded-lg hover:bg-black/5">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1.5">Project Name</label>
                  <input 
                    type="text" 
                    required
                    value={newProject.title}
                    onChange={e => setNewProject({...newProject, title: e.target.value})}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-primary font-medium focus:outline-none focus:border-primary focus:bg-surface transition-all"
                    placeholder="e.g. Mobile App Launch"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1.5">Category</label>
                  <input 
                    type="text" 
                    value={newProject.category}
                    onChange={e => setNewProject({...newProject, category: e.target.value})}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-primary font-medium focus:outline-none focus:border-primary focus:bg-surface transition-all"
                    placeholder="e.g. iOS Development"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsProjectModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-primary bg-background border border-border hover:bg-border cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components

function StatCard({ icon, title, value, accent }) {
  return (
    <div className="celestique-card rounded-2xl p-5 flex items-center justify-between relative overflow-hidden group transition-all text-primary">
      <div className="flex items-center">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mr-4 shadow-2xs shrink-0 ${accent}`}>
          {icon}
        </div>
        <div>
          <span className="text-2xl font-extrabold text-primary block leading-none mb-1 tracking-tight font-heading">{value}</span>
          <h4 className="text-text-secondary text-xs font-bold">{title}</h4>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ iconBg, title, category, progress, due, borderBottom = true }) {
  return (
    <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-surface/40 ${borderBottom ? 'border-b border-border/50' : ''}`}>
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} text-surface flex items-center justify-center font-bold text-sm shadow-sm`}>
          {title.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 className="text-primary font-bold text-sm mb-0.5">{title}</h4>
          <span className="text-xs text-text-secondary font-semibold">{category}</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 w-full sm:w-auto">
        <div className="w-full sm:w-32">
          <div className="flex justify-between text-[10px] mb-1 font-bold text-text-secondary">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-1.5 border border-border/30">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <span className="text-[11px] font-bold text-primary bg-surface px-2.5 py-1 rounded-md border border-border shadow-xs whitespace-nowrap self-start sm:self-auto">
          {due}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ user, action, target, time }) {
  return (
    <div className="flex items-start bg-surface p-3 rounded-xl border border-border/50 shadow-2xs text-primary">
      <div className="relative z-10 mr-3 shrink-0">
        <img src={`https://ui-avatars.com/api/?name=${user}&background=374D46&color=fff`} className="w-7 h-7 rounded-full border border-white shadow-xs" alt="avatar" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-text-primary leading-snug">
          <span className="font-bold text-primary">{user}</span> {action} <span className="font-bold text-primary">{target}</span>
        </p>
        <span className="text-[10px] font-semibold text-gray-400 mt-1 block">{time}</span>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp) {
  if(!timestamp) return 'Just now';
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
