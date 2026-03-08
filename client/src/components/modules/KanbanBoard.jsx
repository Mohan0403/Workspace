import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { setTasks, addTask, updateTask } from '../../store/moduleSlice';
import * as taskService from '../../services/taskService';
import { Plus } from 'lucide-react';

const columns = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'inProgress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

const getNextColumn = (columnId) => {
  const currentIndex = columns.findIndex((column) => column.id === columnId);
  if (currentIndex === -1 || currentIndex >= columns.length - 1) {
    return null;
  }

  return columns[currentIndex + 1].id;
};

const KanbanBoard = ({ module }) => {
  const { workspaceId } = useParams();
  const dispatch = useDispatch();
  const tasks = useSelector((state) => state.modules.tasks);
  const { currentWorkspace } = useSelector((state) => state.workspace);
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentRole = user?.workspaces?.find(
    (membership) => membership.workspace?.toString() === workspaceId?.toString()
  )?.role;
  const canAssign = ['owner', 'admin'].includes(currentRole);

  const workspaceMembers = (currentWorkspace?.members || [])
    .map((item) => item.user)
    .filter(Boolean);
  const workspaceTasks = tasks.filter((task) => {
    const taskWorkspaceId = task.workspace?._id || task.workspace;
    return taskWorkspaceId?.toString() === workspaceId.toString();
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await taskService.getTasks(workspaceId);
      dispatch(setTasks(data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [workspaceId, dispatch]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const task = workspaceTasks.find(t => t._id === draggableId);
    if (!task) return;

    const updatedTask = { ...task, column: destination.droppableId, position: destination.index };
    dispatch(updateTask(updatedTask));
    try {
      await taskService.updateTask(draggableId, {
        column: destination.droppableId,
        position: destination.index
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move task');
    }
  };

  const handleCreateTask = async (columnId) => {
    const title = window.prompt('Task title');
    if (!title?.trim()) return;

    let dueDate;
    let assignees = [];

    if (canAssign) {
      const dueDateInput = window.prompt('Due date (YYYY-MM-DD). Leave blank for no due date.', '');
      if (dueDateInput && dueDateInput.trim()) {
        const parsedDueDate = new Date(dueDateInput.trim());
        if (Number.isNaN(parsedDueDate.getTime())) {
          setError('Invalid due date format. Use YYYY-MM-DD.');
          return;
        }
        dueDate = parsedDueDate.toISOString();
      }

      if (workspaceMembers.length > 0) {
        const options = workspaceMembers
          .map((member, index) => `${index + 1}. ${member.name} (${member.email})`)
          .join('\n');
        const selected = window.prompt(
          `Assign members by number (comma separated). Leave blank for unassigned.\n\n${options}`,
          ''
        );

        if (selected && selected.trim()) {
          const selectedIndexes = selected
            .split(',')
            .map((item) => Number(item.trim()) - 1)
            .filter((index) => Number.isInteger(index) && index >= 0 && index < workspaceMembers.length);

          assignees = [...new Set(selectedIndexes)].map((index) => workspaceMembers[index]._id);
        }
      }
    }

    const position = workspaceTasks.filter((task) => task.column === columnId).length;
    try {
      const { data } = await taskService.createTask({
        workspace: workspaceId,
        title: title.trim(),
        column: columnId,
        dueDate,
        assignees,
        position,
      });
      dispatch(addTask(data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleMoveToNextColumn = async (task) => {
    const nextColumn = getNextColumn(task.column);
    if (!nextColumn) return;

    const nextPosition = workspaceTasks.filter((item) => item.column === nextColumn).length;
    const updatedTask = { ...task, column: nextColumn, position: nextPosition };

    dispatch(updateTask(updatedTask));

    try {
      await taskService.updateTask(task._id, {
        column: nextColumn,
        position: nextPosition,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task status');
    }
  };

  if (loading) return <div className="p-4">Loading tasks...</div>;
  if (error) {
    return (
      <div className="p-4 text-red-400">
        <p>{error}</p>
        <button
          type="button"
          onClick={fetchTasks}
          className="mt-2 rounded border border-white/20 px-3 py-1 text-sm text-gray-200 hover:bg-white/5"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4">
      <h3 className="text-lg font-semibold mb-4">Kanban Board</h3>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto">
          {columns.map((col) => (
            <div key={col.id} className="bg-white/5 rounded-lg p-3 min-w-[250px]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{col.title}</h4>
                <span className="text-xs bg-white/10 px-2 py-1 rounded">
                  {workspaceTasks.filter(t => t.column === col.id).length}
                </span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-[200px]"
                  >
                    {workspaceTasks.filter(t => t.column === col.id).sort((a, b) => (a.position || 0) - (b.position || 0)).map((task, index) => (
                      <Draggable key={task._id} draggableId={task._id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white/10 rounded p-3 mb-2"
                          >
                            <p className="font-medium">{task.title}</p>
                            {task.assignees?.length > 0 && (
                              <p className="mt-1 text-xs text-cyan-200/90">
                                Assigned: {task.assignees.map((assignee) => assignee?.name || 'Member').join(', ')}
                              </p>
                            )}
                            <div className="flex items-center mt-2 text-xs">
                              <span className={`px-2 py-1 rounded ${task.priority === 'high' ? 'bg-red-500/20 text-red-300' : task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                                {task.priority}
                              </span>
                              {task.dueDate && (
                                <span className="ml-2 text-gray-400">
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {task.column !== 'done' && (
                              <button
                                type="button"
                                onClick={() => handleMoveToNextColumn(task)}
                                className="mt-3 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <button onClick={() => handleCreateTask(col.id)} className="w-full mt-2 flex items-center justify-center py-1 border border-dashed border-white/20 rounded hover:bg-white/5 transition">
                <Plus size={16} className="mr-1" /> Add Task
              </button>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;