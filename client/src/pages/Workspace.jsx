import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import WorkspaceHeader from '../components/workspace/WorkspaceHeader';
import MemberList from '../components/workspace/MemberList';
import ModuleRenderer from '../components/modules/ModuleRenderer';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { setModules, reorderModules } from '../store/moduleSlice';
import { useWorkspace } from '../hooks/useWorkspace';
import * as moduleService from '../services/moduleService';
import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import PreviousButton from '../components/ui/PreviousButton';
import { Plus } from 'lucide-react';

const Workspace = () => {
  const { workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { fetchWorkspace } = useWorkspace();
  const { modules } = useSelector((state) => state.modules);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        if (workspaceId) {
          await fetchWorkspace(workspaceId);
          const response = await moduleService.getModules(workspaceId);
          dispatch(setModules(response.data));
          setLoading(false);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      }
    };
    load();
  }, [workspaceId, dispatch, fetchWorkspace]);

  const selectedModuleType = searchParams.get('module');

  useEffect(() => {
    if (!modules.length) return;

    const sortedModules = [...modules].sort((a, b) => a.position - b.position);
    const exists = sortedModules.some((module) => module.moduleType === selectedModuleType);

    if (!selectedModuleType || !exists) {
      setSearchParams({ module: sortedModules[0].moduleType }, { replace: true });
    }
  }, [modules, selectedModuleType, setSearchParams]);

  const sortedModules = [...modules].sort((a, b) => a.position - b.position);
  const selectedModule =
    sortedModules.find((module) => module.moduleType === selectedModuleType) || sortedModules[0] || null;

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(modules);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    dispatch(reorderModules(reordered));
    try {
      const moduleIds = reordered.map(m => m._id);
      await moduleService.reorderModules(workspaceId, moduleIds);
    } catch (error) {
      alert('Failed to reorder modules: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAddModule = async () => {
    const moduleType = window.prompt('Enter module type: kanban, notes, files, chat, timeline');
    if (!moduleType) return;

    try {
      await moduleService.addModule(workspaceId, { moduleType: moduleType.trim() });
      const modulesResponse = await moduleService.getModules(workspaceId);
      dispatch(setModules(modulesResponse.data));
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to add module');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="p-6 bg-red-500/10 border border-red-500 rounded-lg">
          <h2 className="text-red-500 font-bold text-lg">Error Loading Workspace</h2>
          <p className="text-red-400 mt-2">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <PreviousButton fallback="/dashboard" />
      </div>
      <WorkspaceHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Modules ({modules.length})</h2>
            <Button size="sm" onClick={handleAddModule}>
              <Plus size={16} className="mr-1" /> Add Module
            </Button>
          </div>
          {sortedModules.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
              <p>No modules enabled yet. Click "Add Module" to get started.</p>
            </div>
          ) : !selectedModule ? (
            <div className="text-center p-8 text-gray-400">
              <p>Select a module from the sidebar.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="modules" direction="horizontal">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="mb-4 flex flex-wrap gap-3"
                  >
                    {sortedModules.map((module, index) => (
                      <Draggable key={module._id} draggableId={module._id} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`cursor-pointer rounded-[0.6rem] border px-3.5 py-2 text-sm capitalize transition ${selectedModuleType === module.moduleType ? 'border-indigo-400/60 bg-indigo-500/35' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                            onClick={() => setSearchParams({ module: module.moduleType })}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                setSearchParams({ module: module.moduleType });
                              }
                            }}
                          >
                            {module.moduleType}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {selectedModule && (
            <div className="min-w-0 overflow-x-auto">
              <ModuleRenderer module={selectedModule} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <MemberList />
        </div>
      </div>
    </div>
  );
};

export default Workspace;