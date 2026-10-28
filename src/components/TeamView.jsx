import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { Users, FolderOpen, Shield, Mail, User } from 'lucide-react';
import { updateProjectMemberRole } from '../services/firebaseService';

export default function TeamView({ activeWorkspaceId, activeProjectId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUserRole = members.find(m => m.uid === auth.currentUser?.uid)?.role || 'Member';
  const isPrivileged = currentUserRole === 'Founder';

  useEffect(() => {
    if (!activeProjectId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const projRef = ref(db, `projects/${activeProjectId}`);
    const unSub = onValue(projRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const memberList = data.members ? Object.values(data.members) : [];
        setMembers(memberList);
      } else {
        setMembers([]);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching project members:", err);
      setLoading(false);
    });

    return () => unSub();
  }, [activeProjectId]);

  const handleRoleChange = async (memberUid, newRole) => {
    if (!activeProjectId || !memberUid) return;
    try {
      await updateProjectMemberRole(activeProjectId, memberUid, newRole);
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-4xl font-bold text-primary font-heading mb-2 tracking-tight">TEAM</h1>
          <p className="text-text-secondary font-medium">Manage project members, roles, and access.</p>
        </div>
        <div className="bg-surface px-4 py-2 rounded-xl border border-border shadow-sm flex items-center gap-3">
          <Users size={20} className="text-primary" />
          <span className="font-bold text-primary">{members.length} Members</span>
        </div>
      </div>

      {!activeProjectId ? (
        <div className="celestique-card p-12 text-center flex flex-col items-center justify-center rounded-2xl border border-[#C9BD91]">
          <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center mb-4">
            <FolderOpen size={32} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold text-primary mb-2 font-heading">No Project Selected</h3>
          <p className="text-text-secondary max-w-md">Please select a project from the sidebar to manage team members.</p>
        </div>
      ) : (
        <div className="w-full">
          <div className="celestique-card rounded-2xl overflow-hidden border border-[#C9BD91]">
            <div className="p-6 border-b border-[#C9BD91]/50 bg-surface/50 backdrop-blur-sm flex justify-between items-center">
              <h3 className="text-lg font-bold text-primary font-heading">Project Members</h3>
            </div>
            <div className="divide-y divide-[#C9BD91]/30">
              {members.length === 0 ? (
                <div className="p-8 text-center text-text-secondary">No members in this project.</div>
              ) : (
                members.map((member, i) => (
                  <div key={i} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.email || 'User')}&background=274245&color=DFD6AE`} 
                        alt="avatar" 
                        className="w-12 h-12 rounded-xl border border-[#C9BD91] shadow-sm"
                      />
                      <div>
                        <h4 className="font-bold text-primary flex items-center gap-2">
                          {member.name || 'Unknown User'}
                          {member.uid === auth.currentUser?.uid && (
                            <span className="text-[10px] uppercase font-bold bg-[#E8E0BF] text-primary px-2 py-0.5 rounded-full">You</span>
                          )}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
                          <span className="flex items-center gap-1"><Mail size={14}/> {member.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPrivileged ? (
                        <select 
                          value={member.role || 'Member'}
                          onChange={e => handleRoleChange(member.uid, e.target.value)}
                          className="bg-surface text-xs font-bold text-primary border border-border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                        >
                          <option value="Founder">Founder</option>
                          <option value="Co-Founder">Co-Founder</option>
                          <option value="Member">Member</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                          member.role === 'Founder' || member.role === 'Admin'
                            ? 'bg-primary text-background'
                            : 'bg-[#E8E0BF] text-primary'
                        }`}>
                          {member.role === 'Founder' || member.role === 'Admin' ? <Shield size={12} /> : <User size={12} />}
                          {member.role || 'Member'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
