import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Layers, TrendingUp, ArrowRight } from 'lucide-react';
import { tasksAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, DueDate, Loader, Avatar } from '../components/UI';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.dashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="loader" /></div>;
  if (!data) return null;

  const { stats, myTasks, overdueTasks, recent } = data;

  const statCards = [
    { label: 'Total Tasks', value: stats.total, color: 'var(--accent)', icon: <Layers size={18} /> },
    { label: 'In Progress', value: stats.in_progress, color: 'var(--blue)', icon: <Clock size={18} /> },
    { label: 'In Review', value: stats.review, color: 'var(--amber)', icon: <TrendingUp size={18} /> },
    { label: 'Completed', value: stats.done, color: 'var(--green)', icon: <CheckCircle2 size={18} /> },
    { label: 'Overdue', value: stats.overdue, color: 'var(--red)', icon: <AlertCircle size={18} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')} — Here's your overview</p>
        </div>
        <Link to="/projects" className="btn btn-primary">
          <Layers size={15} /> View Projects
        </Link>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          {statCards.map(s => (
            <div className="stat-card" key={s.label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-label">{s.label}</span>
                <span style={{ color: s.color, opacity: 0.7 }}>{s.icon}</span>
              </div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Overdue tasks */}
          {overdueTasks.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <AlertCircle size={16} color="var(--red)" />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>
                  Overdue ({overdueTasks.length})
                </h3>
              </div>
              {overdueTasks.slice(0, 5).map(task => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}

          {/* My active tasks */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>My Active Tasks</h3>
              <Link to="/my-tasks" style={{ color: 'var(--accent2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {myTasks.filter(t => t.status !== 'done').slice(0, 6).map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
            {myTasks.filter(t => t.status !== 'done').length === 0 && (
              <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                🎉 All caught up!
              </p>
            )}
          </div>

          {/* Recent activity */}
          <div className="card" style={{ gridColumn: overdueTasks.length > 0 ? 'span 1' : 'span 2' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Recent Activity</h3>
            {recent.slice(0, 8).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <StatusBadge status={task.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{task.project_name}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                  {format(new Date(task.updated_at), 'MMM d')}
                </div>
              </div>
            ))}
            {recent.length === 0 && (
              <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No activity yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  return (
    <Link to={`/projects/${task.project_id}`} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        <PriorityBadge priority={task.priority} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{task.project_name}</div>
        </div>
        {task.due_date && <DueDate date={task.due_date} />}
      </div>
    </Link>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
