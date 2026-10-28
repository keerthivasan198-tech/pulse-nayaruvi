import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  getProject, 
  addWorkspaceMember, 
  addProjectMember, 
  logActivity 
} from '../services/firebaseService';

export default function InviteHandler() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setError("No project ID provided.");
      setLoading(false);
      return;
    }

    const fetchProj = async () => {
      try {
        const data = await getProject(projectId);
        if (!data) {
          setError("Project not found or link is invalid.");
          return;
        }
        setProject(data);
        
        if (!workspaceId && data.workspaceId) {
          const params = new URLSearchParams(searchParams);
          params.set('workspaceId', data.workspaceId);
          setSearchParams(params, { replace: true });
        }
      } catch (err) {
        console.error(err);
        setError("Error loading project details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProj();
  }, [projectId]);

  useEffect(() => {
    if (error || !project) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await addUserToProjectAndWorkspace(user);
      } else {
        navigate(`/?invite=${projectId}&workspaceId=${project.workspaceId || workspaceId}`);
      }
    });

    return () => unsubscribe();
  }, [project, error]);

  const addUserToProjectAndWorkspace = async (user) => {
    if (!project) return;
    
    const wsId = workspaceId || project.workspaceId;
    const payload = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: 'Member'
    };

    try {
      if (wsId) {
        await addWorkspaceMember(wsId, payload);
      }

      await addProjectMember(projectId, payload);
      
      await logActivity({
        user: payload.name,
        action: 'joined via invite link',
        target: project.title || 'Project',
        workspaceId: wsId
      });

      navigate(`/?ws=${wsId}&proj=${projectId}`);
    } catch (err) {
      console.error("Invite processing error:", err);
      setError("Failed to join project. " + (err.message || ''));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800 p-4">
      <div className="bg-surface p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-text-primary font-bold">Joining project...</p>
          </div>
        ) : error ? (
          <div>
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">✕</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Invitation Error</h3>
            <p className="text-sm text-text-secondary mb-6">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-primary text-white py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-text-primary font-bold">Redirecting to project...</p>
          </div>
        )}
      </div>
    </div>
  );
}
