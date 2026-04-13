'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter your email and password.');
      setIsLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message === 'Invalid login credentials' 
        ? 'Invalid email or password. Please try again.' 
        : authError.message
      );
      setIsLoading(false);
      return;
    }

    // Success! Redirect via proxy to determine role-based landing route
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] p-6 font-sans">
      <div
        className="w-full max-w-[440px] bg-white rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.03)] p-12 flex flex-col items-center animate-fade-in"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <img src="/images/logo_full.png" alt="Jigyasu" className="h-[52px] w-auto mb-4" />
          <p className="text-[12px] font-bold text-[#1a1a2e]/40 tracking-[0.25em] uppercase">
            Jigyasu ERP
          </p>
        </div>

        {/* Welcome Text */}
        <h2 className="text-[26px] font-bold text-[#1a1a2e] mb-1.5">Welcome Back</h2>
        <p className="text-[14px] text-gray-400 mb-10 text-center">
          Please enter your credentials to access your account
        </p>

        {/* Error Message */}
        {error && (
          <div className="w-full p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[14px] font-bold text-[#1a1a2e]">Email Address</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-12 pr-4 py-3.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl outline-none focus:border-[#c45c5c] focus:bg-white transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[14px] font-bold text-[#1a1a2e]">Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl outline-none focus:border-[#c45c5c] focus:bg-white transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          <div className="flex justify-end !mt-4">
             <a href="#" className="text-[13px] font-bold text-[#c45c5c] hover:underline">
               Forgot Password?
             </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 bg-[#c45c5c] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#a34a4a] transition-all shadow-lg shadow-[#c45c5c]/20
              ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        {/* Terms */}
        <div className="mt-12 text-center">
            <p className="text-[11px] font-bold text-gray-400 leading-relaxed tracking-wider uppercase">
               By signing in, you agree to our<br />
               <Link href="#" className="text-[#c45c5c]">Terms of Service</Link> & <Link href="#" className="text-[#c45c5c]">Privacy Policy</Link>
            </p>
        </div>
      </div>
    </div>
  );
}
