import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, User, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../notifications/NotificationBell';
import PreviousButton from '../ui/PreviousButton';

const TopBar = ({ onOpenSidebar = () => {} }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className="glass-panel h-16 border-b border-white/10 flex items-center justify-between px-3 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center flex-1 gap-2">
        <button
          type="button"
          className="inline-flex rounded-lg p-2 hover:bg-white/10 lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <PreviousButton className="mr-1 hidden sm:inline-flex" />

        <div className="relative hidden w-full max-w-xl md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search workspaces, tasks, files... (Ctrl+K)"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            onFocus={() => {/* open command palette */}}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
        <NotificationBell />
        <button
          className="p-2 rounded-lg hover:bg-white/10"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 p-1 rounded-lg hover:bg-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
              <User size={18} />
            </div>
          </button>
          {showProfileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 w-48 glass-panel border border-white/10 rounded-lg shadow-xl"
            >
              <button
                onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                className="block w-full text-left px-4 py-2 hover:bg-white/10"
              >
                Account Settings
              </button>
              <button
                onClick={() => { logout(); setShowProfileMenu(false); }}
                className="block w-full text-left px-4 py-2 hover:bg-white/10 text-red-400"
              >
                Logout
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;