const bcrypt = require('bcryptjs');
const { getDb, initializeDatabase } = require('./db/database');

async function seed() {
  await initializeDatabase();
  const db = await getDb();
  console.log('🌱 Seeding database...');

  await db.run('DELETE FROM task_comments');
  await db.run('DELETE FROM tasks');
  await db.run('DELETE FROM project_members');
  await db.run('DELETE FROM projects');
  await db.run('DELETE FROM users');

  const pw = bcrypt.hashSync('demo123', 10);
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

  const admin = await db.run('INSERT INTO users (name, email, password, role, avatar_color) VALUES (?,?,?,?,?)', 'Alex Admin', 'admin@demo.com', pw, 'admin', '#6366f1');
  const m1 = await db.run('INSERT INTO users (name, email, password, role, avatar_color) VALUES (?,?,?,?,?)', 'Sam Member', 'member@demo.com', pw, 'member', '#10b981');
  const m2 = await db.run('INSERT INTO users (name, email, password, role, avatar_color) VALUES (?,?,?,?,?)', 'Jordan Lee', 'jordan@demo.com', pw, 'member', '#ec4899');
  const m3 = await db.run('INSERT INTO users (name, email, password, role, avatar_color) VALUES (?,?,?,?,?)', 'Riley Chen', 'riley@demo.com', pw, 'member', '#f59e0b');

  const adminId = admin.lastID, m1Id = m1.lastID, m2Id = m2.lastID, m3Id = m3.lastID;

  const p1 = await db.run('INSERT INTO projects (name, description, owner_id) VALUES (?,?,?)', 'Website Redesign', 'Complete overhaul of the company website.', adminId);
  const p2 = await db.run('INSERT INTO projects (name, description, owner_id) VALUES (?,?,?)', 'Mobile App v2', 'Major release with new features and performance improvements.', adminId);
  const p3 = await db.run('INSERT INTO projects (name, description, owner_id) VALUES (?,?,?)', 'API Integration', 'Integrate payment and analytics APIs.', m1Id);

  const p1Id = p1.lastID, p2Id = p2.lastID, p3Id = p3.lastID;

  for (const [pid, uid, role] of [
    [p1Id,adminId,'admin'],[p1Id,m1Id,'member'],[p1Id,m2Id,'member'],[p1Id,m3Id,'member'],
    [p2Id,adminId,'admin'],[p2Id,m2Id,'admin'],[p2Id,m3Id,'member'],
    [p3Id,m1Id,'admin'],[p3Id,adminId,'member'],[p3Id,m2Id,'member']
  ]) await db.run('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?,?,?)', pid, uid, role);

  const t = (title, desc, status, priority, pid, assignee, creator, due) =>
    db.run('INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, creator_id, due_date) VALUES (?,?,?,?,?,?,?,?)',
      title, desc, status, priority, pid, assignee, creator, due);

  await t('Audit current website','Review pages and identify issues.','done','high',p1Id,m1Id,adminId,addDays(-10));
  await t('Create wireframes','Design wireframes in Figma.','done','high',p1Id,m2Id,adminId,addDays(-5));
  await t('Design system setup','Color palette and component library.','in_progress','high',p1Id,m3Id,adminId,addDays(3));
  await t('Homepage implementation','Code the new homepage.','in_progress','critical',p1Id,m1Id,adminId,addDays(5));
  await t('Mobile responsiveness','Ensure all pages work on mobile.','todo','medium',p1Id,m2Id,adminId,addDays(10));
  await t('Performance testing','Run Lighthouse audits.','review','high',p1Id,m1Id,adminId,addDays(-1));
  await t('User authentication','Redesign login with biometric support.','done','critical',p2Id,m2Id,adminId,addDays(-8));
  await t('Push notifications','Implement FCM notifications.','in_progress','high',p2Id,m3Id,adminId,addDays(4));
  await t('Dark mode support','Add system-wide dark mode.','in_progress','medium',p2Id,m2Id,adminId,addDays(7));
  await t('App store assets','Screenshots and app icon.','todo','medium',p2Id,null,adminId,addDays(-3));
  await t('Stripe payment integration','Set up Stripe checkout and webhooks.','in_progress','critical',p3Id,m1Id,m1Id,addDays(6));
  await t('API rate limiting','Implement Redis-based rate limiting.','done','medium',p3Id,m2Id,m1Id,addDays(-4));
  await t('API documentation','Write OpenAPI docs.','review','low',p3Id,m1Id,m1Id,addDays(9));

  console.log('✅ Seed complete!');
  console.log('  admin@demo.com / demo123');
  console.log('  member@demo.com / demo123');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
