import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import {
  Award,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function HrSidebar() {
  const [location] = useLocation();
  const { signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
    { name: 'Students', href: '/hr/students', icon: Users },
    { name: 'Offer Letters', href: '/hr/offer-letters', icon: FileText },
    { name: 'Certificates', href: '/hr/certificates', icon: Award },
    { name: 'Payments', href: '/hr/payments', icon: CreditCard },
    { name: 'Settings', href: '/hr/settings', icon: Settings },
  ];

  return (
    <aside className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl">
      <div className="flex h-20 shrink-0 items-center gap-3 overflow-hidden border-b border-sidebar-border px-5 select-none">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white/95">
          <img src="/aptimark-logo.png" alt="Aptimark" className="h-8 w-8 object-contain" />
        </div>
        <div className="min-w-0">
          <span className="block truncate font-serif text-lg font-bold leading-tight">Aptimark</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">HR desk</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
        <div className="px-5 pb-3 page-kicker text-sidebar-foreground/50">Operations</div>
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/68 hover:bg-white/[0.07] hover:text-sidebar-foreground",
                )}
                data-testid={`link-nav-${item.name.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 shrink-0",
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground",
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-white/[0.07] hover:text-sidebar-foreground"
          onClick={() => signOut()}
          data-testid="button-signout"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
