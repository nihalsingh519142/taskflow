const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../db/database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks/dashboard - personal dashboard data
router.get('/dashboard', authenticate, (req, res) => {
  const userId = req.user.id;

  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name, u.avatar_color as assignee_color,
      c.name as creator_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.creator_id = c.id
    WHERE t.assignee_id = ? OR t.creator_id = ?
    ORDER BY
      CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.due_date ASC NULLS LAST
  `).all(userId, userId);

  const overdueTasks = myTasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  );

  const stats = {
    total: myTasks.length,
    todo: myTasks.filter(t => t.status === 'todo').length,
    in_progress: myTasks.filter(t => t.status === 'in_progress').length,
    review: myTasks.filter(t => t.status === 'review').length,
    done: myTasks.filter(t => t.status === 'done').length,
    overdue: overdueTasks.length,
  };

  // Recent activity (last 5 updated tasks)
  const recent = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.project_id IN (
      SELECT id FROM projects WHERE owner_id = ?
      UNION SELECT project_id FROM project_members WHERE user_id = ?
    )
    ORDER BY t.updated_at DESC LIMIT 10
  `).all(userId, userId);

  res.json({ stats, myTasks, overdueTasks, recent });
});

// GET /api/tasks/project/:projectId
router.get('/project/:projectId', authenticate, requireProjectAccess, (req, res) => {
  const { status, priority, assigneeId } = req.query;

  let query = `
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, u.email as assignee_email,
      c.name as creator_name, c.avatar_color as creator_color
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.creator_id = c.id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assigneeId) { query += ' AND t.assignee_id = ?'; params.push(assigneeId); }

  query += ` ORDER BY
    CASE t.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'review' THEN 3 ELSE 4 END,
    CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
    t.due_date ASC NULLS LAST`;

  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// POST /api/tasks
router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('projectId').notEmpty().withMessage('Project ID required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('dueDate').optional().isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, projectId, assigneeId, priority = 'medium', status = 'todo', dueDate } = req.body;

  // Check project access
  const hasAccess = req.user.role === 'admin' ||
    db.prepare('SELECT id FROM projects WHERE id = ? AND owner_id = ?').get(projectId, req.user.id) ||
    db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);

  if (!hasAccess) return res.status(403).json({ error: 'No access to this project' });

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, priority, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, projectId, assigneeId || null, req.user.id, priority, status, dueDate || null);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color,
      c.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.creator_id = c.id
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// PUT /api/tasks/:id
router.put('/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const hasAccess = req.user.role === 'admin' || task.creator_id === req.user.id ||
    task.assignee_id === req.user.id ||
    db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);

  if (!hasAccess) return res.status(403).json({ error: 'No access' });

  const { title, description, status, priority, assigneeId, dueDate } = req.body;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assignee_id = CASE WHEN ? = 'null' THEN NULL ELSE COALESCE(?, assignee_id) END,
      due_date = CASE WHEN ? = 'null' THEN NULL ELSE COALESCE(?, due_date) END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || null, description || null, status || null, priority || null,
    assigneeId === null ? 'null' : 'keep', assigneeId || null,
    dueDate === null ? 'null' : 'keep', dueDate || null,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, u.email as assignee_email,
      c.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN users c ON t.creator_id = c.id
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json({ task: updated });
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isProjectAdmin = db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ? AND role = ?'
  ).get(task.project_id, req.user.id, 'admin');

  if (req.user.role !== 'admin' && task.creator_id !== req.user.id && !isProjectAdmin) {
    return res.status(403).json({ error: 'No permission to delete this task' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', authenticate, (req, res) => {
  const comments = db.prepare(`
    SELECT tc.*, u.name as user_name, u.avatar_color
    FROM task_comments tc
    JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ?
    ORDER BY tc.created_at ASC
  `).all(req.params.id);
  res.json({ comments });
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', authenticate, [
  body('content').trim().notEmpty().withMessage('Comment cannot be empty'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const result = db.prepare(
    'INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, req.user.id, req.body.content);

  const comment = db.prepare(`
    SELECT tc.*, u.name as user_name, u.avatar_color
    FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

module.exports = router;
