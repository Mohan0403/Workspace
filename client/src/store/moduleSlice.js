import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  modules: [],
  tasks: [],
  messages: [],
  files: [],
  activities: [],
  loading: false,
};

const modulesSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    setModules: (state, action) => {
      state.modules = action.payload;
    },
    addModule: (state, action) => {
      state.modules.push(action.payload);
    },
    updateModule: (state, action) => {
      const index = state.modules.findIndex(m => m._id === action.payload._id);
      if (index !== -1) state.modules[index] = action.payload;
    },
    removeModule: (state, action) => {
      state.modules = state.modules.filter(m => m._id !== action.payload);
    },
    reorderModules: (state, action) => {
      state.modules = action.payload;
    },
    setTasks: (state, action) => {
      state.tasks = action.payload;
    },
    addTask: (state, action) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action) => {
      const index = state.tasks.findIndex(t => t._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      } else {
        state.tasks.push(action.payload);
      }
    },
    removeTask: (state, action) => {
      state.tasks = state.tasks.filter(t => t._id !== action.payload);
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      const exists = state.messages.some((message) => message._id === action.payload._id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    updateMessageReadState: (state, action) => {
      const { messageIds, userId, readAt } = action.payload;
      state.messages = state.messages.map((message) => {
        if (!messageIds.includes(message._id)) return message;

        const alreadyRead = (message.readBy || []).some((entry) => {
          const readerId = entry.user?._id || entry.user;
          return readerId?.toString() === userId?.toString();
        });

        if (alreadyRead) return message;

        return {
          ...message,
          readBy: [...(message.readBy || []), { user: userId, readAt: readAt || new Date().toISOString() }]
        };
      });
    },
    setFiles: (state, action) => {
      state.files = action.payload;
    },
    addFile: (state, action) => {
      state.files.push(action.payload);
    },
    removeFile: (state, action) => {
      state.files = state.files.filter(f => f._id !== action.payload);
    },
    setActivities: (state, action) => {
      state.activities = action.payload;
    },
  },
});

export const {
  setModules, addModule, updateModule, removeModule, reorderModules,
  setTasks, addTask, updateTask, removeTask,
  setMessages, addMessage, updateMessageReadState,
  setFiles, addFile, removeFile,
  setActivities,
} = modulesSlice.actions;
export default modulesSlice.reducer;