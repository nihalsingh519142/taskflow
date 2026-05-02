import { useState, useEffect } from 'react';
import { tasksAPI, authAPI } from '../api';
import { Modal, Loader } from './UI';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export default function TaskModal({ task, projectId, members, onClose, onSaved }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigneeId: task?.assignee_id || '',
    dueDate: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (isEdit && activeTab === 'comments') {
      tasksAPI.getComments(task.id)
        .then(r => setComments(r.data.comments))
        .catch(console.error);
    }
  }, [isEdit, activeTab, task?.id]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        projectId,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate || null,
      };
      let result;
      if (isEdit) {
        result = await tasksAPI.update(task.id, payload);
      } else {
        result = await tasksAPI.create(payload);
      }
      onSaved(result.data.task, isEdit);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const r = await tasksAPI.addComment(task.id, { content: commentText });
      setComments(c => [...c, r.data.comment]);
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Task' : 'New Task'} onClose={onClose} wide={isEdit}>
      {isEdit && (
        <div className="tabs" style={{ marginBottom: 20 }}>
          {['details', 'comments'].map(t => (
            <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'comments' && comments.length > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
                  {comments.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'details' && (
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input" placeholder="Task title..." value={form.title} onChange={set('title')} autoFocus={!isEdit} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="textarea" placeholder="Add details..." value={form.description} onChange={set('description')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="select" value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="select" value={form.assigneeId} onChange={set('assigneeId')}>
                <option value="">Unassigned</option>
                {(members || []).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="input" type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader /> : (isEdit ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'comments' && (
        <div>
          <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
            {comments.length === 0 && (
              <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                No comments yet. Start the conversation!
              </p>
            )}
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div className="avatar avatar-sm" style={{ background: c.avatar_color, flexShrink: 0 }}>
                  {c.user_name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.user_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', background: 'var(--bg3)', padding: '10px 14px', borderRadius: 8, lineHeight: 1.5 }}>
                    {c.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <textarea
              className="textarea"
              placeholder="Write a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              style={{ minHeight: 60 }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment(); }}
            />
            <button className="btn btn-primary" onClick={submitComment} disabled={commentLoading || !commentText.trim()} style={{ alignSelf: 'flex-end' }}>
              {commentLoading ? <Loader /> : 'Send'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
