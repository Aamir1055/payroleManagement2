const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Import middleware
const { verifyToken, requireAdmin, requireHR, requireManager } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const holidaysRoutes = require('./routes/holidaysRoutes');
const masterRoutes = require('./routes/masterRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Protected routes with role-based access
//app.use('/api/employees', verifyToken, employeeRoutes);


app.use('/api/employees',employeeRoutes);

app.use('/api/attendance', verifyToken, attendanceRoutes);
app.use('/api/payroll', verifyToken, requireManager, payrollRoutes); // Admin, HR, and Floor Manager
app.use('/api/holidays', verifyToken, requireHR, holidaysRoutes); // Admin and HR only
app.use('/api/masters', verifyToken, masterRoutes); // Admin can modify, all can read
app.use('/api/reports', verifyToken, requireManager, reportsRoutes); // Admin, HR, and Floor Manager


//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Default error
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  console.log('\n👥 User Accounts Available:');
  console.log('🔐 Admin: admin / admin123');
  console.log('🏢 HR: hr / hr123');
  console.log('👨‍💼 Floor Manager: floormanager / manager123');
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n� API Endpoints:');
    console.log('🏥 Health Check: GET /api/health');
    console.log('🔑 Login: POST /api/auth/login');
    console.log('👤 Profile: GET /api/auth/profile');
    console.log('🔐 2FA Setup: GET /api/auth/2fa/setup');
    console.log('👥 Employees: /api/employees/* (auth required)');
    console.log('💰 Payroll: /api/payroll/* (manager+ required)');
    console.log('🏢 Masters: /api/masters/* (admin required)');
    console.log('� Holidays: /api/holidays/* (hr+ required)');
    console.log('\n� Setup: node migrate.js');
  }
});