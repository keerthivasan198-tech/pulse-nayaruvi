import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  UserPlus, 
  FolderOpen, 
  Settings as SettingsIcon, 
  Plus, 
  Check, 
  Mail, 
  Send, 
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { auth } from '../firebase';
import { 
  getWorkspace, 
  getProjects, 
  updateWorkspaceMemberRole, 
  updateProjectMemberRole,
  inviteProjectMember
} from '../services/firebaseService';

const API_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

export default function SettingsView({ activeWorkspaceId }) {
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  
  // New member form
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Member');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const fetchData = async () => {
    if (!activeWorkspaceId) return;
    try {
      const ws = await getWorkspace(activeWorkspaceId);
      if (ws) {
        setWorkspace(ws);
        setMembers(ws.members || []);
      }

      if (auth.currentUser) {
        // Fetch all projects in this workspace so the admin can invite to any project
        const list = await getProjects(activeWorkspaceId);
        setProjects(list);
        if (list.length > 0) {
          setSelectedProjectId(prev => prev && list.some(p => p.id === prev) ? prev : list[0].id);
        }
      }
    } catch (err) {
      console.error("fetchData error:", err);
    }
  };

  const isWsOwner = workspace ? (
    workspace.ownerId === auth.currentUser?.uid || 
    workspace.createdBy === auth.currentUser?.uid || 
    members.some(m => m.uid === auth.currentUser?.uid && (m.role === 'Owner' || m.role === 'Founder'))
  ) : false;
  const currentUserRole = isWsOwner ? 'Owner' : (members.find(m => m.uid === auth.currentUser?.uid)?.role || 'Member');
  const isPrivileged = isWsOwner || currentUserRole === 'Founder' || currentUserRole === 'Co-Founder' || currentUserRole === 'Admin';

  useEffect(() => {
    fetchData();
  }, [activeWorkspaceId]);

  // Handle Role Change in Workspace
  const handleWorkspaceRoleChange = async (memberUid, newRole) => {
    if (!activeWorkspaceId || !memberUid) return;
    try {
      await updateWorkspaceMemberRole(activeWorkspaceId, memberUid, newRole);
      showStatus("Workspace member role updated successfully!");
      fetchData();
    } catch (err) {
      console.error("Failed to update workspace role:", err);
    }
  };

  // Handle Role Change in Project
  const handleProjectRoleChange = async (projectId, memberUid, newRole) => {
    if (!activeWorkspaceId || !projectId || !memberUid) return;
    try {
      await updateProjectMemberRole(activeWorkspaceId, projectId, memberUid, newRole);
      showStatus("Project member role updated successfully!");
      fetchData();
    } catch (err) {
      console.error("Failed to update project role:", err);
    }
  };

  // Add Member to Workspace / Project (Email Invite or Direct Link)
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !activeWorkspaceId) return;
    if (!selectedProjectId) {
      alert("Please select a project to invite the member to.");
      return;
    }

    setIsInviting(true);
    setInviteResult(null);

    const email = newMemberEmail.trim();
    const memberName = newMemberName.trim() || email.split('@')[0];
    const inviterName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Team Admin';
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const projectTitle = selectedProject?.title || 'Project';

    try {
      // 1. Store invite record directly in database under the project branch
      const inviteRecord = await inviteProjectMember(activeWorkspaceId, selectedProjectId, {
        email,
        name: memberName,
        role: newMemberRole,
        invitedBy: inviterName
      });

      const inviteId = inviteRecord?.id || inviteRecord?._id || '';
      const inviteLink = `${window.location.origin}/invite/${selectedProjectId}?workspaceId=${activeWorkspaceId}${inviteId ? `&inviteId=${inviteId}` : ''}`;

      // 2. Dispatch email via backend API (works on localhost or remote server)
      let emailSent = false;
      let emailError = '';

      if (API_URL) {
        try {
          const resp = await fetch(`${API_URL}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              name: memberName,
              role: newMemberRole,
              workspaceId: activeWorkspaceId,
              projectId: selectedProjectId,
              inviteId,
              inviterName,
              workspaceName: workspace?.name || 'Workspace',
              projectTitle,
              origin: window.location.origin
            })
          });

          if (resp.ok) {
            const data = await resp.json();
            emailSent = !!data.emailSent;
            if (!data.emailSent) {
              emailError = data.emailError || data.warning || 'SMTP server credentials not configured';
            }
          } else {
            const errData = await resp.json().catch(() => ({}));
            emailError = errData.error || `Server returned error ${resp.status}`;
          }
        } catch (apiErr) {
          console.warn("Backend invite API unreachable:", apiErr);
          emailError = apiErr.message || 'Backend server unreachable';
        }
      }

      // 3. Copy invite link to clipboard for convenience
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(inviteLink);
        } catch (_) {}
      }

      // 4. Update UI feedback
      setInviteResult({
        email,
        name: memberName,
        role: newMemberRole,
        projectTitle,
        inviteLink,
        emailSent,
        emailError
      });

      if (emailSent) {
        showStatus(`🎉 Invitation email sent to ${email} as ${newMemberRole}! Link also copied.`);
      } else {
        showStatus(`✅ Invite stored in Firebase! Link copied to clipboard.`);
      }

      setNewMemberEmail('');
      setNewMemberName('');
      fetchData();
    } catch (err) {
      console.error("Invite member error:", err);
      alert(`Failed to save invite: ${err.message || ''}`);
    } finally {
      setIsInviting(false);
    }
  };

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  return (
    <div className="flex h-full w-full flex-col p-4 md:p-8 bg-background overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-normal text-primary tracking-wide mb-1 font-heading uppercase flex items-center">
          <SettingsIcon size={26} className="mr-3 text-primary" /> Workspace Settings
        </h2>
        <p className="text-sm font-medium text-text-secondary">
          Manage workspace projects, project members, and member role assignments.
        </p>
      </div>

      {statusMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center shadow-md animate-in fade-in">
          <Check size={16} className="mr-2" /> {statusMsg}
        </div>
      )}

      {/* Main Container */}
      <div className="space-y-8 max-w-4xl">
        
        {/* Workspace Info Card */}
        <div className="celestique-card rounded-2xl p-6 text-primary">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Active Workspace</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isWsOwner ? 'bg-amber-500/15 text-amber-800 border-amber-500/30' : 'bg-primary/10 text-primary border-primary/20'
                }`}>
                  {isWsOwner ? 'Owner' : 'Member'}
                </span>
              </div>
              <h3 className="text-2xl font-normal font-heading text-primary">{workspace?.name || 'My Workspace'}</h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-border">
                {members.length} Workspace Members
              </span>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-border">
                {projects.length} Projects
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Add New Member (Hidden for non-privileged) */}
        {isPrivileged && (
          <div className="celestique-card rounded-2xl p-6 text-primary">
          <h3 className="text-xl font-normal font-heading text-primary uppercase tracking-wide mb-1 flex items-center">
            <UserPlus size={20} className="mr-2 text-primary" /> Add Member & Assign Role
          </h3>
          <p className="text-xs font-medium text-text-secondary mb-6">
            Invite a new team member into this workspace and assign their project role.
          </p>

          <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input 
              type="text" 
              placeholder="Member Name"
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs text-primary font-medium focus:outline-none focus:border-primary"
            />
            <input 
              type="email" 
              required
              placeholder="Member Email"
              value={newMemberEmail}
              onChange={e => setNewMemberEmail(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs text-primary font-medium focus:outline-none focus:border-primary"
            />
            <select 
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-2.5 text-xs font-bold text-primary focus:outline-none cursor-pointer"
            >
              <option value="" disabled>Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <select 
              value={newMemberRole}
              onChange={e => setNewMemberRole(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-2.5 text-xs font-bold text-primary focus:outline-none cursor-pointer"
            >
              <option value="Founder">Founder</option>
              <option value="Co-Founder">Co-Founder</option>
              <option value="Member">Member</option>
            </select>
            <button 
              type="submit"
              disabled={isInviting}
              className="btn-matte-primary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer font-heading disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isInviting ? (
                <>
                  <Loader2 size={15} className="mr-1.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Plus size={15} className="mr-1" /> Invite
                </>
              )}
            </button>
          </form>

          {/* Detailed Invite Feedback & 1-Click Fallback Panel */}
          {inviteResult && (
            <div className={`mt-5 p-4 rounded-xl border text-xs animate-in fade-in transition-all ${
              inviteResult.emailSent 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-950'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {inviteResult.emailSent ? (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-600 shrink-0" />
                    )}
                    <span>
                      {inviteResult.emailSent
                        ? `Invitation Email Dispatched to ${inviteResult.email}!`
                        : `Invite Registered in Firebase for ${inviteResult.email}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium opacity-90">
                    <span><strong>Project:</strong> {inviteResult.projectTitle}</span>
                    <span><strong>Role:</strong> <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{inviteResult.role}</span></span>
                    <span><strong>Invitee:</strong> {inviteResult.name}</span>
                  </div>

                  {!inviteResult.emailSent && (
                    <div className="mt-2.5 space-y-2">
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Automatic backend email: <span className="italic font-medium">{inviteResult.emailError}</span>.
                        <br />
                        You can immediately send the invitation to their email inbox with 1 click below:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inviteResult.email)}&su=${encodeURIComponent(`Invitation to join ${inviteResult.projectTitle} on Nayaruvi Pulse (${inviteResult.role})`)}&body=${encodeURIComponent(
                            `Hello ${inviteResult.name},\n\nYou have been invited to join the project "${inviteResult.projectTitle}" as a ${inviteResult.role} on Nayaruvi Pulse.\n\nClick the link below to accept your invitation, sign in, and start collaborating:\n${inviteResult.inviteLink}\n\nBest regards,\nNayaruvi Pulse Team`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors shadow-sm"
                        >
                          <Mail size={13} /> Send with Gmail Web
                        </a>
                        <a
                          href={`mailto:${encodeURIComponent(inviteResult.email)}?subject=${encodeURIComponent(`Invitation to join ${inviteResult.projectTitle} on Nayaruvi Pulse (${inviteResult.role})`)}&body=${encodeURIComponent(
                            `Hello ${inviteResult.name},\n\nYou have been invited to join "${inviteResult.projectTitle}" as a ${inviteResult.role} on Nayaruvi Pulse.\n\nAccept your invitation and join the project here:\n${inviteResult.inviteLink}\n\nBest regards,\nNayaruvi Pulse Team`
                          )}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#274245] hover:bg-[#1f3437] text-[#DFD6AE] font-bold text-[11px] transition-colors shadow-sm"
                        >
                          <Send size={13} /> Open in Mail App
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(inviteResult.inviteLink);
                            }
                            showStatus("Invite link copied to clipboard!");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-primary font-bold text-[11px] hover:bg-black/5 transition-colors cursor-pointer"
                        >
                          <Copy size={13} /> Copy Direct Link
                        </button>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-1">
                        💡 <strong>For zero-click automated server sending:</strong> Add a Google App Password to <code className="bg-black/5 px-1 py-0.5 rounded font-mono">backend/.env</code> under <code className="bg-black/5 px-1 py-0.5 rounded font-mono">SMTP_USER</code> and <code className="bg-black/5 px-1 py-0.5 rounded font-mono">SMTP_PASS</code>.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setInviteResult(null)}
                  className="text-text-secondary hover:text-primary text-xs font-bold px-1.5 py-0.5 cursor-pointer rounded hover:bg-black/5"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          </div>
        )}

        {/* Section 2: Projects & Members Role Management */}
        <div className="celestique-card rounded-2xl p-6 text-primary">
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-normal font-heading text-primary uppercase tracking-wide flex items-center">
                <FolderOpen size={20} className="mr-2 text-primary" /> Project Members & Role Management
              </h3>
              <p className="text-xs font-medium text-text-secondary mt-0.5">
                Select projects and change individual member roles directly inside each project.
              </p>
            </div>
          </div>

          {projects.length === 0 ? (
            <p className="text-xs text-text-secondary font-medium p-6 text-center">No projects created in this workspace yet.</p>
          ) : (
            <div className="space-y-6">
              {projects.map(proj => {
                const projMembers = proj.membersList && proj.membersList.length > 0 
                  ? proj.membersList 
                  : (proj.members ? (Array.isArray(proj.members) ? proj.members : Object.values(proj.members)) : members);
                return (
                  <div key={proj.id} className="p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
                    
                    {/* Project Header */}
                    <div className="flex justify-between items-center border-b border-[#E8E0BF] pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-primary text-surface flex items-center justify-center font-bold text-xs">
                          {proj.title.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-primary">{proj.title}</h4>
                          <span className="text-[11px] text-text-secondary font-medium">{proj.category || 'General Project'}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                        {projMembers.length} Project Members
                      </span>
                    </div>

                    {/* Member List in Project */}
                    <div className="space-y-3">
                      {projMembers.map(pm => (
                        <div key={pm.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-surface border border-border gap-3">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(pm.name || pm.email || 'Member')}&background=274245&color=FAF7EC`}
                              alt="Avatar"
                              className="w-8 h-8 rounded-full border border-primary object-cover"
                            />
                            <div>
                              <span className="text-xs font-bold text-primary block">{pm.name || 'Project Member'}</span>
                              <span className="text-[10px] text-text-secondary font-medium">{pm.email || 'member@nayaruvi.com'}</span>
                            </div>
                          </div>

                          {/* Role Selector for Project */}
                          <div className="flex items-center space-x-2">
                            <Shield size={13} className="text-text-secondary" />
                            <span className="text-[11px] font-bold text-text-secondary">Role:</span>
                            {isPrivileged ? (
                              <select 
                                value={pm.role || 'Member'}
                                onChange={e => handleProjectRoleChange(proj.id, pm.uid, e.target.value)}
                                className="bg-surface text-xs font-bold text-primary border border-border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                              >
                                <option value="Founder">Founder</option>
                                <option value="Co-Founder">Co-Founder</option>
                                <option value="Member">Member</option>
                              </select>
                            ) : (
                              <span className="text-xs font-bold text-primary">{pm.role || 'Member'}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pending Project Invitations */}
                    {proj.invitesList && proj.invitesList.filter(inv => inv.status !== 'Accepted').length > 0 && (
                      <div className="mt-4 pt-3 border-t border-dashed border-border space-y-2">
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                          Pending Project Invitations (Stored in DB)
                        </span>
                        {proj.invitesList.filter(inv => inv.status !== 'Accepted').map(inv => (
                          <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface/70 border border-border/60">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                                @
                              </div>
                              <div>
                                <span className="text-xs font-bold text-primary block">{inv.name || inv.email}</span>
                                <span className="text-[10px] text-text-secondary">{inv.email} • Role: {inv.role || 'Member'}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Invited
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Global Workspace Members */}
        <div className="celestique-card rounded-2xl p-6 text-primary">
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-normal font-heading text-primary uppercase tracking-wide flex items-center">
                <Shield size={20} className="mr-2 text-primary" /> Workspace Members & Global Roles
              </h3>
              <p className="text-xs font-medium text-text-secondary mt-0.5">
                Manage workspace-wide permissions for all team members.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {members.map(m => {
              const isMemberOwner = m.uid === workspace?.ownerId || m.uid === workspace?.createdBy || m.role === 'Owner';
              return (
                <div key={m.uid} className="p-3.5 rounded-xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || 'Member')}&background=274245&color=FAF7EC`} 
                      alt="Avatar" 
                      className="w-9 h-9 rounded-full border border-primary object-cover shrink-0" 
                    />
                    <div>
                      <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                        {m.name || 'Workspace Member'}
                        {isMemberOwner && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                            Owner
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-text-secondary font-medium">{m.email || 'user@nayaruvi.com'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-text-secondary">Workspace Role:</span>
                    {isMemberOwner ? (
                      <span className="text-xs font-bold text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-300">
                        Workspace Owner
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-primary bg-surface px-2.5 py-1 rounded-lg border border-border">
                        Member
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
