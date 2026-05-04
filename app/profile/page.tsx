'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  
  const [profile, setProfile] = useState({
    name: '',
    designation: '',
    avatar_url: '',
    email: ''
  });
  
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        router.replace('/login');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('name, designation, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setProfile({
          name: data.name || '',
          designation: data.designation || '',
          avatar_url: data.avatar_url || '',
          email: session.user.email || ''
        });
      }
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) throw new Error('Not authenticated');

      let avatarUrl = profile.avatar_url;

      // Upload new avatar if selected
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrlData.publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          designation: profile.designation,
          avatar_url: avatarUrl,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      setMessageType('success');
      setMessage('Profile updated successfully!');
      setFile(null);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessageType('error');
      setMessage(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-cream px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-[40px] bg-white p-10 text-center shadow-soft">
          <p className="text-slate-700">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Your Profile</h1>
          <p className="mt-2 text-slate-600">Update your personal details and public profile.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md">
                {file ? (
                  <img src={URL.createObjectURL(file)} alt="Preview" className="h-full w-full object-cover" />
                ) : profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <User size={40} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <h3 className="font-medium text-slate-900">Profile Picture</h3>
                <p className="text-sm text-slate-500">Upload a new avatar (JPG, PNG, max 2MB).</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <Input
                label="Email"
                type="email"
                value={profile.email}
                disabled
                className="bg-slate-50 opacity-70"
              />
              <Input
                label="Full Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="John Doe"
              />
              <Input
                label="Designation"
                value={profile.designation}
                onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                placeholder="Sales Manager"
              />
            </div>

            {message && (
              <div className={`rounded-xl p-4 text-sm ${messageType === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {message}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
