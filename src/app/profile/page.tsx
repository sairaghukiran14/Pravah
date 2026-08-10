'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ArrowLeft,
  Mail,
  Calendar,
  FolderGit2,
  Save,
  Loader2,
  Check,
  Camera,
  User as UserIcon,
  Sparkles,
  Volume2,
  Languages,
  Bot,
  RefreshCw,
  Cpu,
  Layers,
  Briefcase,
  Code2,
  Settings,
  Activity,
  Globe2,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  credits: number;
  createdAt: string;
  _count: { projects: number };
}

interface OnboardingData {
  role?: string;
  useCases?: string[];
  languages?: string[];
  scale?: string;
  completedAt?: string;
}

const ROLE_MAP: Record<string, { title: string; icon: React.ReactNode }> = {
  developer: { title: 'AI / Software Engineer', icon: <Code2 className="h-4 w-4" /> },
  product: { title: 'Product Manager / Founder', icon: <Briefcase className="h-4 w-4" /> },
  researcher: { title: 'Data Scientist / Researcher', icon: <Cpu className="h-4 w-4" /> },
  architect: { title: 'Enterprise Architect', icon: <Layers className="h-4 w-4" /> },
};

const USE_CASE_MAP: Record<string, { title: string; icon: React.ReactNode }> = {
  voice_assistant: { title: 'Voice Assistants & Bots', icon: <Bot className="h-3.5 w-3.5" /> },
  translation: { title: 'Audio & Document Translation', icon: <Languages className="h-3.5 w-3.5" /> },
  tts_narration: { title: 'Voice Synthesis & Narration', icon: <Volume2 className="h-3.5 w-3.5" /> },
  custom_flow: { title: 'Custom AI Workflows', icon: <Sparkles className="h-3.5 w-3.5" /> },
};

const LANG_MAP: Record<string, { name: string; script: string }> = {
  'en-US': { name: 'English', script: 'English' },
  'hi-IN': { name: 'Hindi', script: 'हिंदी' },
  'te-IN': { name: 'Telugu', script: 'తెలుగు' },
  'ta-IN': { name: 'Tamil', script: 'தமிழ்' },
  'bn-IN': { name: 'Bengali', script: 'বাংলা' },
  'mr-IN': { name: 'Marathi', script: 'मराठी' },
  'gu-IN': { name: 'Gujarati', script: 'ગુજરાતી' },
  'kn-IN': { name: 'Kannada', script: 'ಕನ್ನಡ' },
  'ml-IN': { name: 'Malayalam', script: 'മലയാളം' },
  'pa-IN': { name: 'Punjabi', script: 'ਪੰਜਾਬੀ' },
};

