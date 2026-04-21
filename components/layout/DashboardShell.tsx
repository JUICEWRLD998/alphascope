'use client';

import { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatPanel from '@/components/ui/ChatPanel';

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);

  // Close sidebar automatically when screen grows to desktop width
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <>
      {/* Mobile backdrop — closes sidebar on tap-outside */}
      <div
        aria-hidden="true"
        onClick={close}
        className={[
          'fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Sidebar — always rendered, slides in/out on mobile */}
      <Sidebar isOpen={open} onClose={close} />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <Header onMenuToggle={toggle} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
      {/* Global AI chat — available on every dashboard page */}
      <ChatPanel />
    </>
  );
}
