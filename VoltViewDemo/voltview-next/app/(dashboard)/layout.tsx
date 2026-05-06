import Navbar from '@/components/ui/navbar-1';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-[76px] px-4 sm:px-6 lg:px-8 pb-8 max-w-[1400px] mx-auto">
        {children}
      </main>
    </>
  );
}
