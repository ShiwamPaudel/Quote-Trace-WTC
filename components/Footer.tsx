'use client';

import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/company-logo.png" alt="WTC Nepal" className="h-9 w-auto object-contain" />
          <p className="text-sm text-slate-500">Designed & Developed by Shiwam Paudel | &copy; 2026</p>
        </div>
        <a
          href="https://www.wtcnepal.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Visit main website
          <ExternalLink size={15} />
        </a>
      </div>
    </footer>
  );
}
