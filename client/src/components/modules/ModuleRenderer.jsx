import KanbanBoard from './KanbanBoard';
import SharedNotes from './ShareNotes';
import FileStorage from './FileStorage';
import TeamChat from './TeamChat';
import ActivityTimeline from './ActivityTimeline';

const ModuleRenderer = ({ module }) => {
  const components = {
    kanban: KanbanBoard,
    notes: SharedNotes,
    files: FileStorage,
    chat: TeamChat,
    timeline: ActivityTimeline,
  };

  const Component = components[module.moduleType];
  if (!Component) return null;

  return <Component module={module} />;
};

export default ModuleRenderer;