const SCALE_MAP: Record<string, string> = {
  starter: '< 10k runs/mo',
  growth: '10k - 100k runs/mo',
  enterprise: '100k+ runs/mo',
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status: authStatus, update: updateSession } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [isTopupLoading, setIsTopupLoading] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; title: string; message: string; isError?: boolean } | null>(null);
  const [imageError, setImageError] = useState(false);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/user/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchTransactions() {
    setIsTransactionsLoading(true);
    try {
      const res = await fetch('/api/user/transactions');
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch transaction logs:', err);
    } finally {
      setIsTransactionsLoading(false);
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleTopup = async (amount: number) => {
    if (isTopupLoading !== null) return;
    setIsTopupLoading(amount);

    try {
      const orderRes = await fetch('/api/payment/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!orderRes.ok) {
        const orderErr = await orderRes.json().catch(() => ({}));
        throw new Error(orderErr.error || 'Failed to create order');
      }

      const orderData = await orderRes.json();
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setSuccessModal({
          isOpen: true,
          title: 'Connection Error',
          message: 'Failed to load Razorpay SDK script. Please check your network connection.',
          isError: true
        });
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: 'INR',
        name: 'HasaFlow AI',
        description: `Wallet Topup - ₹${amount}`,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                amount,
                isMock: orderData.isMock
              }),
            });

            if (verifyRes.ok) {
              const resJson = await verifyRes.json();
              if (profile) {
                setProfile({ ...profile, credits: resJson.credits });
              }
              // Notify Navbar to refresh the credit badge
              window.dispatchEvent(new CustomEvent('credits-updated'));
              fetchTransactions();
              setSuccessModal({
                isOpen: true,
                title: 'Payment Successful',
                message: `Wallet successfully credited with ₹${amount.toFixed(2)}!`,
                isError: false
              });
            } else {
              const verifyErr = await verifyRes.json().catch(() => ({}));
              throw new Error(verifyErr.error || 'Payment signature verification failed');
            }
          } catch (err: any) {
            setSuccessModal({
              isOpen: true,
              title: 'Verification Failed',
              message: `Payment verification failed: ${err.message}`,
              isError: true
            });
          }
        },
        prefill: {
          name: profile?.name || '',
          email: profile?.email || '',
        },
        theme: {
          color: '#111827',
        },
      };

      // @ts-ignore
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      setSuccessModal({
        isOpen: true,
        title: 'Checkout Error',
        message: `Payment checkout error: ${err.message}`,
        isError: true
      });
    } finally {
      setIsTopupLoading(null);
    }
  };

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchProfile();
      fetchTransactions();
      
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('hasaflow_user_onboarding');
        if (saved) {
          try {
            setOnboarding(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse onboarding choices:', e);
          }
        }
      }
    }
  }, [authStatus]);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const updated = await res.json();
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      setSaveSuccess(true);

      await updateSession({ name: updated.name });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetakeOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hasaflow_user_onboarding');
    }
    router.push('/onboarding');
  };

  const hasChanged = profile && editName.trim() !== (profile.name || '');
  const memberSince = profile
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  if (authStatus === 'loading' || isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </main>
      </>
    );
  }

  const matchedRole = onboarding?.role ? ROLE_MAP[onboarding.role] : null;
  const matchedScale = onboarding?.scale ? SCALE_MAP[onboarding.scale] : 'Starter';

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-56px)] bg-gray-50/40 pb-20">
        
        {/* Main Content Area */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          
          {/* Header & Back Action */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl text-gray-900 tracking-tight font-normal">Account Profile</h2>
              <p className="text-xs text-gray-500 font-normal">Manage your developer profile, platform roles, and settings.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs text-gray-600 hover:text-gray-900 transition-colors cursor-pointer font-normal"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </button>
          </div>

          {/* Profile Card Banner */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.2]" style={{
              backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }} />
            
            {/* Colored overlay */}
            <div className="h-28 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 relative border-b border-gray-100" />

            <div className="p-6 sm:p-8 pt-0 relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 -mt-10">
                {/* Avatar with Camera Icon Overlay on Hover */}
                <div className="relative shrink-0 group">
                  {profile?.image && !imageError ? (
                    <img
                      src={profile.image}
                      alt={profile.name || 'User'}
                      onError={() => setImageError(true)}
                      className="h-20 w-20 rounded-2xl border-4 border-white shadow-md object-cover bg-gray-50"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl border-4 border-white shadow-md bg-gray-950 flex items-center justify-center">
                      <span className="text-2xl text-white font-normal">
                        {(profile?.name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer">
                    <Camera className="h-4 w-4 text-white drop-shadow-xs" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:pt-4">
                  <h3 className="text-lg font-normal text-gray-900 leading-tight">
                    {profile?.name || 'Unnamed User'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 font-normal">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-gray-400" /> {profile?.email}</span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-gray-400" /> Member since {memberSince}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="sm:self-end sm:pb-1 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-700 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Developer
                </span>
              </div>
            </div>
          </div>

          {/* Redesigned 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: Profile Settings Form (Takes 2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Account Details Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Settings className="h-4.5 w-4.5 text-gray-400" />
                  <h3 className="text-sm font-normal text-gray-900">Profile Details</h3>
                </div>

                <div className="space-y-5">
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="profile-name" className="block text-xs font-normal text-gray-500">
                      Display Name
                    </label>
                    <Input
                      id="profile-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>

                  {/* Email Input (disabled) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-normal text-gray-500">
                      Primary Email
                    </label>
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gray-50/50 border border-gray-200/70 rounded-lg text-sm text-gray-500 font-normal">
                      <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="truncate">{profile?.email}</span>
                      <span className="ml-auto text-[9px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Google
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 font-normal">
                      {error}
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanged || isSaving}
                      icon={
                        isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saveSuccess ? (
                          <Check className="h-4 w-4 animate-pulse" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )
                      }
                    >
                      {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                    </Button>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-600 font-normal animate-pulse">
                        Profile updated successfully.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistics/Metrics Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Activity className="h-4.5 w-4.5 text-gray-400" />
                  <h3 className="text-sm font-normal text-gray-900">Platform Activity</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-200/40 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Created Projects</span>
                    <span className="text-lg font-normal text-gray-900 flex items-center gap-1.5">
                      <FolderGit2 className="h-4 w-4 text-blue-500" />
                      {profile?._count?.projects ?? 0}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-200/40 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Active Role</span>
                    <span className="text-sm font-normal text-gray-900 truncate block">
                      {matchedRole?.title || 'General User'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing & Wallet Dashboard */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4.5 w-4.5 text-gray-400" />
                    <h3 className="text-sm font-normal text-gray-900">Billing & Credit Wallet</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] text-blue-700 font-normal uppercase tracking-wider">
                    Pay-As-You-Go
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Wallet Balance Widget */}
                  <div className="md:col-span-1 p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200/60 flex flex-col justify-between h-36">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Available Balance</span>
                      <span className="text-2xl font-normal text-gray-900">
                        ₹{(profile?.credits ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-400 leading-normal font-normal">
                      Funds are consumed dynamically as pipeline runs call audio, translation, and speech APIs.
                    </p>
                  </div>

                  {/* Top Up Fast Actions Card */}
                  <div className="md:col-span-2 p-5 rounded-2xl bg-white border border-gray-200/60 flex flex-col justify-between h-36">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Top Up Wallet</span>
                      <p className="text-[10px] text-gray-500 font-normal">Select an amount to instantly credit your account using Razorpay.</p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[50, 200, 500, 1000].map((amt) => {
                        const loading = isTopupLoading === amt;
                        return (
                          <button
                            key={amt}
                            onClick={() => handleTopup(amt)}
                            disabled={isTopupLoading !== null}
                            className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl border border-gray-200 hover:border-gray-900 bg-white text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50/50 transition-all font-normal disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                          >
                            {loading ? (
                              <Loader2 className="h-3 w-3 animate-spin text-gray-900" />
                            ) : (
                              `+ ₹${amt}`
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Credit Transaction History logs */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-normal text-gray-500 uppercase tracking-wider">Recent Wallet Activity</h4>
                  {isTransactionsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 italic py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading transactions...
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No transaction logs recorded yet.</p>
                  ) : (
                    <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/30">
                      <div className="max-h-48 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-xs">
                          <tbody className="bg-transparent divide-y divide-gray-100">
                            {transactions.map((tx: any) => {
                              const isDeduction = tx.amount < 0;
                              return (
                                <tr key={tx.id}>
                                  <td className="px-4 py-2 text-gray-500 font-normal whitespace-nowrap">
                                    {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="px-4 py-2 text-gray-800 font-normal">
                                    {tx.description}
                                  </td>
                                  <td className={`px-4 py-2 font-normal text-right whitespace-nowrap ${isDeduction ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {isDeduction ? '-' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT: Onboarding Preferences & Settings (Takes 1 column) */}
            <div className="space-y-6">
              
              {/* Setup Wizard choices card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Sparkles className="h-4.5 w-4.5 text-gray-400" />
                  <h3 className="text-sm font-normal text-gray-900">Onboarding Selections</h3>
                </div>

                {onboarding ? (
                  <div className="space-y-5">
                    {/* Role Display */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Assigned Role</span>
                      <div className="flex items-center gap-2 text-xs text-gray-700 font-normal">
                        <div className="p-1 rounded-md bg-purple-50 text-purple-600">
                          {matchedRole?.icon || <UserIcon className="h-3.5 w-3.5" />}
                        </div>
                        <span>{matchedRole?.title || onboarding.role}</span>
                      </div>
                    </div>

                    {/* Scale Display */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Target Scale</span>
                      <div className="text-xs text-gray-700 font-normal">
                        {matchedScale}
                      </div>
                    </div>

                    {/* Languages Display */}
                    {onboarding.languages && onboarding.languages.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Indic Languages</span>
                        <div className="flex flex-wrap gap-1.5">
                          {onboarding.languages.map((l) => {
                            const details = LANG_MAP[l] || { name: l, script: '' };
                            return (
                              <span key={l} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-normal">
                                <Globe2 className="h-2.5 w-2.5 text-blue-500" />
                                {details.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Use cases Display */}
                    {onboarding.useCases && onboarding.useCases.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Core Use Cases</span>
                        <div className="flex flex-wrap gap-1.5">
                          {onboarding.useCases.map((u) => {
                            const details = USE_CASE_MAP[u] || { title: u, icon: null };
                            return (
                              <span key={u} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-normal">
                                {details.icon}
                                {details.title}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 italic">No onboarding preferences recorded.</p>
                  </div>
                )}

                {/* Retake Setup wizard button */}
                <div className="pt-2">
                  <button
                    onClick={handleRetakeOnboarding}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs text-gray-600 hover:text-gray-900 transition-all font-normal cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retake Setup Wizard
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {successModal && successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-sm w-full p-6 shadow-xl relative overflow-hidden animate-scaleUp">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600" />
            
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              {/* Brand Logo/Header */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-semibold text-xs select-none">
                hasaflow
              </div>

              {/* Status Icon */}
              <div className={`p-3 rounded-full ${successModal.isError ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                {successModal.isError ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
                )}
              </div>

              {/* Text */}
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  {successModal.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed px-2">
                  {successModal.message}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSuccessModal(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-950 hover:bg-gray-800 text-white text-xs font-semibold tracking-wide shadow-xs transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
