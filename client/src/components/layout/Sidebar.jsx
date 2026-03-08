import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LayoutGrid, Settings, FileText, MessageSquare, Clock } from 'lucide-react';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { workspaces, currentWorkspace } = useSelector((state) => state.workspace);
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const toggleSidebar = () => setCollapsed(!collapsed);

  const moduleIcons = {
    kanban: LayoutGrid,
    notes: FileText,
    files: FileText,
    chat: MessageSquare,
    timeline: Clock,
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      className="glass-panel h-full flex flex-col border-r border-white/10 transition-all duration-300"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!collapsed && <span className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-teal-300 to-amber-200 bg-clip-text text-transparent">NexusBoard</span>}
        <button onClick={toggleSidebar} className="p-1 rounded-lg hover:bg-white/10">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {!collapsed && <div className="px-4 mb-2 text-xs uppercase text-gray-500">Workspaces</div>}
        {workspaces.map((workspace) => (
          <NavLink
            key={workspace._id}
            to={`/workspace/${workspace._id}`}
            className={({ isActive }) =>
              `flex items-center px-4 py-2 mx-2 rounded-lg transition-colors ${isActive ? 'bg-accent/20 text-accent-glow' : 'hover:bg-white/10'}`
            }
          >
            <div className="w-6 h-6 rounded bg-accent/30 flex items-center justify-center text-xs">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && <span className="ml-3">{workspace.name}</span>}
          </NavLink>
        ))}

        {currentWorkspace && (
          <>
            {!collapsed && <div className="px-4 mt-6 mb-2 text-xs uppercase text-gray-500">Modules</div>}
            {[...(currentWorkspace.modules || [])].sort((a, b) => a.position - b.position).map((module) => {
              const Icon = moduleIcons[module.moduleType] || LayoutGrid;
              const activeModule = new URLSearchParams(location.search).get('module');
              const isActiveModule =
                location.pathname === `/workspace/${currentWorkspace._id}` &&
                activeModule === module.moduleType;

              return (
                <NavLink
                  key={module._id}
                  to={`/workspace/${currentWorkspace._id}?module=${module.moduleType}`}
                  className={`flex items-center px-4 py-2 mx-2 rounded-lg transition-colors ${isActiveModule ? 'bg-accent/20 text-accent-glow' : 'hover:bg-white/10'}`}
                >
                  <Icon size={18} />
                  {!collapsed && <span className="ml-3 capitalize">{module.moduleType}</span>}
                </NavLink>
              );
            })}
          </>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <NavLink to="/settings" className="flex items-center px-2 py-2 rounded-lg hover:bg-white/10">
          <Settings size={18} />
          {!collapsed && <span className="ml-3">Settings</span>}
        </NavLink>
        <div className="flex items-center mt-4">
          <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`} alt="avatar" className="w-8 h-8 rounded-full" />
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;