const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB
initializeDatabase();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend - check if built dist exists
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const indexHtmlPath = path.join(frontendDistPath, 'index.html');

console.log(`📁 Looking for frontend at: ${frontendDistPath}`);
console.log(`📄 index.html exists: ${fs.existsSync(indexHtmlPath)}`);

if (fs.existsSync(indexHtmlPath)) {
  console.log('✅ Serving frontend static files');
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(indexHtmlPath);
  });
} else {
  console.log('⚠️  Frontend dist not found - API-only mode');
  app.get('/', (req, res) => {
    res.json({ message: 'TaskFlow API running', docs: '/api/health' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TaskFlow server running on port ${PORT}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
