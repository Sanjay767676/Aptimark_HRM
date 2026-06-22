import { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'framer-motion';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        let role =
          data.user.app_metadata?.role ??
          data.user.user_metadata?.role;

        const normalizedEmail = data.user.email?.toLowerCase().trim();
        if (normalizedEmail === 'admin@aptimarksolution.in' || normalizedEmail === 'admin@aptimarksolutions.in') {
          role = 'admin';
        }

        setLocation(role === 'admin' ? '/admin/dashboard' : '/hr/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground lg:block">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white">
              <img src="/aptimark-logo.png" alt="Aptimark" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <div className="font-serif text-2xl font-bold leading-none">Aptimark Solutions</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
                HR operations registry
              </div>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-5 inline-flex border-y border-sidebar-foreground/20 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-sidebar-primary">
              AMS / HR / INT
            </div>
            <h1 className="font-serif text-5xl font-bold leading-tight">
              Documents, interns, payments, and proof in one controlled desk.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-sidebar-foreground/68">
              Manage intern records with the same care as an issued offer letter: traceable, tidy, and ready for review.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-sidebar-foreground/62">
            <div className="border-t border-sidebar-foreground/20 pt-3">
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">01</span>
              Records
            </div>
            <div className="border-t border-sidebar-foreground/20 pt-3">
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">02</span>
              Letters
            </div>
            <div className="border-t border-sidebar-foreground/20 pt-3">
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">03</span>
              Certificates
            </div>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center p-5 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card className="border-border/90 shadow-xl">
            <CardHeader className="space-y-3 pb-6 text-left">
              <motion.div
                className="mb-2 flex items-center gap-3"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-white">
                  <img src="/aptimark-logo.png" alt="Aptimark" className="h-9 w-9 object-contain" />
                </div>
                <div>
                  <div className="page-kicker">Secure access</div>
                  <div className="text-sm text-muted-foreground">Aptimark HR platform</div>
                </div>
              </motion.div>
              <CardTitle className="text-3xl">Sign in to the desk</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@aptimark.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
                <Button type="submit" className="mt-6 w-full" disabled={loading} data-testid="button-submit">
                  {loading ? <Spinner className="mr-2" size="sm" /> : null}
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
