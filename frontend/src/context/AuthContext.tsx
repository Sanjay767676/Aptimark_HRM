import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  role: 'admin' | 'hr' | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractRole(user: User | null): 'admin' | 'hr' | null {
  if (!user) return null;
  // Hardcode admin role for the known admin email
  if (user.email?.toLowerCase().trim() === 'admin@aptimarksolution.in' || user.email?.toLowerCase().trim() === 'admin@aptimarksolutions.in') return 'admin';
  
  // Supabase dashboard sets role in app_metadata; signUp sets it in user_metadata
  const role =
    user.app_metadata?.role ??
    user.user_metadata?.role ??
    null;
  if (role === 'admin' || role === 'hr') return role;
  // Default to hr if no specific role is found to prevent routing null errors
  return 'hr';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'hr' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setRole(extractRole(session?.user ?? null));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setRole(extractRole(session?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
