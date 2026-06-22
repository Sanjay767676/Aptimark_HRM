import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Award, 
  CreditCard, 
  Settings,
  LogOut
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
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5 border-b border-sidebar-border overflow-hidden select-none">
        <img src="/aptimark-logo.png" alt="Aptimark" className="h-8 w-8 object-contain invert shrink-0" />
        <span className="font-bold text-base leading-tight truncate">Aptimark Solutions<sup className="text-[10px] font-normal align-super">™</sup></span>
        <span className="text-sidebar-foreground/40 font-normal text-xs ml-auto shrink-0">HR</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-4 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                data-testid={`link-nav-${item.name.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 shrink-0",
                    isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" 
          onClick={() => signOut()}
          data-testid="button-signout"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
