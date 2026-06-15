import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { Spinner } from '@/components/ui/spinner';

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'hr')[];
}) {
  const { user, role, loading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation('/login');
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        // If logged in but wrong role, redirect to their appropriate dashboard
        setLocation(role === 'admin' ? '/admin/dashboard' : '/hr/dashboard');
      }
    }
  }, [user, role, loading, allowedRoles, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || (allowedRoles && role && !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
}
