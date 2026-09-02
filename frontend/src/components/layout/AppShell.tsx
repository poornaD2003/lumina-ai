import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  const { pathname } = useLocation();
  const isChat = pathname === '/chat';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className={`flex-1 overflow-auto ${isChat ? 'p-0' : 'p-6'}`}>
        <Outlet />
      </main>
    </div>
  );
}
