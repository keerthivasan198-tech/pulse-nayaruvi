import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import DashboardView from './components/DashboardView';
import TasksView from './components/TasksView';
import ProjectsView from './components/ProjectsView';
import ChecklistView from './components/ChecklistView';
import TeamView from './components/TeamView';
import ActivityView from './components/ActivityView';
import LoginPage from './components/LoginPage';
import { auth, db } from './firebase';
import { ref, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import InviteHandler from './components/InviteHandler';
import WorkspaceInviteHandler from './components/WorkspaceInviteHandler';
import NotificationManager from './components/NotificationManager';
import SettingsView from './components/SettingsView';
import ProfileModal from './components/ProfileModal';
import TaskDetailModal from './components/TaskDetailModal';

function MainApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1280);
  const [user, setUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'Dashboard');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(searchParams.get('ws') || null);
  const [activeProjectId, setActiveProjectId] = useState(searchParams.get('proj') || null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);

  // Profile Modal State & User Profile Details
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    role: '',
    avatar: '',
    bio: ''
  });

  // Sync tab state with URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    let changed = false;
    
    if (activeTab !== newParams.get('tab')) {
      newParams.set('tab', activeTab);
      changed = true;
    }
    if (activeWorkspaceId && activeWorkspaceId !== newParams.get('ws')) {
      newParams.set('ws', activeWorkspaceId);
      changed = true;
    }
    if (activeProjectId && activeProjectId !== newParams.get('proj')) {
      newParams.set('proj', activeProjectId);
      changed = true;
    }
    
    if (changed) {
      setSearchParams(newParams, { replace: true });
    }
  }, [activeTab, activeWorkspaceId, activeProjectId, searchParams, setSearchParams]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUserProfile(prev => ({
          ...prev,
          email: currentUser.email || prev.email,
          name: currentUser.displayName || prev.name || currentUser.email?.split('@')[0],
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email || 'User')}&background=274245&color=DFD6AE`,
        }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen w-full bg-background text-primary overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeWorkspaceId={activeWorkspaceId}
        setActiveWorkspaceId={setActiveWorkspaceId}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        userProfile={userProfile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative bg-background">
        <TopNav 
          activeWorkspaceId={activeWorkspaceId}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          activeProjectId={activeProjectId} 
          setSelectedTask={setSelectedTaskForModal}
          setActiveTab={setActiveTab}
        />
        
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 w-full h-full flex flex-col overflow-auto custom-scrollbar overflow-x-hidden"
            >
              {activeTab === 'Dashboard' && <DashboardView activeWorkspaceId={activeWorkspaceId} />}
              {activeTab === 'Projects' && <ProjectsView activeWorkspaceId={activeWorkspaceId} activeProjectId={activeProjectId} setActiveProjectId={setActiveProjectId} setActiveTab={setActiveTab} />}
              {activeTab === 'Tasks' && <TasksView activeWorkspaceId={activeWorkspaceId} activeProjectId={activeProjectId} setSelectedTaskFromOutside={setSelectedTaskForModal} />}
              {activeTab === 'Checklist' && <ChecklistView activeWorkspaceId={activeWorkspaceId} activeProjectId={activeProjectId} />}
              {activeTab === 'Team' && <TeamView activeWorkspaceId={activeWorkspaceId} activeProjectId={activeProjectId} />}
              {activeTab === 'Activity' && <ActivityView activeWorkspaceId={activeWorkspaceId} activeProjectId={activeProjectId} />}
              {activeTab === 'Settings' && <SettingsView activeWorkspaceId={activeWorkspaceId} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <NotificationManager 
          activeWorkspaceId={activeWorkspaceId}
          activeProjectId={activeProjectId} 
          onNotificationClick={async (taskId) => {
            try {
              const snapshot = await get(ref(db, `dashboard_tasks/${taskId}`));
              if (snapshot.exists()) {
                setSelectedTaskForModal(snapshot.val());
                setActiveTab('Tasks');
              }
            } catch (error) {
              console.error("Failed to fetch task from notification", error);
            }
          }}
        />
      </main>

      <AnimatePresence>
        {selectedTaskForModal && (
          <TaskDetailModal 
            task={selectedTaskForModal} 
            projectId={activeProjectId || selectedTaskForModal.projectId}
            workspaceId={activeWorkspaceId || selectedTaskForModal.workspaceId}
            onClose={() => setSelectedTaskForModal(null)} 
          />
        )}
      </AnimatePresence>

      {/* Interactive Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={userProfile}
        onSave={(updatedProfile) => setUserProfile(updatedProfile)}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/invite/:projectId" element={<InviteHandler />} />
        <Route path="/invite-ws/:workspaceId" element={<WorkspaceInviteHandler />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}
