import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Users, CheckCircle2 } from 'lucide-react';
import { projectsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, Loader, EmptyState, ProgressBar } from '../components/UI';
import { format } from 'date-fns';

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    projectsAPI.list()
      .then(r => setProjects(r.data.projects))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  if (loading) return <div className="page-loader"><div className="loader" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New Project
        </button>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={48} />}
            title="No projects yet"
            description="Create your first project to get started"
            action={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={15} /> Create Project
              </button>
            }
          />
        ) : (
          <div className="projects-grid">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { setProjects(prev => [p, ...prev]); setShowCreate(false); navigate(`/projects/${p.id}`); }}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const statusColors = { active: 'var(--green)', archived: 'var(--text3)', completed: 'var(--blue)' };
  return (
    <div className="project-card" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `hsl(${project.id * 47 % 360}, 60%, 25%)`,
          border: `1px solid hsl(${project.id * 47 % 360}, 60%, 35%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {['📁', '🚀', '⚙️', '🎯', '🔥', '💡', '🌟', '🛠️'][project.id % 8]}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
          background: `${statusColors[project.status]}18`,
          color: statusColors[project.status],
          textTransform: 'capitalize'
        }}>
          {project.status}
        </span>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{project.name}</h3>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, minHeight: 36,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {project.description || 'No description'}
      </p>

      <ProgressBar value={project.done_count} max={project.task_count} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)', fontSize: 12 }}>
          <Users size={13} />
          {project.member_count} member{project.member_count !== 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          {format(new Date(project.created_at), 'MMM d, yyyy')}
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Project name is required');
    setLoading(true);
    try {
      const r = await projectsAPI.create(form);
      onCreated(r.data.project);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="New Project" onClose={onClose}>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Project Name *</label>
          <input className="input" placeholder="e.g. Website Redesign" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="textarea" placeholder="What is this project about?" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader /> : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
