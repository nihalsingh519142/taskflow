const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.id;
    const myTasks = await db.all(`SELECT t.*, p.name as project_name, u.name as assignee_name, u.avatar_color as assignee_color, c.name as creator_name
      FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assignee_id = u.id JOIN users c ON t.creator_id = c.id
      WHERE t.assignee_id = ? OR t.creator_id = ?
      ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.due_date ASC`, userId, userId);
    const now = new Date();
    const overdueTasks = myTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done');
    const stats = {
      total: myTasks.length,
      todo: myTasks.filter(t => t.status === 'todo').length,
      in_progress: myTasks.filter(t => t.status === 'in_progress').length,
      review: myTasks.filter(t => t.status === 'review').length,
      done: myTasks.filter(t => t.status === 'done').length,
      overdue: overdueTasks.length,
    };
    const recent = await db.all(`SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id IN (SELECT id FROM projects WHERE owner_id = ? UNION SELECT project_id FROM project_members WHERE user_id = ?)
      ORDER BY t.updated_at DESC LIMIT 10`, userId, userId);
    res.json({ stats, myTasks, overdueTasks, recent });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/project/:projectId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const db = await getDb();
    const { status, priority, assigneeId } = req.query;
    let query = `SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, u.email as assignee_email,
      c.name as creator_name, c.avatar_color as creator_color
      FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id JOIN users c ON t.creator_id = c.id
      WHERE t.project_id = ?`;
    const params = [req.params.projectId];
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
    if (assigneeId) { query += ' AND t.assignee_id = ?'; params.push(assigneeId); }
    query += ` ORDER BY CASE t.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'review' THEN 3 ELSE 4 END,
      CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`;
    const tasks = await db.all(query, ...params);
    res.json({ tasks });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, [body('title').trim().notEmpty(), body('projectId').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { title, description, projectId, assigneeId, priority = 'medium', status = 'todo', dueDate } = req.body;
  try {
    const db = await getDb();
    const hasAccess = req.user.role === 'admin' ||
      await db.get('SELECT id FROM projects WHERE id = ? AND owner_id = ?', projectId, req.user.id) ||
      await db.get('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', projectId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'No access to this project' });
    const result = await db.run(`INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      title, description || null, projectId, assigneeId || null, req.user.id, priority, status, dueDate || null);
    const task = await db.get(`SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, c.name as creator_name, p.name as project_name
      FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id JOIN users c ON t.creator_id = c.id JOIN projects p ON t.project_id = p.id WHERE t.id = ?`, result.lastID);
    res.status(201).json({ task });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const hasAccess = req.user.role === 'admin' || task.creator_id === req.user.id || task.assignee_id === req.user.id ||
      await db.get('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', task.project_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'No access' });
    const { title, description, status, priority, assigneeId, dueDate } = req.body;
    await db.run(`UPDATE tasks SET
      title = COALESCE(?, title), description = COALESCE(?, description),
      status = COALESCE(?, status), priority = COALESCE(?, priority),
      assignee_id = CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(?, assignee_id) END,
      due_date = CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(?, due_date) END,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      title || null, description || null, status || null, priority || null,
      assigneeId === null ? null : 1, assigneeId || null,
      dueDate === null ? null : 1, dueDate || null,
      req.params.id);
    const updated = await db.get(`SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, c.name as creator_name, p.name as project_name
      FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id JOIN users c ON t.creator_id = c.id JOIN projects p ON t.project_id = p.id WHERE t.id = ?`, req.params.id);
    res.json({ task: updated });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const isProjectAdmin = await db.get('SELECT id FROM project_members WHERE project_id = ? AND user_id = ? AND role = ?', task.project_id, req.user.id, 'admin');
    if (req.user.role !== 'admin' && task.creator_id !== req.user.id && !isProjectAdmin) return res.status(403).json({ error: 'No permission' });
    await db.run('DELETE FROM tasks WHERE id = ?', req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id/comments', authenticate, async (req, res) => {
  const db = await getDb();
  const comments = await db.all(`SELECT tc.*, u.name as user_name, u.avatar_color FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.task_id = ? ORDER BY tc.created_at ASC`, req.params.id);
  res.json({ comments });
});

router.post('/:id/comments', authenticate, [body('content').trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = await getDb();
  const result = await db.run('INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)', req.params.id, req.user.id, req.body.content);
  const comment = await db.get(`SELECT tc.*, u.name as user_name, u.avatar_color FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.id = ?`, result.lastID);
  res.status(201).json({ comment });
});

module.exports = router;
