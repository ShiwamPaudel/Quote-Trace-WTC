'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { User, LogOut, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar_url, role')
        .eq('id', sessionData.session.user.id)
        .single();
        
      if (data) {
        setProfile(data);
      }
    };
    
    // Only fetch if not on login
    if (pathname !== '/login') {
      fetchProfile();
    }
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href={profile?.role === 'admin' ? '/admin-dashboard' : '/dashboard'} className="flex items-center gap-2">
          <img src="/assets/quote-trace-logo.png" alt="Quote Trace" className="h-9 w-auto object-contain" />
        </Link>
        
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 hover:bg-slate-50 transition-colors"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <User size={16} />
              </div>
            )}
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {profile?.name || 'User Profile'}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Account
                </div>
                <Link 
                  href="/profile" 
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User size={16} />
                  View Profile
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
