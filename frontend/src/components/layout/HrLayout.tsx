import React from 'react';
import { HrSidebar } from './HrSidebar';
import { PageTransition } from './PageTransition';

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <HrSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="py-6 px-8 max-w-7xl mx-auto">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
