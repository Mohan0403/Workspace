import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { motion } from 'framer-motion';

const Layout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-shell flex h-screen">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="app-content flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};

export default Layout;