import { Link, Outlet } from 'react-router-dom';
import { BookOpen, LayoutDashboard, ScanFace } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://i.ibb.co.com/4wtwmWgS/Logo-bg-putih.png" alt="Logo Labschool" className="h-10 object-contain" />
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 hidden sm:block">
              Perpustakaan Labschool Jakarta
            </h1>
          </div>
          
          <nav className="flex gap-4">
            <Link to="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
              <ScanFace className="w-5 h-5" />
              <span className="font-medium">Scan</span>
            </Link>
            <Link to="/admin" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Admin</span>
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 md:p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
          <Outlet />
        </div>
      </main>
      
      <footer className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} Perpustakaan Labschool Jakarta
      </footer>
    </div>
  );
}
