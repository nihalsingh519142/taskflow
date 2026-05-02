import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Users, LogOut, CheckSquare, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './UI';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div>
          <div className="logo-text">TaskFlow</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigate</div>
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard className="icon" size={18} />
          Dashboard
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <FolderKanban className="icon" size={18} />
          Projects
        </NavLink>
        <NavLink to="/my-tasks" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <CheckSquare className="icon" size={18} />
          My Tasks
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/admin" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <Users className="icon" size={18} />
            Admin
          </NavLink>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-chip">
          <Avatar name={user?.name} color={user?.avatar_color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button className="sidebar-item" onClick={handleLogout} style={{ marginTop: 4, color: 'var(--text3)' }}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
