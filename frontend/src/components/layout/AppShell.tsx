import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  const { pathname } = useLocation();
  const isChat = pathname === '/chat';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 lg:flex-row">
      <Sidebar />
      <main className={`min-w-0 flex-1 overflow-auto ${isChat ? 'p-0' : 'p-4 sm:p-6'}`}>
        <Outlet />
      </main>
    </div>
  );
}
