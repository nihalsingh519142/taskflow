/**
 * Seed script — run with: node seed.js
 * Creates demo users, projects, and tasks
 */
const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('./db/database');

initializeDatabase();

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  db.exec(`
    DELETE FROM task_comments;
    DELETE FROM tasks;
    DELETE FROM project_members;
    DELETE FROM projects;
    DELETE FROM users;
  `);

  // Create users
  const pw = bcrypt.hashSync('demo123', 10);

  const adminId = db.prepare(
    'INSERT INTO users (name, email, password, role, avatar_color) VALUES (?,?,?,?,?)'
  ).run('Alex Admin', 'admin@demo.com', pw, 'admin', '#6366f1').lastInsertRowid;

  const member1Id = db.prepare(
    'INSERT INTO users (name, email, password, role, avatar_color) VALUES (?,?,?,?,?)'
  ).run('Sam Member', 'member@demo.com', pw, 'member', '#10b981').lastInsertRowid;

  const member2Id = db.prepare(
    'INSERT INTO users (name, email, password, role, avatar_color) VALUES (?,?,?,?,?)'
  ).run('Jordan Lee', 'jordan@demo.com', pw, 'member', '#ec4899').lastInsertRowid;

  const member3Id = db.prepare(
    'INSERT INTO users (name, email, password, role, avatar_color) VALUES (?,?,?,?,?)'
  ).run('Riley Chen', 'riley@demo.com', pw, 'member', '#f59e0b').lastInsertRowid;

  console.log('✅ Users created');

  // Create projects
  const proj1Id = db.prepare(
    'INSERT INTO projects (name, description, owner_id, status) VALUES (?,?,?,?)'
  ).run('Website Redesign', 'Complete overhaul of the company website with modern design and improved UX.', adminId, 'active').lastInsertRowid;

  const proj2Id = db.prepare(
    'INSERT INTO projects (name, description, owner_id, status) VALUES (?,?,?,?)'
  ).run('Mobile App v2', 'Major release of the mobile application with new features and performance improvements.', adminId, 'active').lastInsertRowid;

  const proj3Id = db.prepare(
    'INSERT INTO projects (name, description, owner_id, status) VALUES (?,?,?,?)'
  ).run('API Integration', 'Integrate third-party payment and analytics APIs into the platform.', member1Id, 'active').lastInsertRowid;

  // Add members to projects
  const addMember = db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?,?,?)');
  addMember.run(proj1Id, adminId, 'admin');
  addMember.run(proj1Id, member1Id, 'member');
  addMember.run(proj1Id, member2Id, 'member');
  addMember.run(proj1Id, member3Id, 'member');

  addMember.run(proj2Id, adminId, 'admin');
  addMember.run(proj2Id, member2Id, 'admin');
  addMember.run(proj2Id, member3Id, 'member');

  addMember.run(proj3Id, member1Id, 'admin');
  addMember.run(proj3Id, adminId, 'member');
  addMember.run(proj3Id, member2Id, 'member');

  console.log('✅ Projects and members created');

  // Create tasks for Project 1
  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, creator_id, due_date)
    VALUES (?,?,?,?,?,?,?,?)
  `);

  const today = new Date();
  const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0]; };

  // Project 1 tasks
  insertTask.run('Audit current website', 'Review existing pages, identify issues and opportunities.', 'done', 'high', proj1Id, member1Id, adminId, addDays(today, -10));
  insertTask.run('Create wireframes', 'Design wireframes for all main pages in Figma.', 'done', 'high', proj1Id, member2Id, adminId, addDays(today, -5));
  insertTask.run('Design system setup', 'Establish color palette, typography, and component library.', 'in_progress', 'high', proj1Id, member3Id, adminId, addDays(today, 3));
  insertTask.run('Homepage implementation', 'Code the new homepage based on approved designs.', 'in_progress', 'critical', proj1Id, member1Id, adminId, addDays(today, 5));
  insertTask.run('Mobile responsiveness', 'Ensure all pages work flawlessly on mobile devices.', 'todo', 'medium', proj1Id, member2Id, adminId, addDays(today, 10));
  insertTask.run('SEO optimization', 'Implement meta tags, schema markup, and optimize page speed.', 'todo', 'medium', proj1Id, null, adminId, addDays(today, 14));
  insertTask.run('Content migration', 'Move all existing content to the new CMS structure.', 'todo', 'low', proj1Id, member3Id, adminId, addDays(today, 20));
  insertTask.run('Performance testing', 'Run Lighthouse audits and fix all critical issues.', 'review', 'high', proj1Id, member1Id, adminId, addDays(today, -1)); // overdue!

  // Project 2 tasks
  insertTask.run('User authentication flow', 'Redesign login/signup with biometric support.', 'done', 'critical', proj2Id, member2Id, adminId, addDays(today, -8));
  insertTask.run('Push notifications', 'Implement FCM push notifications for iOS and Android.', 'in_progress', 'high', proj2Id, member3Id, adminId, addDays(today, 4));
  insertTask.run('Dark mode support', 'Add system-wide dark mode toggle.', 'in_progress', 'medium', proj2Id, member2Id, adminId, addDays(today, 7));
  insertTask.run('App store assets', 'Create screenshots, preview videos and app icon variants.', 'todo', 'medium', proj2Id, null, adminId, addDays(today, -3)); // overdue!
  insertTask.run('Beta testing', 'Distribute to 50 beta testers and collect feedback.', 'todo', 'high', proj2Id, adminId, adminId, addDays(today, 18));
  insertTask.run('Crash analytics setup', 'Integrate Sentry for crash reporting and performance monitoring.', 'review', 'medium', proj2Id, member3Id, adminId, addDays(today, 2));

  // Project 3 tasks
  insertTask.run('Stripe payment integration', 'Set up Stripe checkout, webhooks and refund handling.', 'in_progress', 'critical', proj3Id, member1Id, member1Id, addDays(today, 6));
  insertTask.run('Analytics dashboard API', 'Connect Mixpanel API and build event tracking.', 'todo', 'high', proj3Id, adminId, member1Id, addDays(today, 12));
  insertTask.run('API rate limiting', 'Implement Redis-based rate limiting for all endpoints.', 'done', 'medium', proj3Id, member2Id, member1Id, addDays(today, -4));
  insertTask.run('API documentation', 'Write OpenAPI/Swagger docs for all endpoints.', 'review', 'low', proj3Id, member1Id, member1Id, addDays(today, 9));

  console.log('✅ Tasks created');

  // Add a couple comments
  db.prepare('INSERT INTO task_comments (task_id, user_id, content) VALUES (?,?,?)').run(1, adminId, 'Great work on the audit! The report was very comprehensive.');
  db.prepare('INSERT INTO task_comments (task_id, user_id, content) VALUES (?,?,?)').run(1, member1Id, 'Thanks! Found quite a few accessibility issues we should prioritize.');
  db.prepare('INSERT INTO task_comments (task_id, user_id, content) VALUES (?,?,?)').run(3, member3Id, 'Working on the color system first, should have a draft by EOD.');

  console.log('✅ Comments added');
  console.log('\n🎉 Seed complete! Demo accounts:');
  console.log('  Admin:  admin@demo.com  / demo123');
  console.log('  Member: member@demo.com / demo123');
  console.log('  Jordan: jordan@demo.com / demo123');
  console.log('  Riley:  riley@demo.com  / demo123');
}

seed();
