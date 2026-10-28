import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  getProject, 
  acceptProjectInvite 
} from '../services/firebaseService';
import LoginPage from './LoginPage';

export default function InviteHandler() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId');
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Checking invitation...');
  const [error, setError] = useState('');
  const [joinedSuccess, setJoinedSuccess] = useState(false);
  const joinAttemptedRef = useRef(false);

  // 1. Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Once user is authenticated, process project invite
  useEffect(() => {
    if (authLoading || !user || !projectId || joinAttemptedRef.current) return;

    joinAttemptedRef.current = true;
    processInvite(user);
  }, [authLoading, user, projectId]);

  const processInvite = async (currentUser) => {
    try {
      setStatus('Validating project invitation...');
      setError('');

      let targetWsId = workspaceId;
      let projectData = null;

      // Lookup project (with targetWsId if known, or fallback scan)
      if (targetWsId) {
        projectData = await getProject(targetWsId, projectId);
      }
      if (!projectData) {
        projectData = await getProject(projectId);
        if (projectData?.workspaceId) {
          targetWsId = projectData.workspaceId;
        }
      }

      if (!projectData || !targetWsId) {
        setError("Project not found or invite link is invalid. Please verify the invitation with your team administrator.");
        return;
      }

      setStatus(`Adding you to "${projectData.title || 'Project'}"...`);

      // Add user to workspace and project
      await acceptProjectInvite(targetWsId, projectId, currentUser);

      setJoinedSuccess(true);
      setStatus(`Welcome! You are now a member of ${projectData.title || 'the project'}. Redirecting...`);

      // Redirect into the workspace and project
      setTimeout(() => {
        navigate(`/?ws=${targetWsId}&proj=${projectId}&tab=Projects`);
      }, 1200);

    } catch (err) {
      console.error("Invite processing error:", err);
      setError("Failed to join project: " + (err.message || 'Please try again.'));
      joinAttemptedRef.current = false; // Allow retry on failure
    }
  };

  // Case 1: Checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-[#FAF7EC] p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-[#DDD5CC]">
          <div className="w-10 h-10 border-4 border-[#274245] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#274245] font-bold text-base">Checking invitation...</p>
        </div>
      </div>
    );
  }

  // Case 2: Not logged in -> Show login/signup with invite context
  if (!user) {
    return (
      <LoginPage 
        inviteInfo={{
          type: 'project',
          projectId,
          workspaceId
        }}
      />
    );
  }

  // Case 3: Logged in -> Show progress, success or error
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-[#FAF7EC] p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-[#DDD5CC]">
        {error ? (
          <div>
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              ✕
            </div>
            <h3 className="text-xl font-bold text-[#274245] mb-2 font-heading">Invitation Error</h3>
            <p className="text-sm text-[#5C6E6F] mb-6 leading-relaxed">{error}</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => {
                  joinAttemptedRef.current = false;
                  processInvite(user);
                }}
                className="px-4 py-2.5 bg-[#274245] text-[#DFD6AE] rounded-xl font-bold hover:bg-[#1f3437] transition-colors cursor-pointer text-sm"
              >
                Retry
              </button>
              <button 
                onClick={() => navigate('/')}
                className="px-4 py-2.5 bg-white border border-[#DDD5CC] text-[#274245] rounded-xl font-bold hover:bg-[#F2ECE1] transition-colors cursor-pointer text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : joinedSuccess ? (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              ✓
            </div>
            <h3 className="text-xl font-bold text-[#274245] mb-2 font-heading">Invitation Accepted!</h3>
            <p className="text-sm text-[#5C6E6F] font-medium">{status}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-[#274245] border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-bold text-[#274245] mb-1 font-heading">Accepting Invitation</h3>
            <p className="text-sm text-[#5C6E6F] font-medium">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
