import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const supabaseConfigError = {
  name: 'SupabaseConfigurationError',
  message: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your production environment, then redeploy.',
};

const createMissingQuery = () => {
  const query: any = {
    select: () => query,
    insert: () => query,
    update: () => query,
    delete: () => query,
    eq: () => query,
    order: () => query,
    single: async () => ({ data: null, error: supabaseConfigError }),
    maybeSingle: async () => ({ data: null, error: supabaseConfigError }),
    then: (resolve: any, reject: any) =>
      Promise.resolve({ data: [], error: supabaseConfigError }).then(resolve, reject),
    catch: (reject: any) => Promise.resolve({ data: [], error: supabaseConfigError }).catch(reject),
    finally: (callback: any) => Promise.resolve({ data: [], error: supabaseConfigError }).finally(callback),
  };

  return query;
};

const missingSupabaseClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: supabaseConfigError }),
    getUser: async () => ({ data: { user: null }, error: supabaseConfigError }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: supabaseConfigError }),
    signOut: async () => ({ error: null }),
  },
  from: () => createMissingQuery(),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: supabaseConfigError }),
      remove: async () => ({ data: null, error: supabaseConfigError }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
};

if (!hasSupabaseConfig) {
  console.warn('Supabase environment variables are not set. App requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (missingSupabaseClient as any);

export const STORAGE_BUCKET = 'quotations';
