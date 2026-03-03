import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  useHotkeys('ctrl+k', (e) => {
    e.preventDefault();
    setIsOpen(true);
  });

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="w-full max-w-2xl glass-panel border border-white/10 rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center border-b border-white/10 p-4">
            <Search className="text-gray-400 mr-3" size={20} />
            <input
              type="text"
              placeholder="Search tasks, files, members..."
              className="flex-1 bg-transparent border-none outline-none text-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-white/10">
              <X size={18} />
            </button>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {/* Search results will appear here */}
            <div className="text-center text-gray-400 py-8">Start typing to search...</div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;