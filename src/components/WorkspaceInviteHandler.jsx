import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { ref, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { addWorkspaceMember, logActivity } from '../services/firebaseService';

export default function WorkspaceInviteHandler() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Checking invitation...');

  useEffect(() => {
    const handleJoin = async (user) => {
      try {
        const wsRef = ref(db, `workspaces/${workspaceId}`);
        const snapshot = await get(wsRef);
        
        if (snapshot.exists()) {
          const wsData = snapshot.val();
          
          // Check if already a member
          const isMember = wsData.members && Object.values(wsData.members).some(m => m.uid === user.uid);
          
          if (!isMember) {
            setStatus('Joining workspace...');
            
            await addWorkspaceMember(workspaceId, {
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              role: 'Member'
            });

            await logActivity({
              user: user.displayName || user.email?.split('@')[0] || 'User',
              action: 'joined workspace',
              target: wsData.name || 'Workspace',
              workspaceId
            });
          }
          
          setStatus('Success! Redirecting...');
          setTimeout(() => navigate(`/?ws=${workspaceId}`), 1000);
        } else {
          setStatus('Workspace not found or invite link is invalid.');
        }
      } catch (err) {
        setStatus('Error joining workspace. Please try again.');
        console.error(err);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        handleJoin(user);
      } else {
        setStatus('Please log in to join this workspace.');
        setTimeout(() => navigate('/'), 2000);
      }
    });

    return () => unsubscribe();
  }, [workspaceId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800 p-4">
      <div className="bg-surface p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Workspace Invitation</h2>
        <p className="text-text-secondary font-medium">{status}</p>
        
        {status.includes('invalid') || status.includes('Error') ? (
          <button 
            onClick={() => navigate('/')}
            className="mt-6 w-full bg-primary text-white py-2 px-4 rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </button>
        ) : (
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}
