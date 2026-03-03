import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

const WorkspaceHeader = () => {
  const { workspaceId } = useParams();
  const currentWorkspace = useSelector((state) => state.workspace.currentWorkspace);

  if (!currentWorkspace) return null;

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold">{currentWorkspace.name}</h1>
      {currentWorkspace.description && (
        <p className="text-gray-400 mt-1">{currentWorkspace.description}</p>
      )}
    </div>
  );
};

export default WorkspaceHeader;