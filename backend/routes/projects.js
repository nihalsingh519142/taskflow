const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    let projects;
    if (req.user.role === 'admin') {
      projects = await db.all(`SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
        FROM projects p JOIN users u ON p.owner_id = u.id ORDER BY p.created_at DESC`);
    } else {
      projects = await db.all(`SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
        FROM projects p JOIN users u ON p.owner_id = u.id
        WHERE p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
        ORDER BY p.created_at DESC`, req.user.id, req.user.id);
    }
    res.json({ projects });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, [body('name').trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description } = req.body;
  try {
    const db = await getDb();
    const result = await db.run('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', name, description || null, req.user.id);
    await db.run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', result.lastID, req.user.id, 'admin');
    const project = await db.get(`SELECT p.*, u.name as owner_name, 0 as task_count, 0 as done_count, 1 as member_count
      FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`, result.lastID);
    res.status(201).json({ project });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:projectId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    const project = await db.get(`SELECT p.*, u.name as owner_name, u.email as owner_email,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count
      FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`, req.params.projectId);
    const members = await db.all(`SELECT u.id, u.name, u.email, u.role as global_role, u.avatar_color, pm.role as project_role, pm.joined_at
      FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ? ORDER BY pm.role DESC, u.name`, req.params.projectId);
    res.json({ project, members });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:projectId', authenticate, requireProjectAdmin, async (req, res) => {
  const { name, description, status } = req.body;
  try {
    const db = await getDb();
    await db.run(`UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), status = COALESCE(?, status) WHERE id = ?`,
      name || null, description !== undefined ? description : null, status || null, req.params.projectId);
    const updated = await db.get('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?', req.params.projectId);
    res.json({ project: updated });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:projectId', authenticate, requireProjectAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM projects WHERE id = ?', req.params.projectId);
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:projectId/members', authenticate, requireProjectAdmin, [body('userId').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { userId, role = 'member' } = req.body;
  try {
    const db = await getDb();
    const user = await db.get('SELECT id FROM users WHERE id = ?', userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await db.run('INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', req.params.projectId, userId, role);
    const members = await db.all(`SELECT u.id, u.name, u.email, u.avatar_color, pm.role as project_role, pm.joined_at
      FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ?`, req.params.projectId);
    res.json({ members });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:projectId/members/:userId', authenticate, requireProjectAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.projectId);
    if (project.owner_id == req.params.userId) return res.status(400).json({ error: 'Cannot remove project owner' });
    await db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', req.params.projectId, req.params.userId);
    res.json({ message: 'Member removed' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
