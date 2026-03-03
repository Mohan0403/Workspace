import Workspace from '../models/Workspace.js';

const MODULE_TYPES = ['kanban', 'notes', 'files', 'chat', 'timeline'];

const getWorkspaceWithMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { error: { code: 404, message: 'Workspace not found' } };
  }

  const membership = workspace.members.find((member) => member.user.toString() === userId.toString());
  if (!membership) {
    return { error: { code: 403, message: 'Not a workspace member' } };
  }

  return { workspace, membership };
};

export const getModules = async (req, res) => {
  try {
    const { workspace, error } = await getWorkspaceWithMembership(req.params.workspaceId, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    const sortedModules = workspace.modules.sort((a,b) => a.position - b.position);
    res.json(sortedModules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addModule = async (req, res) => {
  try {
    const { moduleType, config } = req.body;
    if (!MODULE_TYPES.includes(moduleType)) {
      return res.status(400).json({ message: 'Invalid module type' });
    }

    const { workspace, membership, error } = await getWorkspaceWithMembership(req.params.workspaceId, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const exists = workspace.modules.some((module) => module.moduleType === moduleType);
    if (exists) {
      return res.status(400).json({ message: 'Module already enabled' });
    }

    const maxPos = workspace.modules.reduce((max, m) => Math.max(max, m.position), -1);
    const newModule = {
      moduleType,
      config: config || {},
      position: maxPos + 1
    };
    workspace.modules.push(newModule);
    await workspace.save();

    res.status(201).json(newModule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const { config } = req.body;
    const { workspace, membership, error } = await getWorkspaceWithMembership(req.params.workspaceId, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const module = workspace.modules.id(req.params.moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });

    module.config = { ...module.config, ...config };
    await workspace.save();

    res.json(module);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reorderModules = async (req, res) => {
  try {
    const { moduleIds } = req.body; 
    const { workspace, membership, error } = await getWorkspaceWithMembership(req.params.workspaceId, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({ message: 'moduleIds must be an array' });
    }

    workspace.modules.forEach(module => {
      const newIndex = moduleIds.indexOf(module._id.toString());
      if (newIndex !== -1) module.position = newIndex;
    });
    await workspace.save();

    res.json(workspace.modules.sort((a,b) => a.position - b.position));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeModule = async (req, res) => {
  try {
    const { workspace, membership, error } = await getWorkspaceWithMembership(req.params.workspaceId, req.user._id);
    if (error) return res.status(error.code).json({ message: error.message });

    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    workspace.modules = workspace.modules.filter(m => m._id.toString() !== req.params.moduleId);

    workspace.modules.forEach((m, idx) => m.position = idx);
    await workspace.save();

    res.json({ message: 'Module removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};