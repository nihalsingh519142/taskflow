const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-super-secret-key-change-in-production';

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    const user = await db.get('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?', payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function requireProjectAccess(req, res, next) {
  const projectId = req.params.projectId || req.body.projectId;
  if (!projectId) return next();
  try {
    const db = await getDb();
    const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const member = await db.get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', projectId, req.user.id);
    if (req.user.role === 'admin' || project.owner_id === req.user.id || member) {
      req.project = project;
      req.projectMember = member;
      return next();
    }
    return res.status(403).json({ error: 'No access to this project' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

async function requireProjectAdmin(req, res, next) {
  const projectId = req.params.projectId || req.body.projectId;
  try {
    const db = await getDb();
    const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const member = await db.get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', projectId, req.user.id);
    const isOwner = project.owner_id === req.user.id;
    const isGlobalAdmin = req.user.role === 'admin';
    const isProjectAdmin = member && member.role === 'admin';
    if (isOwner || isGlobalAdmin || isProjectAdmin) {
      req.project = project;
      return next();
    }
    return res.status(403).json({ error: 'Project admin access required' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { authenticate, requireProjectAccess, requireProjectAdmin, JWT_SECRET };
