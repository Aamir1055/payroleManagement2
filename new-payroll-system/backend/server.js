import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mysql from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';

// Routes
import employeeRoutes from './routes/employeeRoutes.js';
import officeRoutes from './routes/officeRoutes.js';
import positionRoutes from './routes/positionRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import holidayRoutes from './routes/holidayRoutes.js';
import authRoutes from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup - First connect without specifying database
const createDbConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

// Create database if it doesn't exist
createDbConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
  
  // Create database
  createDbConnection.query('CREATE DATABASE IF NOT EXISTS payroll_system3', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      return;
    }
    console.log('Database payroll_system3 created or already exists');
    
    // Close the connection
    createDbConnection.end();
    
    // Now connect to the specific database
    const db = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'payroll_system3'
    });
    
    db.connect((err) => {
      if (err) {
        console.error('Error connecting to payroll_system3:', err);
        return;
      }
      console.log('Connected to payroll_system3 database');
      
      // Initialize database tables
      initializeDatabase();
    });
    
    // Export db for use in routes
    global.db = db;
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload setup
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

// Database initialization
const initializeDatabase = () => {
  const db = global.db;
  
  // Offices table
  db.query(`
    CREATE TABLE IF NOT EXISTS offices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      location VARCHAR(255),
      reporting_time TIME DEFAULT '09:00:00',
      duty_hours INT DEFAULT 8,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating offices table:', err);
      return;
    }
    
    // Positions table
    db.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        office_id INT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
        UNIQUE(name, office_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating positions table:', err);
        return;
      }
      
      // Employees table
      db.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employee_id VARCHAR(20) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(20),
          office_id INT NOT NULL,
          position_id INT NOT NULL,
          monthly_salary DECIMAL(10,2) NOT NULL,
          allowed_late_days INT DEFAULT 3,
          reporting_time TIME,
          duty_hours INT,
          hire_date DATE NOT NULL,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (office_id) REFERENCES offices(id),
          FOREIGN KEY (position_id) REFERENCES positions(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating employees table:', err);
          return;
        }
        
        // Insert sample data
        insertSampleData(db);
      });
    });
  });
  
  // Create remaining tables
  db.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id VARCHAR(20) NOT NULL,
      date DATE NOT NULL,
      punch_in TIME,
      punch_out TIME,
      hours_worked DECIMAL(4,2) DEFAULT 0,
      status ENUM('present', 'absent', 'half_day', 'late') DEFAULT 'present',
      is_late BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
      UNIQUE(employee_id, date)
    )
  `, (err) => {
    if (err) console.error('Error creating attendance table:', err);
  });
  
  db.query(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      type ENUM('national', 'local', 'company') DEFAULT 'company',
      office_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (office_id) REFERENCES offices(id),
      UNIQUE(date, office_id)
    )
  `, (err) => {
    if (err) console.error('Error creating holidays table:', err);
  });
  
  db.query(`
    CREATE TABLE IF NOT EXISTS payroll (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id VARCHAR(20) NOT NULL,
      month INT NOT NULL,
      year INT NOT NULL,
      working_days INT NOT NULL,
      present_days INT NOT NULL,
      absent_days INT NOT NULL,
      half_days INT NOT NULL,
      late_days INT NOT NULL,
      excess_late_days INT DEFAULT 0,
      monthly_salary DECIMAL(10,2) NOT NULL,
      per_day_salary DECIMAL(10,2) NOT NULL,
      late_deduction DECIMAL(10,2) DEFAULT 0,
      half_day_deduction DECIMAL(10,2) DEFAULT 0,
      leave_deduction DECIMAL(10,2) DEFAULT 0,
      total_deduction DECIMAL(10,2) DEFAULT 0,
      net_salary DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
      UNIQUE(employee_id, month, year)
    )
  `, (err) => {
    if (err) console.error('Error creating payroll table:', err);
  });
  
  db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'hr', 'manager') DEFAULT 'hr',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err);
  });
};

const insertSampleData = (db) => {
  // Insert default admin user
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.query(`
    INSERT IGNORE INTO users (username, password, role) 
    VALUES ('admin', ?, 'admin')
  `, [defaultPassword], (err) => {
    if (err) console.error('Error inserting admin user:', err);
  });

  // Insert sample offices
  db.query(`
    INSERT IGNORE INTO offices (name, location, reporting_time, duty_hours) 
    VALUES 
      ('India Office', 'Mumbai', '09:00:00', 8),
      ('US Office', 'New York', '08:00:00', 8),
      ('UK Office', 'London', '09:30:00', 8),
      ('Singapore Office', 'Singapore', '09:00:00', 8)
  `, (err) => {
    if (err) console.error('Error inserting sample offices:', err);
  });

  // Insert sample positions
  db.query(`
    INSERT IGNORE INTO positions (name, office_id, description) 
    VALUES 
      ('Relationship Manager', 1, 'Client relationship management'),
      ('Data Analyst', 1, 'Data analysis and reporting'),
      ('Software Engineer', 1, 'Software development'),
      ('HR Manager', 1, 'Human resources management'),
      ('Finance Manager', 1, 'Financial planning and analysis'),
      ('Team Lead', 2, 'Team leadership and coordination'),
      ('Senior Developer', 2, 'Senior software development'),
      ('QA Engineer', 2, 'Quality assurance testing'),
      ('Project Manager', 3, 'Project management and coordination'),
      ('Business Analyst', 3, 'Business analysis and requirements'),
      ('DevOps Engineer', 4, 'DevOps and infrastructure management'),
      ('Technical Writer', 4, 'Technical documentation')
  `, (err) => {
    if (err) console.error('Error inserting sample positions:', err);
    else console.log('Database tables initialized successfully');
  });
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/holidays', holidayRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
