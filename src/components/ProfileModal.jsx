import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Camera, Check, LogOut, Loader2 } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function ProfileModal({ isOpen, onClose, profile, onSave }) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    name: profile?.name || auth.currentUser?.displayName || '',
    email: profile?.email || auth.currentUser?.email || '',
    role: profile?.role || '',
    avatar: profile?.avatar || auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || auth.currentUser?.displayName || 'User')}&background=274245&color=DFD6AE`,
    bio: profile?.bio || ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: profile?.name || auth.currentUser?.displayName || '',
        email: profile?.email || auth.currentUser?.email || '',
        role: profile?.role || '',
        avatar: profile?.avatar || auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || auth.currentUser?.displayName || 'User')}&background=274245&color=DFD6AE`,
        bio: profile?.bio || ''
      });
    }
  }, [profile, isOpen]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size too large. Please upload an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 256;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setFormData(prev => ({ ...prev, avatar: compressed }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(formData);
      }
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error("Save profile error:", err);
      alert("Failed to save profile: " + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="celestique-card rounded-2xl w-full max-w-lg p-6 shadow-celestique-lg animate-in fade-in zoom-in duration-200 text-primary">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
          <div>
            <h3 className="text-2xl font-normal text-primary font-heading uppercase tracking-wide">
              Profile Settings
            </h3>
            <p className="text-xs font-medium text-text-secondary mt-0.5">
              View and edit your personal details and account information.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-text-secondary hover:text-primary p-1.5 rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Avatar Preview */}
          <div className="flex items-center space-x-4 p-3 bg-surface rounded-xl border border-border">
            <div className="relative">
              <img 
                src={formData.avatar} 
                alt="Profile Avatar" 
                className="w-16 h-16 rounded-full border-2 border-primary object-cover shadow-sm"
              />
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-[10px]">
                <Camera size={11} />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-text-primary mb-1">Upload Profile Photo</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-primary focus:outline-none focus:border-primary file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover transition-colors"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5 flex items-center">
              <User size={14} className="mr-1.5 text-text-secondary" /> Full Name
            </label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-primary font-medium focus:outline-none focus:border-primary transition-all"
              placeholder="Your full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-[#4A443E] mb-1.5 flex items-center">
              <Mail size={14} className="mr-1.5 text-[#7D7268]" /> Email Address
            </label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-surface border border-[#DDD5CC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B2420] font-medium focus:outline-none focus:border-[#2B2420] transition-all"
              placeholder="your.email@nayaruvi.com"
            />
          </div>



          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-[#4A443E] mb-1.5">Bio / Description</label>
            <textarea 
              rows={2}
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-surface border border-[#DDD5CC] rounded-xl p-3 text-xs text-[#2B2420] font-medium focus:outline-none focus:border-[#2B2420] resize-none"
              placeholder="Tell your team about yourself..."
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex flex-col gap-3">
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-matte-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-matte-primary flex items-center justify-center cursor-pointer font-heading disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <Loader2 size={16} className="mr-1.5 animate-spin" /> Saving...
                  </span>
                ) : isSaved ? (
                  <span className="flex items-center">
                    <Check size={16} className="mr-1 text-emerald-400" /> Saved!
                  </span>
                ) : 'Save Profile'}
              </button>
            </div>
            <button 
              type="button" 
              onClick={async () => {
                try {
                  await signOut(auth);
                  onClose();
                } catch (err) {
                  console.error("Sign out error:", err);
                }
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors"
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
