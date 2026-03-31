'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/settings', label: 'Settings' },
];

export default function Navbar1() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = () => {
    document.cookie = 'voltview_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 h-[60px]"
        style={{
          background: scrolled ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.6)' : '0 0 0 1px rgba(255,255,255,0.05)',
          borderRadius: '0 0 12px 12px',
          transition: 'background 0.3s, box-shadow 0.3s',
        }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image src="/assets/voltviewlogo.png" alt="VoltView" width={32} height={32} priority
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.9)) drop-shadow(0 0 16px rgba(255,255,255,0.5))' }} />
          <span className="text-white font-bold text-[1rem] sm:text-[1.05rem]"
            style={{ textShadow: '0 0 12px rgba(255,255,255,0.5)' }}>
            VoltView
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline ${
                pathname === href ? 'text-white' : 'text-[#888] hover:text-white'
              }`}>
              {pathname === href && (
                <motion.span layoutId="nav-pill"
                  className="absolute inset-0 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <span className="relative z-10">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden sm:flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors"
            style={{ background: '#fff', color: '#000', border: 'none' }}>
            Logout
          </motion.button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex flex-col justify-center items-center w-8 h-8 gap-[5px] cursor-pointer"
          style={{ background: 'none', border: 'none' }}>
          <motion.span animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-5 h-0.5 bg-white rounded-full" />
          <motion.span animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.2 }}
            className="block w-5 h-0.5 bg-white rounded-full" />
          <motion.span animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="block w-5 h-0.5 bg-white rounded-full" />
        </button>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-x-0 top-[60px] z-40 sm:hidden px-4 py-4 flex flex-col gap-1"
            style={{
              background: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
            {links.map(({ href, label }, i) => (
              <motion.div key={href}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.2 }}>
                <Link href={href} onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium no-underline transition-colors ${
                    pathname === href
                      ? 'text-white bg-white/10'
                      : 'text-[#888] hover:text-white hover:bg-white/5'
                  }`}>
                  {label}
                </Link>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="mt-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={handleLogout}
                className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer"
                style={{ background: '#fff', color: '#000', border: 'none' }}>
                Logout
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
