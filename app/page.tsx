'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const sessionResult = await supabase.auth.getSession();
      const data = sessionResult.data;
      if (data?.session) {
        // Fetch user role
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile?.role === 'admin') {
            router.replace('/admin-dashboard');
          } else {
            router.replace('/dashboard');
          }
        }
      } else {
        router.replace('/login');
      }
    }
    checkSession();
  }, [router]);

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="rounded-3xl bg-white px-10 py-14 shadow-soft text-center">
        <p className="text-slate-600">Loading your workspace...</p>
      </div>
    </main>
  );
}
