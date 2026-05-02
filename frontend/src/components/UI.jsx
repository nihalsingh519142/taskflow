import { X } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';

// Avatar component
export function Avatar({ name, color, size = '' }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div className={`avatar ${size}`} style={{ background: color || '#6366f1' }}>
      {initials}
    </div>
  );
}

// Badge components
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{PRIORITY_LABELS[priority] || priority}</span>;
}

export function RoleBadge({ role }) {
  return <span className={`badge badge-${role}`}>{role}</span>;
}

// Due date display
export function DueDate({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const soon = addDays(now, 3);
  let cls = 'due-ok';
  if (isBefore(d, now)) cls = 'due-overdue';
  else if (isBefore(d, soon)) cls = 'due-soon';
  return <span className={`badge ${cls}`} style={{ fontSize: '11px' }}>📅 {format(d, 'MMM d')}</span>;
}

// Modal
export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Loader
export function Loader({ full }) {
  if (full) return <div className="page-loader"><div className="loader" /></div>;
  return <div className="loader" />;
}

// Empty state
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon}
      <h3 style={{ fontSize: '16px', color: 'var(--text2)', fontWeight: 600 }}>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// Confirm dialog
export function ConfirmModal({ title, message, onConfirm, onCancel, danger }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: 14 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}

// Progress bar
export function ProgressBar({ value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
        <span>{value} / {max} tasks done</span>
        <span>{pct}%</span>
      </div>
      <div className="project-progress">
        <div className="project-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
