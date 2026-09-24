import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Building,
  ShieldCheck,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  FileCheck2,
  Lock,
  Globe,
  Sliders,
  LogOut,
  UserCheck,
  Building2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile } from '../lib/firebase';
import { validateGstinStructure, GST_STATE_MAP, saveRecentClient } from '../utils/gstinUtils';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onLogout?: () => void;
  onSwitchAccount?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  onLogout,
  onSwitchAccount,
}) => {
  const [displayName, setDisplayName] = useState(userProfile.displayName || '');
  const [companyName, setCompanyName] = useState(userProfile.companyName || '');
  const [companyGstin, setCompanyGstin] = useState(userProfile.companyGstin || '');
  const [state, setState] = useState(userProfile.state || 'Maharashtra (27)');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [noticeFooter, setNoticeFooter] = useState(
    userProfile.customPreferences?.noticeFooter ||
      'This is an automated system-generated statutory communication.'
  );
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state whenever modal opens or userProfile changes
  useEffect(() => {
    if (isOpen && userProfile) {
      setDisplayName(userProfile.displayName || '');
      setCompanyName(userProfile.companyName || '');
      setCompanyGstin(userProfile.companyGstin || '');
      setState(userProfile.state || 'Maharashtra (27)');
      setPhone(userProfile.phone || '');
      setNoticeFooter(
        userProfile.customPreferences?.noticeFooter ||
          'This is an automated system-generated statutory communication.'
      );
      setSavedSuccess(false);
    }
  }, [isOpen, userProfile]);

  const validation = validateGstinStructure(companyGstin);

  // Auto-detect state if valid GSTIN state code
  const handleGstinChange = (newGstin: string) => {
    const upper = newGstin.toUpperCase().trim();
    setCompanyGstin(upper);
    if (upper.length >= 2) {
      const code = upper.slice(0, 2);
      const stateName = GST_STATE_MAP[code];
      if (stateName) {
        setState(`${stateName} (${code})`);
      }
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const cleanGstin = companyGstin.trim().toUpperCase();
    const cleanCompanyName = companyName.trim() || 'Registered Enterprise';

    const updates: Partial<UserProfile> = {
      displayName: displayName.trim(),
      companyName: cleanCompanyName,
      companyGstin: cleanGstin,
      state,
      phone: phone.trim(),
      customPreferences: {
        ...userProfile.customPreferences,
        noticeFooter,
      },
    };

    const updatedProfile: UserProfile = {
      ...userProfile,
      ...updates,
    };

    try {
      // 1. Immediately propagate update to parent and local storage
      localStorage.setItem('clear_gst_local_profile', JSON.stringify(updatedProfile));
      if (cleanGstin) {
        localStorage.setItem('clear_gst_active_gstin', cleanGstin);
        saveRecentClient({
          gstin: cleanGstin,
          tradeName: cleanCompanyName,
          state: validation.stateName || 'Maharashtra',
          stateCode: validation.stateCode || '27',
          pan: validation.pan || cleanGstin.slice(2, 12),
        });
      }

      onProfileUpdated(updatedProfile);

      // 2. Persist to Firestore
      await updateUserProfile(userProfile.uid, updates);

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.warn('Profile save note:', err);
      // Still propagate the change even if cloud sync reports a warning
      onProfileUpdated(updatedProfile);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="user-profile-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="user-profile-modal-card"
        className="bg-white w-full max-w-xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#2D4A3E] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8DA173] flex items-center justify-center font-bold text-white shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Organization & User Profile</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                    userProfile.role === 'admin'
                      ? 'bg-[#8DA173] text-white'
                      : 'bg-white/20 text-[#D3DCD6]'
                  }`}
                >
                  {userProfile.role}
                </span>
              </div>
              <p className="text-xs text-[#D3DCD6]">{userProfile.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#D3DCD6] hover:text-white rounded-lg hover:bg-[#3D5C4F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
          {savedSuccess && (
            <div className="bg-[#EDF3EF] border border-[#BBD3C5] text-[#2D4A3E] p-3 rounded-xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#8DA173]" />
              <span>Workspace Profile updated successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                Officer / User Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                Company Legal Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#2D4A3E] block">
                  Company / Client GSTIN (15 Digits)
                </label>
                {companyGstin.length > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      validation.isValid
                        ? 'bg-[#EDF3EF] text-[#2D4A3E]'
                        : 'bg-[#FFF2F0] text-[#C75D4E]'
                    }`}
                  >
                    {validation.isValid ? 'Valid Format' : `${companyGstin.length}/15`}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={15}
                value={companyGstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
              Registered State / Place of Supply
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] bg-white"
            >
              {Object.entries(GST_STATE_MAP).map(([code, name]) => (
                <option key={code} value={`${name} (${code})`}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
              Statutory Notice Sign-off Footer
            </label>
            <textarea
              rows={2}
              value={noticeFooter}
              onChange={(e) => setNoticeFooter(e.target.value)}
              placeholder="Footer text appended to all vendor notices..."
              className="w-full p-2.5 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
            />
          </div>

          <div className="bg-[#F7F8F6] p-3.5 rounded-xl border border-[#E0E4DE] flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#2D4A3E] block">User Profile Status</span>
              <span className="text-[11px] text-[#738276]">
                Member since {new Date(userProfile.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#EDF3EF] text-[#2D4A3E]">
              {userProfile.status || 'Active'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E0E4DE] mt-2">
            <div className="flex items-center gap-2">
              {onSwitchAccount && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchAccount();
                  }}
                  className="px-3 py-2 border border-[#E0E4DE] hover:border-[#8DA173] text-[#2D4A3E] rounded-xl text-xs font-bold hover:bg-[#F7F8F6] transition-colors flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Switch Account / Sign In</span>
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="px-3 py-2 border border-[#F5C2BC] hover:border-[#C75D4E] text-[#C75D4E] hover:bg-[#FFF2F0] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#738276] hover:bg-[#F7F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#2D4A3E] text-white rounded-xl text-xs font-bold hover:bg-[#1E362C] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
