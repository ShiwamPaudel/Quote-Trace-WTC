'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkSession() {
      const sessionResult = await supabase.auth.getSession();
      const data = sessionResult.data;
      if (data?.session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profileError) {
            await supabase.auth.signOut();
            setError('Profile not found. Please log in again.');
            return;
          }
          if (profile?.role === 'admin') {
            router.replace('/admin-dashboard');
          } else {
            router.replace('/dashboard');
          }
        }
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message ?? 'Invalid login credentials.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Profile not found. Please contact admin.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (profile?.role === 'admin') {
        router.push('/admin-dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError('Failed to retrieve user information.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-cream px-6 py-10 sm:px-12">
      <div className="mx-auto max-w-xl space-y-8 rounded-[40px] bg-white px-10 py-12 shadow-soft">
        <div className="space-y-3 text-center">
          <img src="/assets/quote-trace-logo.png" alt="Quote Trace" className="mx-auto h-12 w-auto object-contain" />
          <h1 className="text-3xl font-semibold text-slate-900">TRACK YOUR QUOTATIONS</h1>
          <p className="text-slate-600">Exclusively made for Web Trading Concern Pvt. Ltd.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  );
}
