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
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  Plus,
  Key,
  Terminal,
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
  const [customAmount, setCustomAmount] = useState('');
  const [customAmountError, setCustomAmountError] = useState('');
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

    if (!amount || isNaN(amount) || amount < 25 || amount > 10000) {
      setSuccessModal({
        isOpen: true,
        title: 'Invalid Amount',
        message: 'Top-up amount must be between ₹25 and ₹10,000.',
        isError: true,
      });
      return;
    }

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
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Main Content Area — Expansive Container Width */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 relative z-10">

          {/* Header & Back Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Account Profile</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal">Manage your developer profile, platform roles, and settings.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-all duration-200 shadow-2xs cursor-pointer whitespace-nowrap self-start sm:self-auto active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-slate-700" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {/* Profile Card Hero Banner — Expanded Section Container */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden relative group">
            {/* Rich Gradient Header Banner */}
            <div className="h-44 sm:h-52 md:h-60 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
              {/* Decorative ambient lights */}
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            </div>

            <div className="p-6 sm:p-8 md:p-9 pt-0 relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 -mt-14 sm:-mt-16">
                {/* Avatar */}
                <div className="relative shrink-0 group/avatar">
                  {profile?.image && !imageError ? (
                    <img
                      src={profile.image}
                      alt={profile.name || 'User'}
                      onError={() => setImageError(true)}
                      className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl border-4 border-white shadow-lg object-cover bg-slate-50 relative z-10 transition-all duration-300 group-hover/avatar:scale-102"
                    />
                  ) : (
                    <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl border-4 border-white shadow-lg bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 flex items-center justify-center relative z-10 transition-all duration-300 group-hover/avatar:scale-102">
                      <span className="text-4xl sm:text-5xl text-white font-bold tracking-tight">
                        {(profile?.name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-3xl bg-black/0 hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer z-20">
                    <Camera className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:pt-14">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      {profile?.name || 'Unnamed User'}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3.5 text-xs text-slate-500 font-normal">
                    <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" /> {profile?.email}</span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" /> Member since {memberSince}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="md:self-end md:pb-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Developer
                </span>
              </div>
            </div>
          </div>

          {/* Responsive Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* LEFT COLUMN: Profile Details & Wallet Billing (Takes 2 columns) */}
            <div className="lg:col-span-2 space-y-8">

              {/* Account Details Card — Spacious Container */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-9 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <Settings className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Profile Details</h3>
                </div>

                <div className="space-y-5">
                  {/* Display Name Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="profile-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Display Name
                    </label>
                    <Input
                      id="profile-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter your display name"
                      className="py-2.5 px-3.5 text-sm font-medium focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>

                  {/* Email Input (disabled) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Primary Email Address
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200/70 rounded-xl text-sm text-slate-600 font-medium">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{profile?.email}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        <Check className="h-3 w-3" /> Verified
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
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-6 text-xs shadow-xs hover:shadow transition-all duration-200 active:scale-95 cursor-pointer"
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

              {/* Billing & Wallet Dashboard Card — Spacious Container */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-9 space-y-6 shadow-2xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-900 text-white shadow-2xs">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Billing & Credit Wallet</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-[10px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Auto-Settlement Active
                    </span>
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-semibold uppercase tracking-wider">
                      Pay-As-You-Go
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Available Balance Card */}
                  <div className="lg:col-span-5 xl:col-span-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white border border-slate-800/90 shadow-md flex flex-col justify-between relative overflow-hidden group">
                    {/* Background subtle radial glow */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between gap-2 relative z-10">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Available Balance
                      </span>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-[9px] text-slate-300 font-medium flex items-center gap-1 whitespace-nowrap">
                        <Zap className="h-2.5 w-2.5 text-amber-400" />
                        ₹1 = 1 Credit
                      </span>
                    </div>

                    <div className="my-3 sm:my-4 relative z-10 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums break-all">
                          ₹{(profile?.credits ?? 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Credits</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400/90 leading-relaxed relative z-10 border-t border-slate-800/80 pt-3">
                      Micro-metered dynamically per character & audio chunk during pipeline executions.
                    </p>
                  </div>

                  {/* Top Up Fast Actions & Custom Amount Card */}
                  <div className="lg:col-span-7 xl:col-span-8 p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-3.5">
                    <div className="flex items-start sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-850 block">Top Up Credits</span>
                        <p className="text-[11px] text-slate-500 font-normal truncate">Instant refill via UPI, Cards, NetBanking</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs whitespace-nowrap">
                        Min: ₹25 • Max: ₹10,000
                      </span>
                    </div>

                    {/* Quick Amount Selection Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[25, 100, 500, 1000].map((amt) => {
                        const isSelected = Number(customAmount) === amt;
                        const loading = isTopupLoading === amt;
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setCustomAmount(String(amt));
                              setCustomAmountError('');
                            }}
                            disabled={isTopupLoading !== null}
                            className={`relative group flex items-center justify-center py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 whitespace-nowrap ${isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white hover:bg-slate-100/90 text-slate-750 hover:text-slate-950 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                              }`}
                          >
                            {amt === 500 && (
                              <span className="absolute -top-1.5 right-1.5 px-1 rounded-full bg-emerald-500 text-[8px] font-bold text-white tracking-wider uppercase leading-tight shadow-2xs">
                                Popular
                              </span>
                            )}
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `+ ₹${amt}`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Amount Form with Primary CTA */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const num = Number(customAmount);
                        if (!num || isNaN(num) || num < 25 || num > 10000) {
                          setCustomAmountError('Amount must be between ₹25 and ₹10,000');
                          return;
                        }
                        setCustomAmountError('');
                        handleTopup(num);
                      }}
                      className="pt-1"
                    >
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            min={25}
                            max={10000}
                            step="any"
                            placeholder="Enter amount (e.g. 250)"
                            value={customAmount}
                            onChange={(e) => {
                              setCustomAmount(e.target.value);
                              if (customAmountError) setCustomAmountError('');
                            }}
                            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-850 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-2xs"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isTopupLoading !== null || !customAmount}
                          className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          {isTopupLoading !== null ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Credits</span>
                            </>
                          )}
                        </button>
                      </div>
                      {customAmountError && (
                        <p className="text-[10px] text-red-500 font-medium pl-1 mt-1">{customAmountError}</p>
                      )}
                    </form>
                  </div>
                </div>

                {/* Credit Transaction History logs */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Wallet Activity</h4>
                    <span className="text-[10px] text-slate-400 font-medium">Immutable Ledger</span>
                  </div>

                  {isTransactionsLoading ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 italic py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      <span>Loading transactions...</span>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                      <Wallet className="h-5 w-5 text-slate-300" />
                      <p className="text-xs text-slate-400 italic">No transaction records logged yet.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {transactions.map((tx: any) => {
                          const isDeduction = tx.amount < 0;
                          const isSignup = tx.type === 'signup_bonus';
                          const isWebhook = String(tx.description || '').includes('Webhook');
                          const isRazorpay = String(tx.description || '').includes('Razorpay');

                          let title = 'Wallet Top-Up';
                          let tag = 'Checkout';
                          let tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
                          let subText = tx.description;

                          if (isSignup) {
                            title = 'Welcome Credit Grant';
                            tag = 'Bonus';
                            tagColor = 'bg-purple-50 text-purple-700 border-purple-200/60';
                            subText = 'Account creation grant';
                          } else if (isWebhook) {
                            title = 'Wallet Top-Up';
                            tag = 'Webhook';
                            tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
                            const match = tx.description.match(/Ref:\s*([^\)]+)/);
                            subText = match ? `Razorpay Webhook • Ref: ${match[1]}` : 'Instant Webhook Settlement';
                          } else if (isRazorpay) {
                            title = 'Wallet Top-Up';
                            tag = 'Gateway';
                            tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
                            const match = tx.description.match(/Ref:\s*([^\)]+)/);
                            subText = match ? `Razorpay Modal • Ref: ${match[1]}` : 'Instant Gateway Top-up';
                          } else if (isDeduction) {
                            title = 'Pipeline Execution';
                            tag = 'Compute';
                            tagColor = 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
                            const match = tx.description.match(/Run ID:\s*([^\)]+)/);
                            subText = match ? `AI Node Execution • Run: ${match[1]}` : 'AI Compute Metering';
                          }

                          return (
                            <div
                              key={tx.id}
                              className="p-3 sm:px-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${isDeduction
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                    : isSignup
                                      ? 'bg-purple-50 text-purple-600 border-purple-100'
                                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    }`}
                                >
                                  {isDeduction ? (
                                    <Zap className="h-4 w-4" />
                                  ) : isSignup ? (
                                    <Sparkles className="h-4 w-4" />
                                  ) : (
                                    <ArrowDownLeft className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-850 truncate">{title}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${tagColor}`}>
                                      {tag}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                                    {subText}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right pl-3 shrink-0 flex flex-col items-end">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${isDeduction
                                    ? 'text-slate-700 bg-slate-100 border border-slate-200/60'
                                    : 'text-emerald-700 bg-emerald-50/90 border border-emerald-200/70'
                                    }`}
                                >
                                  {isDeduction ? '-' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
                                  {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Developer & API Keys Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-9 space-y-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <Key className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">API Keys & External Access</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase">
                    REST API
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-1.5 text-white">
                      <Terminal className="h-4 w-4 text-blue-400" />
                      <span>Developer & API Dashboard</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      Generate secret API keys with custom expiry, inspect real-time request logs, and trigger your Indic AI pipelines from Python, cURL, or external servers.
                    </p>
                  </div>

                  <a
                    href="/dashboard/api"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all whitespace-nowrap cursor-pointer shrink-0"
                  >
                    <span>Manage API Keys</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Platform Activity & Onboarding Selections (Takes 1 column) */}
            <div className="space-y-8">

              {/* Statistics/Metrics Card — Spacious Container */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-9 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Platform Activity</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/50 flex items-center gap-4 transition-all duration-200 hover:bg-slate-100/50">
                    <div className="p-2.5 rounded-xl bg-slate-200 text-slate-700 shrink-0">
                      <FolderGit2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Created Projects</span>
                      <span className="text-lg font-bold text-slate-900 leading-none">
                        {profile?._count?.projects ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/50 flex items-center gap-4 transition-all duration-200 hover:bg-slate-100/50">
                    <div className="p-2.5 rounded-xl bg-slate-200 text-slate-700 shrink-0">
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

              {/* Setup Wizard choices card — Spacious Container */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-9 space-y-6 shadow-2xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Onboarding Selections</h3>
                </div>

                {onboarding ? (
                  <div className="space-y-5">
                    {/* Role Display */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Assigned Role</span>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/50">
                          {matchedRole?.icon || <UserIcon className="h-4 w-4" />}
                        </div>
                        <span>{matchedRole?.title || onboarding.role}</span>
                      </div>
                    </div>

                    {/* Scale Display */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Target Scale</span>
                      <div className="text-xs text-slate-700 font-medium pl-0.5">
                        {matchedScale}
                      </div>
                    </div>

                    {/* Languages Display */}
                    {onboarding.languages && onboarding.languages.length > 0 && (
                      <div className="space-y-2">
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
                      <div className="space-y-2">
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
                  <div className="space-y-2 py-5 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                    <p className="text-xs text-slate-400 italic">No onboarding preferences recorded.</p>
                  </div>
                )}

                {/* Retake Setup wizard button */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleRetakeOnboarding}
                    className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-500 text-slate-500" />
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
