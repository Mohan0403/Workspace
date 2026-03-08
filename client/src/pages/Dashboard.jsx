import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, CheckSquare } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';

const Dashboard = () => {
  const { workspaces, fetchWorkspaces, createNewWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '' });

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      setError('');
      await fetchWorkspaces();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load workspaces. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newWorkspace.name) return;
    try {
      await createNewWorkspace(newWorkspace);
      setShowCreateModal(false);
      setNewWorkspace({ name: '', description: '' });
      await loadWorkspaces();
    } catch (error) {
      alert('Failed to create workspace: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-lg border border-red-500/40 bg-red-500/10 p-5 text-red-300">
        <p>{error}</p>
        <Button className="mt-3" onClick={loadWorkspaces}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold leading-tight">Workspace Hub</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} className="mr-2" /> Create Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="py-20 text-center">
          <p className="mb-4 text-gray-400">No workspaces yet — create your first collaboration space.</p>
          <Button onClick={() => setShowCreateModal(true)}>Create Workspace</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <motion.div
              key={workspace._id}
              whileHover={{ scale: 1.02 }}
              className="neumorph-card cursor-pointer border border-white/10 p-6 transition-transform duration-200"
              onClick={() => window.location.href = `/workspace/${workspace._id}`}
            >
              <h3 className="mb-2 text-xl font-semibold">{workspace.name}</h3>
              <p className="mb-4 min-h-[2.5rem] text-sm text-gray-400">{workspace.description || 'No description'}</p>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <div className="flex items-center">
                  <Users size={16} className="mr-1" />
                  <span>{workspace.members?.length || 1} members</span>
                </div>
                <div className="flex items-center">
                  <CheckSquare size={16} className="mr-1" />
                  <span>{workspace.modules?.length || 0} modules</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Workspace">
        <form onSubmit={handleCreate}>
          <Input
            label="Workspace Name"
            value={newWorkspace.name}
            onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
            required
            placeholder="e.g., Marketing Team"
          />
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Description (optional)</label>
            <textarea
              value={newWorkspace.description}
              onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
              rows="3"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 outline-none transition focus:border-indigo-400/80 focus:ring-2 focus:ring-indigo-500/40"
              placeholder="What's this workspace about?"
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;