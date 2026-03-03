import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSocket } from '../../services/socketService';

const SharedNotes = ({ module }) => {
  const { workspaceId } = useParams();
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    // Load initial notes from API (you'd have a notes endpoint)
    // For demo, we'll use localStorage or a simple fetch
    const saved = localStorage.getItem(`notes-${workspaceId}`);
    if (saved) setContent(saved);

    const socket = getSocket();
    socket.on('notes-updated', (data) => {
      if (data.workspaceId === workspaceId) {
        setContent(data.content);
      }
    });

    return () => {
      socket.off('notes-updated');
    };
  }, [workspaceId]);

  const handleChange = (e) => {
    setContent(e.target.value);
    // Debounce save
    clearTimeout(window.notesTimer);
    window.notesTimer = setTimeout(() => {
      // Save to API and emit via socket
      localStorage.setItem(`notes-${workspaceId}`, e.target.value);
      getSocket().emit('update-notes', { workspaceId, content: e.target.value });
      setLastSaved(new Date().toLocaleTimeString());
    }, 1000);
  };

  return (
    <div className="glass-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Shared Notes</h3>
        {lastSaved && <span className="text-xs text-gray-400">Last saved: {lastSaved}</span>}
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        placeholder="Write your notes here..."
      />
    </div>
  );
};

export default SharedNotes;