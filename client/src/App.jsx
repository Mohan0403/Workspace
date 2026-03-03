import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence } from 'framer-motion';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layouts/Layout';
import CommandPalette from './layouts/CommandPalette';
import { useSocket } from './hooks/useSocket';
import { useAuth } from './hooks/useAuth';

function App() {
  const { token } = useSelector((state) => state.auth);
  useAuth();
  useSocket(); // initialize socket connection when authenticated

  return (
    <>
      <CommandPalette />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/auth" element={!token ? <Auth /> : <Navigate to="/dashboard" />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="workspace/:workspaceId" element={<Workspace />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;