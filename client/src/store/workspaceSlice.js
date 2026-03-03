import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  members: [],
  loading: false,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },
    setCurrentWorkspace: (state, action) => {
      state.currentWorkspace = action.payload;
    },
    setMembers: (state, action) => {
      state.members = action.payload;
    },
    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload);
    },
    updateWorkspace: (state, action) => {
      const index = state.workspaces.findIndex(w => w._id === action.payload._id);
      if (index !== -1) state.workspaces[index] = action.payload;
      if (state.currentWorkspace?._id === action.payload._id) {
        state.currentWorkspace = action.payload;
      }
    },
    removeWorkspace: (state, action) => {
      state.workspaces = state.workspaces.filter(w => w._id !== action.payload);
      if (state.currentWorkspace?._id === action.payload) {
        state.currentWorkspace = null;
      }
    },
  },
});

export const { setWorkspaces, setCurrentWorkspace, setMembers, addWorkspace, updateWorkspace, removeWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;