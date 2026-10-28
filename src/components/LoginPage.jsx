import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { Mail, Lock, LogIn, CheckCircle2, ChevronRight, Activity, AlertCircle, User } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleRedirect = () => {
    const inviteId = searchParams.get('invite');
    const wsId = searchParams.get('workspaceId');
    if (inviteId) {
      navigate(`/invite/${inviteId}${wsId ? `?workspaceId=${wsId}` : ''}`);
    }
  };

  const formatAuthError = (err) => {
    const code = err.code || '';
    const msg = err.message || '';

    if (code === 'auth/configuration-not-found' || msg.includes('configuration-not-found')) {
      return (
        <div>
          <span className="font-bold block mb-1">Firebase Authentication Not Initialized</span>
          <span>Authentication is not enabled yet in your Firebase Console. Go to </span>
          <a 
            href="https://console.firebase.google.com/project/pulsenayaruvi/authentication" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline font-bold text-danger hover:opacity-80"
          >
            Firebase Console &gt; Authentication
          </a>
          <span>, click <strong>Get Started</strong>, and enable <strong>Email/Password</strong> and <strong>Google</strong> sign-in providers.</span>
        </div>
      );
    }
    if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
      return (
        <div>
          <span className="font-bold block mb-1">Sign-In Method Not Enabled</span>
          <span>This sign-in provider is disabled in Firebase. Go to </span>
          <a 
            href="https://console.firebase.google.com/project/pulsenayaruvi/authentication/providers" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline font-bold text-danger hover:opacity-80"
          >
            Firebase Console &gt; Sign-in method
          </a>
          <span>, click <strong>Email/Password</strong>, toggle <strong>Enable</strong> to ON, and click <strong>Save</strong>. (Do the same for <strong>Google</strong> if you plan to use Google Sign-In).</span>
        </div>
      );
    }
    if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
      return "This email is already registered. Please click 'Sign in' below to access your account.";
    }
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || msg.includes('invalid-credential') || msg.includes('user-not-found')) {
      return "Account not found or invalid credentials. If you haven't created an account yet, click 'Sign up' below.";
    }
    if (code === 'auth/wrong-password') {
      return "Incorrect password. Please try again.";
    }
    if (code === 'auth/popup-closed-by-user') {
      return "Sign-in popup was closed before completion.";
    }
    if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
      return "This domain (localhost) is not authorized in Firebase Console > Authentication > Settings > Authorized domains.";
    }
    return err.message || `Failed to sign ${isSignUp ? 'up' : 'in'}. Please check your credentials.`;
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error("Name is required");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      handleRedirect();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      handleRedirect();
    } catch (err) {
      setError(formatAuthError(err));
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background font-sans overflow-hidden">
      <div className="flex w-full h-full min-h-screen overflow-hidden">
      
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex flex-col w-[50%] bg-[#FDF9ED] border-r border-border overflow-hidden">
        {/* Logo */}
        <div className="flex items-center p-10 pb-6 shrink-0">
          <img src="/logo.png" alt="Nayaruvi Logo" className="w-12 h-12 mr-3 object-contain" />
          <div>
            <h1 className="font-bold text-2xl text-primary tracking-tight uppercase font-heading leading-tight">Nayaruvi</h1>
            <span className="text-[11px] font-bold text-primary/80 tracking-widest uppercase block leading-none mt-1">Pulse</span>
          </div>
        </div>
        
        {/* Image */}
        <div className="flex-1 w-full relative">
          <img src="/hero-new.jpg" alt="Team Members" className="absolute inset-0 w-full h-full object-contain" />
        </div>
      </div>

      {/* Right Side - Login Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-background relative">
        <div className="w-full max-w-[420px]">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-text-primary mb-2">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-text-secondary font-medium">
              {isSignUp ? 'Get started with Nayaruvi today.' : 'Please enter your details to sign in.'}
            </p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center py-3 px-4 bg-surface border border-border rounded-[12px] text-sm font-bold text-text-primary hover:bg-white transition-colors shadow-sm mb-6"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign {isSignUp ? 'up' : 'in'} with Google
          </button>

          <div className="flex items-center mb-6">
            <div className="flex-1 h-px bg-[var(--color-border)]"></div>
            <span className="px-4 text-xs font-semibold text-text-secondary uppercase">Or with email</span>
            <div className="flex-1 h-px bg-[var(--color-border)]"></div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-danger/10 border border-danger/20 rounded-[10px] text-danger text-sm font-medium flex items-center">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-bold text-text-primary mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="w-full bg-surface border border-border rounded-[12px] pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full bg-surface border border-border rounded-[12px] pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-surface border border-border rounded-[12px] pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 mb-6">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-[var(--color-border)] text-primary focus:ring-primary/20 accent-primary" />
                <span className="ml-2 text-sm font-medium text-text-secondary">Remember me</span>
              </label>
              {!isSignUp && (
                <a href="#" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-[12px] text-sm font-bold transition-all shadow-md shadow-primary/30 flex items-center justify-center group disabled:opacity-70"
            >
              {loading ? (
                <Activity size={18} className="animate-spin" />
              ) : (
                <>
                  Continue
                  <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <p className="text-center text-sm font-medium text-text-secondary mt-8">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
            <button 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="font-bold text-primary hover:text-primary/80 cursor-pointer bg-transparent border-none"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>

        </div>
      </div>
    </div>
  </div>
  );
}
