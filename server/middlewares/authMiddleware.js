import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const authorize = (workspaceParam = 'workspaceId') => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params[workspaceParam] || req.body.workspace;
      if (!workspaceId) {
        return res.status(400).json({ message: 'Workspace ID missing' });
      }

      const user = req.user;
      const membership = user.workspaces.find(w => w.workspace.toString() === workspaceId);
      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this workspace' });
      }

      req.membership = membership; // optional
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};