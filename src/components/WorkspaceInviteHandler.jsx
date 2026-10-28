import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { ref, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { addWorkspaceMember, logActivity } from '../services/firebaseService';
import LoginPage from './LoginPage';

export default function WorkspaceInviteHandler() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('Checking invitation...');
  const [error, setError] = useState('');
  const [joinedSuccess, setJoinedSuccess] = useState(false);
  const joinAttemptedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading || !user || !workspaceId || joinAttemptedRef.current) return;

    joinAttemptedRef.current = true;
    handleJoin(user);
  }, [authLoading, user, workspaceId]);

  const handleJoin = async (currentUser) => {
    try {
      setStatus('Validating workspace invitation...');
      setError('');

      const wsRef = ref(db, `workspaces/${workspaceId}`);
      const snapshot = await get(wsRef);
      
      if (!snapshot.exists()) {
        setError('Workspace not found or invite link is invalid.');
        return;
      }

      const wsData = snapshot.val();
      const isMember = wsData.members && Object.values(wsData.members).some(m => m.uid === currentUser.uid);
      
      if (!isMember) {
        setStatus(`Joining "${wsData.name || 'Workspace'}"...`);
        
        await addWorkspaceMember(workspaceId, {
          uid: currentUser.uid,
          name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User'),
          email: currentUser.email || '',
          role: 'Member'
        });

        await logActivity({
          user: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User'),
          action: 'joined workspace',
          target: wsData.name || 'Workspace',
          workspaceId
        });
      }
      
      setJoinedSuccess(true);
      setStatus(`Welcome to ${wsData.name || 'the workspace'}! Redirecting...`);
      setTimeout(() => navigate(`/?ws=${workspaceId}`), 1200);

    } catch (err) {
      console.error("Workspace invite error:", err);
      setError('Error joining workspace: ' + (err.message || 'Please try again.'));
      joinAttemptedRef.current = false;
    }
  };

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

  if (!user) {
    return (
      <LoginPage 
        inviteInfo={{
          type: 'workspace',
          workspaceId
        }}
      />
    );
  }

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
                  handleJoin(user);
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
            <h3 className="text-lg font-bold text-[#274245] mb-1 font-heading">Workspace Invitation</h3>
            <p className="text-sm text-[#5C6E6F] font-medium">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
