import React from 'react';
import { 
  Home, Folder, CheckSquare, Calendar, 
  Users, Activity, BarChart2, Settings,
  Crown, ChevronDown, CheckCircle2, MessageSquare, ListTodo
} from 'lucide-react';
import WorkspaceSelector from './WorkspaceSelector';
import ProjectSelector from './ProjectSelector';

export default function Sidebar({ 
  isOpen, setIsOpen, activeTab, setActiveTab, 
  activeWorkspaceId, setActiveWorkspaceId, 
  activeProjectId, setActiveProjectId,
  userProfile, onOpenProfileModal 
}) {
  const baseClasses = "w-[260px] flex-shrink-0 bg-primary text-background border-r border-primary-hover flex flex-col h-full shadow-sapling-lg transition-transform duration-300";
  const mobileClasses = "fixed inset-y-0 left-0 z-40 xl:relative xl:translate-x-0";
  const translateClass = isOpen ? "translate-x-0" : "-translate-x-full xl:hidden";

  return (
    <aside className={`${baseClasses} ${mobileClasses} ${translateClass}`}>
      {/* Brand Logo */}
      <div className="h-[72px] flex items-center px-6 cursor-pointer shrink-0">
        <img src="/logo.png" alt="Nayaruvi Logo" className="w-12 h-12 mr-3.5 object-contain" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold tracking-widest text-background leading-none font-heading uppercase">Nayaruvi</span>
          <span className="text-[9px] font-bold text-background/90 tracking-widest uppercase mt-1">Pulse</span>
        </div>
      </div>

      <div className="px-4">
        <WorkspaceSelector 
          activeWorkspaceId={activeWorkspaceId} 
          setActiveWorkspaceId={setActiveWorkspaceId} 
          onOpenSettings={() => setActiveTab('Settings')}
        />
        <ProjectSelector
          activeWorkspaceId={activeWorkspaceId}
          activeProjectId={activeProjectId}
          setActiveProjectId={setActiveProjectId}
          onNavigateToProjects={() => setActiveTab('Projects')}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-1.5 pt-1">
        <NavItem icon={<Home size={18} />} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => { setActiveTab('Dashboard'); if (window.innerWidth < 1280) setIsOpen(false); }} />
        <NavItem icon={<Folder size={18} />} label="Projects" active={activeTab === 'Projects'} onClick={() => { setActiveTab('Projects'); if (window.innerWidth < 1280) setIsOpen(false); }} />
        <NavItem icon={<CheckSquare size={18} />} label="Tasks" active={activeTab === 'Tasks'} onClick={() => { setActiveTab('Tasks'); if (window.innerWidth < 1280) setIsOpen(false); }} />
        <NavItem icon={<ListTodo size={18} />} label="Checklist" active={activeTab === 'Checklist'} onClick={() => { setActiveTab('Checklist'); if (window.innerWidth < 1280) setIsOpen(false); }} />
        <NavItem icon={<Users size={18} />} label="Team" active={activeTab === 'Team'} onClick={() => { setActiveTab('Team'); if (window.innerWidth < 1280) setIsOpen(false); }} />
        <NavItem icon={<Activity size={18} />} label="Activity" active={activeTab === 'Activity'} onClick={() => { setActiveTab('Activity'); if (window.innerWidth < 1280) setIsOpen(false); }} />
        <NavItem icon={<Settings size={18} />} label="Settings" active={activeTab === 'Settings'} onClick={() => { setActiveTab('Settings'); if (window.innerWidth < 1280) setIsOpen(false); }} />
      </div>

      {/* User Profile Footer (Single Place Down in Left Corner) */}
      <div className="p-4 border-t border-primary-hover bg-black/15">
        <div 
          onClick={onOpenProfileModal}
          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface/10 border border-transparent hover:border-white/15 cursor-pointer transition-all duration-150 group"
          title="Click to view & edit profile"
        >
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-background p-[2px] shadow-xs">
              <img 
                src={userProfile?.avatar || "https://ui-avatars.com/api/?name=Manikandan&background=274245&color=DFD6AE"} 
                alt="User" 
                className="w-full h-full rounded-full border-2 border-primary object-cover" 
              />
            </div>
            <div className="ml-3 flex flex-col">
              <span className="text-xs font-bold text-background leading-tight group-hover:underline">{userProfile?.name || "User"}</span>
              {userProfile?.role && (
                <span className="text-[11px] text-background/75 font-medium">{userProfile.role}</span>
              )}
            </div>
          </div>
          <ChevronDown size={14} className="text-background/75 group-hover:text-white" />
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 group ${
      active 
      ? 'bg-background text-primary font-bold shadow-md' 
      : 'text-background/80 hover:text-white hover:bg-surface/10 font-medium border border-transparent'
    }`}>
      <div className="flex items-center">
        <div className={`mr-3.5 transition-colors ${active ? 'text-primary' : 'text-background/75 group-hover:text-white'}`}>{icon}</div>
        <span className="text-[14px] tracking-tight">{label}</span>
      </div>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
    </div>
  );
}
