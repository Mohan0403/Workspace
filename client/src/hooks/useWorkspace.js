import { useDispatch, useSelector } from 'react-redux';
import { setWorkspaces, setCurrentWorkspace, setMembers, addWorkspace, updateWorkspace, removeWorkspace } from '../store/workspaceSlice';
import * as workspaceService from '../services/workspaceService';

export const useWorkspace = () => {
  const dispatch = useDispatch();
  const { workspaces, currentWorkspace, members } = useSelector((state) => state.workspace);

  const fetchWorkspaces = async () => {
    const { data } = await workspaceService.getWorkspaces();
    dispatch(setWorkspaces(data));
  };

  const fetchWorkspace = async (id) => {
    const { data } = await workspaceService.getWorkspace(id);
    dispatch(setCurrentWorkspace(data));
    dispatch(setMembers(data.members));
  };

  const createNewWorkspace = async (workspaceData) => {
    const { data } = await workspaceService.createWorkspace(workspaceData);
    dispatch(addWorkspace(data));
    return data;
  };

  const updateWorkspaceDetails = async (id, workspaceData) => {
    const { data } = await workspaceService.updateWorkspace(id, workspaceData);
    dispatch(updateWorkspace(data));
  };

  const deleteWorkspaceById = async (id) => {
    await workspaceService.deleteWorkspace(id);
    dispatch(removeWorkspace(id));
  };

  const inviteUser = async (workspaceId, emailInput, role) => {
    const parsedEmails = `${emailInput || ''}`
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = parsedEmails.length <= 1
      ? { email: parsedEmails[0] || `${emailInput || ''}`.trim(), role }
      : { emails: parsedEmails, role };

    const response = await workspaceService.inviteMember(workspaceId, payload);

    try {
      await fetchWorkspace(workspaceId);
    } catch (refreshError) {
      console.error('Workspace refresh failed after invite:', refreshError?.message || refreshError);
    }

    return response.data;
  };

  return {
    workspaces,
    currentWorkspace,
    members,
    fetchWorkspaces,
    fetchWorkspace,
    createNewWorkspace,
    updateWorkspaceDetails,
    deleteWorkspaceById,
    inviteUser,
  };
};