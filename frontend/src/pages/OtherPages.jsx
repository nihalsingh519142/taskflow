import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, DueDate, Avatar, Loader, RoleBadge } from '../components/UI';
import { format } from 'date-fns';
import { ExternalLink, Shield, Users } from 'lucide-react';

export function MyTasksPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    tasksAPI.dashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="loader" /></div>;
  if (!data) return null;

  const tasks = data.myTasks.filter(t => {
    if (filter === 'assigned') return t.assignee_id === user?.id;
    if (filter === 'created') return t.creator_id === user?.id;
    if (filter === 'overdue') return t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{data.myTasks.length} total tasks across all projects</p>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: `All (${data.myTasks.length})` },
            { key: 'assigned', label: `Assigned to me` },
            { key: 'created', label: `Created by me` },
            { key: 'overdue', label: `⚠️ Overdue (${data.overdueTasks.length})` },
          ].map(f => (
            <button key={f.key} className={`tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
              style={{ background: filter === f.key ? 'var(--bg2)' : 'var(--bg3)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 8 }}>
              {f.label}
            </button>
          ))}
        </div>

        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            🎉 No tasks here!
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.map(task => (
            <Link key={task.id} to={`/projects/${task.project_id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', borderRadius: 10 }}>
                <PriorityBadge priority={task.priority} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{task.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{task.project_name}</span>
                    {task.assignee_id === user?.id && <span>• Assigned to you</span>}
                    {task.creator_id === user?.id && task.assignee_id !== user?.id && <span>• Created by you</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <StatusBadge status={task.status} />
                  {task.due_date && <DueDate date={task.due_date} />}
                  <ExternalLink size={13} color="var(--text3)" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.users()
      .then(r => setUsers(r.data.users))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="loader" /></div>;

  const admins = users.filter(u => u.role === 'admin');
  const members = users.filter(u => u.role === 'member');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} color="var(--accent2)" /> Admin Panel
          </h1>
          <p className="page-subtitle">Manage all users in your workspace</p>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 480, marginBottom: 28 }}>
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{users.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Admins</div>
            <div className="stat-value" style={{ color: 'var(--accent2)' }}>{admins.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Members</div>
            <div className="stat-value" style={{ color: 'var(--text2)' }}>{members.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="var(--text2)" />
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>All Users</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                {['User', 'Email', 'Role', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.name} color={u.avatar_color} />
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text2)', fontSize: 13 }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: 12 }}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
