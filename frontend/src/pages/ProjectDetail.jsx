import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Settings, Users, Trash2, UserPlus, Filter, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { projectsAPI, tasksAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, DueDate, Avatar, Modal, Loader, EmptyState, ConfirmModal, ProgressBar, RoleBadge } from '../components/UI';
import TaskModal from '../components/TaskModal';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--text3)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'review', label: 'Review', color: 'var(--amber)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('board'); // board | list
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [deleteTask, setDeleteTask] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => { load(); }, [projectId]);

  const load = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        projectsAPI.get(projectId),
        tasksAPI.byProject(projectId),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(taskRes.data.tasks);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin' || project?.owner_id === user?.id ||
    members.find(m => m.id === user?.id && m.project_role === 'admin');

  const filteredTasks = tasks.filter(t => {
    if (filterAssignee && t.assignee_id != filterAssignee) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filteredTasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const handleTaskSaved = (task, isEdit) => {
    if (isEdit) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    } else {
      setTasks(prev => [...prev, task]);
    }
    setShowTaskModal(false);
    setEditTask(null);
  };

  const handleDeleteTask = async () => {
    try {
      await tasksAPI.delete(deleteTask.id);
      setTasks(prev => prev.filter(t => t.id !== deleteTask.id));
    } catch (e) { console.error(e); }
    setDeleteTask(null);
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const r = await tasksAPI.update(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? r.data.task : t));
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="page-loader"><div className="loader" /></div>;
  if (!project) return null;

  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginTop: 4 }}>
            <ArrowLeft size={15} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title">{project.name}</h1>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, textTransform: 'capitalize',
                background: project.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(152,152,176,0.1)',
                color: project.status === 'active' ? 'var(--green)' : 'var(--text2)',
              }}>{project.status}</span>
            </div>
            <p className="page-subtitle">{project.description || 'No description'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Member avatars */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {members.slice(0, 4).map((m, i) => (
              <div key={m.id} className="tooltip-wrap" style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }}>
                <Avatar name={m.name} color={m.avatar_color} />
                <span className="tooltip">{m.name}</span>
              </div>
            ))}
            {members.length > 4 && (
              <div className="avatar" style={{ background: 'var(--bg4)', color: 'var(--text2)', marginLeft: -8, fontSize: 10, border: '1px solid var(--border2)' }}>
                +{members.length - 4}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowMembers(true)}>
            <Users size={15} /> Members
          </button>
          {isAdmin && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)}>
                <Settings size={15} /> Settings
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
            <Plus size={15} /> Add Task
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Progress + filters bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <ProgressBar value={doneCount} max={tasks.length} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <div className="tabs">
              <button className={`tab ${activeView === 'board' ? 'active' : ''}`} onClick={() => setActiveView('board')}>Board</button>
              <button className={`tab ${activeView === 'list' ? 'active' : ''}`} onClick={() => setActiveView('list')}>List</button>
            </div>
            <select className="select" style={{ width: 'auto', fontSize: 13 }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
              <option value="">All assignees</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select className="select" style={{ width: 'auto', fontSize: 13 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="">All priorities</option>
              {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Board view */}
        {activeView === 'board' && (
          <div className="board-columns">
            {COLUMNS.map(col => (
              <div key={col.key} className="board-column">
                <div className="board-column-header">
                  <div className="board-column-title">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span style={{ color: col.color }}>{col.label}</span>
                  </div>
                  <span className="board-column-count">{tasksByStatus[col.key].length}</span>
                </div>

                {tasksByStatus[col.key].length === 0 && (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 12, borderRadius: 8, border: '1px dashed var(--border)', margin: '4px 0' }}>
                    Drop tasks here
                  </div>
                )}

                {tasksByStatus[col.key].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => setEditTask(task)}
                    onDelete={() => setDeleteTask(task)}
                    onStatusChange={handleStatusChange}
                    isAdmin={isAdmin}
                    currentUserId={user?.id}
                  />
                ))}

                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8, borderStyle: 'dashed', color: 'var(--text3)' }}
                  onClick={() => setShowTaskModal(true)}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {activeView === 'list' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Task', 'Status', 'Priority', 'Assignee', 'Due Date', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>No tasks found</td></tr>
                )}
                {filteredTasks.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onClick={() => setEditTask(task)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? '…' : ''}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={task.status} /></td>
                    <td style={{ padding: '12px 16px' }}><PriorityBadge priority={task.priority} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      {task.assignee_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Avatar name={task.assignee_name} color={task.assignee_color} size="avatar-sm" />
                          <span style={{ fontSize: 13 }}>{task.assignee_name}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {task.due_date ? <DueDate date={task.due_date} /> : <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {(isAdmin || task.creator_id === user?.id) && (
                        <button className="btn btn-danger btn-xs" onClick={e => { e.stopPropagation(); setDeleteTask(task); }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showTaskModal || editTask) && (
        <TaskModal
          task={editTask}
          projectId={projectId}
          members={members}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSaved={handleTaskSaved}
        />
      )}

      {deleteTask && (
        <ConfirmModal
          title="Delete Task"
          message={`Are you sure you want to delete "${deleteTask.title}"? This cannot be undone.`}
          onConfirm={handleDeleteTask}
          onCancel={() => setDeleteTask(null)}
          danger
        />
      )}

      {showSettings && (
        <ProjectSettingsModal
          project={project}
          onClose={() => setShowSettings(false)}
          onUpdated={(p) => { setProject(p); setShowSettings(false); }}
          onDeleted={() => navigate('/projects')}
        />
      )}

      {showMembers && (
        <MembersModal
          project={project}
          members={members}
          isAdmin={isAdmin}
          onClose={() => setShowMembers(false)}
          onUpdated={setMembers}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, isAdmin, currentUserId }) {
  const [showMenu, setShowMenu] = useState(false);
  const canEdit = isAdmin || task.creator_id === currentUserId || task.assignee_id === currentUserId;

  return (
    <div className="task-card" onClick={onEdit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="task-card-title">{task.title}</div>
        {canEdit && (
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-ghost btn-xs" onClick={() => setShowMenu(m => !m)} style={{ padding: '3px 6px' }}>
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', zIndex: 10,
                background: 'var(--bg4)', border: '1px solid var(--border2)',
                borderRadius: 8, padding: 6, minWidth: 140,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
              }}>
                {['todo', 'in_progress', 'review', 'done']
                  .filter(s => s !== task.status)
                  .map(s => (
                    <button key={s} className="sidebar-item" style={{ padding: '7px 10px', fontSize: 12, width: '100%' }}
                      onClick={() => { onStatusChange(task, s); setShowMenu(false); }}>
                      Move to {s.replace('_', ' ')}
                    </button>
                  ))}
                <div className="divider" style={{ margin: '4px 0' }} />
                <button className="sidebar-item" style={{ padding: '7px 10px', fontSize: 12, color: 'var(--red)', width: '100%' }}
                  onClick={() => { onDelete(); setShowMenu(false); }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {task.description && (
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </p>
      )}

      <div className="task-card-footer">
        <PriorityBadge priority={task.priority} />
        {task.due_date && <DueDate date={task.due_date} />}
      </div>

      {task.assignee_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <Avatar name={task.assignee_name} color={task.assignee_color} size="avatar-sm" />
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{task.assignee_name}</span>
        </div>
      )}
    </div>
  );
}

function ProjectSettingsModal({ project, onClose, onUpdated, onDeleted }) {
  const [form, setForm] = useState({ name: project.name, description: project.description || '', status: project.status });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await projectsAPI.update(project.id, form);
      onUpdated(r.data.project);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectsAPI.delete(project.id);
      onDeleted();
    } catch (err) {
      setError('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  if (showConfirm) return (
    <ConfirmModal
      title="Delete Project"
      message={`Delete "${project.name}"? All tasks will be permanently removed.`}
      onConfirm={handleDelete}
      onCancel={() => setShowConfirm(false)}
      danger
    />
  );

  return (
    <Modal title="Project Settings" onClose={onClose}>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">Project Name</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 8 }}>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowConfirm(true)}>
            <Trash2 size={14} /> Delete Project
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader /> : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function MembersModal({ project, members, isAdmin, onClose, onUpdated }) {
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authAPI.users().then(r => setAllUsers(r.data.users)).catch(console.error);
  }, []);

  const nonMembers = allUsers.filter(u => !members.find(m => m.id === u.id));

  const addMember = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const r = await projectsAPI.addMember(project.id, { userId: selectedUser, role: selectedRole });
      onUpdated(r.data.members);
      setSelectedUser('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId) => {
    try {
      await projectsAPI.removeMember(project.id, userId);
      onUpdated(members.filter(m => m.id !== userId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  return (
    <Modal title={`Members (${members.length})`} onClose={onClose} wide>
      {error && <div className="error-msg">{error}</div>}

      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <select className="select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ flex: 1 }}>
            <option value="">Select a user to add...</option>
            {nonMembers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
          <select className="select" value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{ width: 120 }}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn btn-primary" onClick={addMember} disabled={loading || !selectedUser}>
            {loading ? <Loader /> : <><UserPlus size={15} /> Add</>}
          </button>
        </div>
      )}

      <div>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <Avatar name={m.name} color={m.avatar_color} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.email}</div>
            </div>
            <RoleBadge role={m.project_role} />
            {isAdmin && project.owner_id !== m.id && (
              <button className="btn btn-danger btn-xs" onClick={() => removeMember(m.id)}>
                <Trash2 size={12} />
              </button>
            )}
            {project.owner_id === m.id && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Owner</span>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
