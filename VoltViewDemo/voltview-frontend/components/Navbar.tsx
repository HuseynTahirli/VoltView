'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    document.cookie = 'voltview_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.6)',
        borderRadius: '0 0 12px 12px',
      }}>
      <div className="h-[60px] flex items-center px-4 sm:px-6 gap-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image src="/assets/voltviewlogo.png" alt="VoltView" width={32} height={32} priority
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.9)) drop-shadow(0 0 16px rgba(255,255,255,0.5))' }} />
          <span className="text-white font-bold text-[1rem] sm:text-[1.1rem]"
            style={{ textShadow: '0 0 12px rgba(255,255,255,0.7), 0 0 24px rgba(255,255,255,0.35)' }}>
            VoltView
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 ml-2">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline ${
                pathname === href ? 'text-white bg-white/10' : 'text-[#888] hover:text-white hover:bg-white/6'
              }`}>
              {label}
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout}
          className="hidden sm:block ml-auto text-xs text-[#888] hover:text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer"
          style={{ background: 'none', border: '1px solid #2a2a2a' }}>
          Logout
        </button>

        <button onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden ml-auto flex flex-col justify-center items-center w-8 h-8 gap-1.5 cursor-pointer"
          style={{ background: 'none', border: 'none' }}>
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden px-4 pb-4 flex flex-col gap-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {links.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors no-underline ${
                pathname === href ? 'text-white bg-white/10' : 'text-[#888]'
              }`}>
              {label}
            </Link>
          ))}
          <button onClick={handleLogout}
            className="mt-1 px-4 py-3 rounded-md text-sm text-[#888] text-left cursor-pointer transition-colors"
            style={{ background: 'none', border: '1px solid #2a2a2a' }}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
