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
        name: 'Pravah AI',
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
        const saved = localStorage.getItem('pravah_user_onboarding');
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
      localStorage.removeItem('pravah_user_onboarding');
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
      <main className="min-h-[calc(100vh-56px)] bg-[#fafafa] pb-24 relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-55 pointer-events-none" />
        
        {/* Main Content Area */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 relative z-10">
          
          {/* Header & Back Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Profile</h1>
              <p className="text-xs text-slate-500 font-normal">Manage your developer profile, platform roles, and settings.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/50 text-xs text-slate-600 hover:text-slate-950 transition-all duration-200 shadow-2xs cursor-pointer font-medium whitespace-nowrap self-start sm:self-auto"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-slate-600" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {/* Profile Card Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden relative group">
            {/* Decorative neutral overlay header */}
            <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-950 relative overflow-hidden" />

            <div className="p-6 sm:p-8 pt-0 relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 -mt-12">
                {/* Avatar */}
                <div className="relative shrink-0 group/avatar">
                  {profile?.image && !imageError ? (
                    <img
                      src={profile.image}
                      alt={profile.name || 'User'}
                      onError={() => setImageError(true)}
                      className="h-24 w-24 rounded-2xl border-4 border-white shadow-md object-cover bg-slate-50 relative z-10 transition-all duration-300 group-hover/avatar:scale-102"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl border-4 border-white shadow-md bg-slate-900 flex items-center justify-center relative z-10 transition-all duration-300 group-hover/avatar:scale-102">
                      <span className="text-3xl text-white font-semibold">
                        {(profile?.name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/0 hover:bg-black/25 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer z-20">
                    <Camera className="h-5 w-5 text-white drop-shadow-md" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:pt-12">
                  <h3 className="text-xl font-semibold text-slate-900 leading-tight">
                    {profile?.name || 'Unnamed User'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 font-normal">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> {profile?.email}</span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Member since {memberSince}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="md:self-end md:pb-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-250 text-[10px] text-slate-700 font-medium shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                  Verified Developer
                </span>
              </div>
            </div>
          </div>

          {/* Responsive Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: Profile Details & Wallet Billing (Takes 2 columns) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Account Details Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-650">
                    <Settings className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-850">Profile Details</h3>
                </div>

                <div className="space-y-5">
                  {/* Display Name Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="profile-name" className="block text-xs font-medium text-slate-550">
                      Display Name
                    </label>
                    <Input
                      id="profile-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter your display name"
                      className="focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>

                  {/* Email Input (disabled) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-550">
                      Primary Email Address
                    </label>
                    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200/55 rounded-lg text-sm text-slate-500 font-medium">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{profile?.email}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        <Check className="h-2.5 w-2.5" /> Verified
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="text-xs text-rose-500 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2.5 font-normal">
                      {error}
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <Button
                      onClick={handleSave}
                      disabled={!hasChanged || isSaving}
                      className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:shadow transition-all duration-200 active:scale-[0.99]"
                      icon={
                        isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saveSuccess ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )
                      }
                    >
                      {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                    </Button>
                    {saveSuccess && (
                      <span className="text-xs text-slate-600 font-semibold animate-pulse">
                        Profile updated successfully.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing & Wallet Dashboard (Directly below Profile Details) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-850">Billing & Credit Wallet</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[9px] text-slate-700 font-semibold uppercase tracking-wider">
                    Pay-As-You-Go
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Wallet Balance Widget */}
                  <div className="md:col-span-1 p-5 rounded-2xl bg-slate-900 text-white flex flex-col justify-between h-36 relative overflow-hidden shadow-xs">
                    <div className="space-y-1 relative z-10">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Available Balance</span>
                      <span className="text-3xl font-bold tracking-tight text-white">
                        ₹{(profile?.credits ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-450 leading-normal font-normal relative z-10">
                      Funds are consumed dynamically as pipeline runs execute audio, translation, and speech nodes.
                    </p>
                  </div>

                  {/* Top Up Fast Actions Card */}
                  <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60 flex flex-col justify-between h-36">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Top Up Wallet</span>
                      <p className="text-[10px] text-slate-500 font-normal">Select an amount to credit your developer wallet.</p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[50, 200, 500, 1000].map((amt) => {
                        const loading = isTopupLoading === amt;
                        return (
                          <button
                            key={amt}
                            onClick={() => handleTopup(amt)}
                            disabled={isTopupLoading !== null}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border border-slate-200 hover:border-slate-800 bg-white hover:bg-slate-50 hover:shadow-2xs text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap active:scale-[0.97]"
                          >
                            {loading ? (
                              <Loader2 className="h-3 w-3 animate-spin text-slate-900" />
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
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Wallet Activity</h4>
                  {isTransactionsLoading ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 italic py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      <span>Loading transactions...</span>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1 py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                      <p className="text-xs text-slate-400 italic">No transaction logs recorded yet.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200/50 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="max-h-56 overflow-y-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-xs">
                          <thead className="bg-slate-50/50 sticky top-0 backdrop-blur-md z-10 border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                              <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-transparent divide-y divide-slate-100">
                            {transactions.map((tx: any) => {
                              const isDeduction = tx.amount < 0;
                              return (
                                <tr key={tx.id} className="hover:bg-slate-50/35 transition-colors">
                                  <td className="px-4 py-2.5 text-slate-500 font-medium whitespace-nowrap">
                                    {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-700 font-medium">
                                    {tx.description}
                                  </td>
                                  <td className={`px-4 py-2.5 font-semibold text-right whitespace-nowrap ${isDeduction ? 'text-rose-600' : 'text-emerald-600'}`}>
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

            {/* RIGHT COLUMN: Platform Activity & Onboarding Selections (Takes 1 column) */}
            <div className="space-y-8">
              
              {/* Statistics/Metrics Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-655">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Platform Activity</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/40 flex items-center gap-4 transition-all duration-200 hover:bg-slate-100/50">
                    <div className="p-2.5 rounded-lg bg-slate-200 text-slate-700 shrink-0">
                      <FolderGit2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Created Projects</span>
                      <span className="text-lg font-bold text-slate-900 leading-none">
                        {profile?._count?.projects ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/40 flex items-center gap-4 transition-all duration-200 hover:bg-slate-100/50">
                    <div className="p-2.5 rounded-lg bg-slate-200 text-slate-700 shrink-0">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Active Role</span>
                      <span className="text-sm font-semibold text-slate-900 truncate block leading-tight">
                        {matchedRole?.title || 'General Developer'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Setup Wizard choices card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-655">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Onboarding Selections</h3>
                </div>

                {onboarding ? (
                  <div className="space-y-6">
                    {/* Role Display */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Assigned Role</span>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/50">
                          {matchedRole?.icon || <UserIcon className="h-4 w-4" />}
                        </div>
                        <span>{matchedRole?.title || onboarding.role}</span>
                      </div>
                    </div>

                    {/* Scale Display */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Target Scale</span>
                      <div className="text-xs text-slate-700 font-medium pl-0.5">
                        {matchedScale}
                      </div>
                    </div>

                    {/* Languages Display */}
                    {onboarding.languages && onboarding.languages.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Indic Languages</span>
                        <div className="flex flex-wrap gap-1.5">
                          {onboarding.languages.map((l) => {
                            const details = LANG_MAP[l] || { name: l, script: '' };
                            return (
                              <span key={l} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-semibold transition-all hover:bg-slate-100/50">
                                <Globe2 className="h-3 w-3 text-slate-500" />
                                {details.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Use cases Display */}
                    {onboarding.useCases && onboarding.useCases.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Core Use Cases</span>
                        <div className="flex flex-wrap gap-1.5">
                          {onboarding.useCases.map((u) => {
                            const details = USE_CASE_MAP[u] || { title: u, icon: null };
                            return (
                              <span key={u} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-semibold transition-all hover:bg-slate-100/50">
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
                  <div className="space-y-2 py-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                    <p className="text-xs text-slate-400 italic">No onboarding preferences recorded.</p>
                  </div>
                )}

                {/* Retake Setup wizard button */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleRetakeOnboarding}
                    className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-250 hover:border-slate-350 hover:bg-slate-50/50 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all duration-200 cursor-pointer animate-once"
                  >
                    <RefreshCw className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-500" />
                    Retake Setup Wizard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {successModal && successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-sm w-full p-6 shadow-xl relative overflow-hidden animate-slide-up">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-purple-600" />
            
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              {/* Brand Logo/Header */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-semibold text-xs select-none">
                pravah
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
                <h3 className="text-base font-bold text-slate-900">
                  {successModal.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed px-2">
                  {successModal.message}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSuccessModal(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide shadow-xs transition-colors cursor-pointer"
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
