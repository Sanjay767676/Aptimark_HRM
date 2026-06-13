import React from 'react';
import { AdminSidebar } from './AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="py-6 px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
