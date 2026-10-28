import React, { useState, useEffect } from 'react';
import { FolderOpen, MoreVertical, Link, Plus, CheckCircle2, Shield, User, Trash2 } from 'lucide-react';
import { auth } from '../firebase';
import { 
  createProject, 
  subscribeToProjects, 
  deleteProject, 
  updateProjectMemberRole 
} from '../services/firebaseService';

export default function ProjectsView({ activeWorkspaceId, activeProjectId, setActiveProjectId, setActiveTab }) {
  const [projects, setProjects] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [copySuccessId, setCopySuccessId] = useState(null);
  const [managingProject, setManagingProject] = useState(null);
  const [newProject, setNewProject] = useState({ title: '', status: 'Active' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!activeWorkspaceId || !auth.currentUser) {
      setProjects([]);
      return;
    }

    const unSub = subscribeToProjects(activeWorkspaceId, auth.currentUser.uid, (projList) => {
      setProjects(projList);
    });

    return () => unSub();
  }, [activeWorkspaceId]);

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to permanently delete this project? This action cannot be undone.")) return;
    try {
      await deleteProject(projectId);
      if (activeProjectId === projectId) {
        setActiveProjectId('');
      }
      setActiveMenuId(null);
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project.");
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.title.trim() || !activeWorkspaceId || !auth.currentUser) return;

    try {
      await createProject({
        title: newProject.title,
        status: newProject.status,
        workspaceId: activeWorkspaceId,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
      });
      
      setNewProject({ title: '', status: 'Active' });
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project: ' + (err.message || 'Error occurred'));
    }
  };

  const handleGenerateLink = (projectId) => {
    const inviteLink = `${window.location.origin}/invite/${projectId}?workspaceId=${activeWorkspaceId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopySuccessId(projectId);
      setActiveMenuId(null);
      setTimeout(() => setCopySuccessId(null), 3000);
    });
  };

  const handlePromote = async (projectId, memberUid, currentRole) => {
    if (currentRole === 'Founder') return;
    try {
      const newRole = currentRole === 'Co-Founder' ? 'Member' : 'Co-Founder';
      await updateProjectMemberRole(projectId, memberUid, newRole);
    } catch (e) {
      console.error("Failed to update role", e);
    }
  };

  const isLeader = (project) => {
    if (!project.members) return false;
    const userMember = Object.values(project.members).find(m => m.uid === auth.currentUser?.uid);
    return userMember && (userMember.role === 'Founder' || userMember.role === 'Co-Founder');
  };

  return (
    <div className="flex h-full w-full flex-col p-4 md:p-8 bg-background overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight mb-2 uppercase">
            PROJECTS
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Manage your project workspace, team members, and permissions.
          </p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center px-5 py-2.5 bg-primary text-background rounded-xl font-bold text-sm transition-all cursor-pointer hover:bg-primary-hover"
        >
          <Plus size={16} className="mr-1.5" strokeWidth={2.5} />
          New Project
        </button>
      </div>

      <div className="celestique-card rounded-2xl overflow-visible max-w-4xl text-primary">
        {projects.length === 0 ? (
          <div className="p-12 text-center text-[#7D7268]">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-3">
              <FolderOpen size={24} className="text-[#2B2420]" />
            </div>
            <h4 className="text-[#2B2420] font-bold text-sm mb-1 font-heading">No Projects Found</h4>
            <p className="font-medium text-xs max-w-xs mx-auto text-[#7D7268]">Create a new project to start collaborating with your team.</p>
          </div>
        ) : (
          projects
            .filter(proj => activeProjectId ? proj.id === activeProjectId : true)
            .map((proj, i, filteredProjects) => {
            const leader = isLeader(proj);
            const isProjFounder = proj.members && Object.values(proj.members).some(m => m.uid === auth.currentUser?.uid && m.role === 'Founder');
            const memberCount = proj.members ? Object.keys(proj.members).length : 0;
            return (
              <div key={proj.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface transition-colors ${i !== filteredProjects.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="flex items-center sm:w-[40%] mb-3 sm:mb-0 cursor-pointer group" onClick={() => { setActiveProjectId(proj.id); setActiveTab('Tasks'); }}>
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mr-4 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <FolderOpen size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2B2420] text-sm line-clamp-1 tracking-tight group-hover:text-[#8C8075] transition-colors">{proj.title}</h4>
                    <p className="text-[11px] font-medium text-[#7D7268] mt-0.5 line-clamp-1">{memberCount} Members • {proj.status || 'Active'}</p>
                  </div>
                </div>
                
                <div className="sm:w-[30%] flex items-center justify-end relative space-x-2">
                  {copySuccessId === proj.id && (
                    <span className="text-xs font-bold text-primary mr-2 flex items-center bg-background border border-border px-2.5 py-1 rounded-lg">
                      <CheckCircle2 size={13} className="mr-1 text-[#2B2420]" /> Copied Link!
                    </span>
                  )}
                  {leader && (
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === proj.id ? null : proj.id)}
                      className="text-[#2B2420] hover:text-text-primary p-2 rounded-lg hover:bg-black/10 transition-colors"
                    >
                      <MoreVertical size={16} strokeWidth={2.5} />
                    </button>
                  )}
                  
                  {activeMenuId === proj.id && (
                    <div className="absolute right-0 top-10 mt-1 w-48 bg-surface rounded-xl shadow-celestique-lg border border-border z-20 py-1 animate-in fade-in zoom-in duration-100 text-primary">
                      <button 
                        onClick={() => handleGenerateLink(proj.id)}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:bg-background flex items-center transition-colors"
                      >
                        <Link size={14} className="mr-2.5 text-[#2B2420]" /> Invite Members
                      </button>
                      <button 
                        onClick={() => { setManagingProject(proj); setActiveMenuId(null); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:bg-background flex items-center transition-colors border-b border-border/50"
                      >
                        <User size={14} className="mr-2.5 text-[#7D7268]" /> Manage Roles
                      </button>
                      {isProjFounder && (
                        <button 
                          onClick={() => handleDeleteProject(proj.id)}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center transition-colors"
                        >
                          <Trash2 size={14} className="mr-2.5" /> Delete Project
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Role Management Modal */}
      {managingProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-surface rounded-[20px] w-full max-w-lg p-6 shadow-xl border border-border animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-text-primary flex items-center">
                Manage {managingProject.title}
              </h3>
              <button onClick={() => setManagingProject(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                ✕
              </button>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
              {managingProject.members ? Object.entries(managingProject.members).map(([key, member]) => (
                <div key={key} className="flex items-center justify-between p-3 border border-border rounded-[12px] bg-background">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-3 font-bold text-xs">
                      {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{member.name}</h4>
                      <p className="text-[11px] font-medium text-text-secondary">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-[6px] mr-3 ${
                      member.role === 'Founder' ? 'bg-primary/10 text-primary' : 
                      member.role === 'Co-Founder' ? 'bg-purple-500/10 text-purple-600' : 'bg-slate-700 text-gray-700'
                    }`}>
                      {member.role === 'Founder' && <Shield size={10} className="inline mr-1" />}
                      {member.role === 'Co-Founder' && <Shield size={10} className="inline mr-1" />}
                      {member.role}
                    </span>
                    {member.role !== 'Founder' && (
                      <button 
                        onClick={() => handlePromote(managingProject.id, member.uid, member.role)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {member.role === 'Co-Founder' ? 'Demote' : 'Promote'}
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-text-secondary">No members found.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
               <button 
                 onClick={() => handleGenerateLink(managingProject.id)}
                 className="flex items-center px-4 py-2 bg-background border border-border hover:bg-surface text-text-primary rounded-[12px] text-sm font-bold transition-colors mr-3"
               >
                 <Link size={14} className="mr-2" /> Invite Link
               </button>
               <button 
                 onClick={() => setManagingProject(null)}
                 className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-[12px] text-sm font-bold transition-colors shadow-sm"
               >
                 Done
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-surface rounded-2xl w-full max-w-sm p-6 shadow-celestique-lg border border-[#DDD5CC] animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-normal text-primary mb-4 font-heading uppercase tracking-wide">Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-[#4A443E] mb-1.5">Project Title</label>
                <input 
                  type="text" 
                  value={newProject.title}
                  onChange={e => setNewProject({...newProject, title: e.target.value})}
                  className="w-full bg-surface border border-[#DDD5CC] rounded-xl px-3.5 py-2.5 text-sm text-primary font-medium focus:outline-none focus:border-primary"
                  placeholder="e.g. Website Redesign"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-[#DDD5CC] text-primary hover:bg-surface cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-matte-primary cursor-pointer font-heading uppercase tracking-wide"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
