import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
// Use global.db instead of importing

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

// Get next employee ID
router.get('/next-id', (req, res) => {
  global.db.query(
    'SELECT employee_id FROM employees ORDER BY id DESC LIMIT 1',
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      let nextId = 'EMP001';
      if (results && results.length > 0 && results[0].employee_id) {
        const lastId = results[0].employee_id;
        const numericPart = parseInt(lastId.replace('EMP', ''));
        const nextNumericPart = numericPart + 1;
        nextId = `EMP${nextNumericPart.toString().padStart(3, '0')}`;
      }

      res.json({ nextId });
    }
  );
});

// Get all employees
router.get('/', (req, res) => {
  const query = `
    SELECT 
      e.*,
      o.name as office_name,
      p.name as position_name
    FROM employees e
    LEFT JOIN offices o ON e.office_id = o.id
    LEFT JOIN positions p ON e.position_id = p.id
    ORDER BY e.created_at DESC
  `;

  global.db.query(query, (err, employees) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(employees);
  });
});

// Get employee by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      e.*,
      o.name as office_name,
      p.name as position_name
    FROM employees e
    LEFT JOIN offices o ON e.office_id = o.id
    LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.id = ?
  `;

  global.db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!results.length) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(results[0]);
  });
});

// Create new employee
router.post('/', (req, res) => {
  const {
    employee_id,
    name,
    email,
    phone,
    office_id,
    position_id,
    monthly_salary,
    allowed_late_days,
    reporting_time,
    duty_hours,
    hire_date
  } = req.body;

  // Validate required fields
  if (!employee_id || !name || !office_id || !position_id || !monthly_salary || !hire_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if employee_id already exists
  global.db.query('SELECT id FROM employees WHERE employee_id = ?', [employee_id], (err, result) => {
    const existing = result[0];
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existing) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }

    // Insert new employee
    const query = `
      INSERT INTO employees (
        employee_id, name, email, phone, office_id, position_id, 
        monthly_salary, allowed_late_days, reporting_time, duty_hours, hire_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    global.db.query(
      query,
      [
        employee_id, name, email, phone, office_id, position_id,
        monthly_salary, allowed_late_days || 3, reporting_time, duty_hours, hire_date
      ],
      function(err, results) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create employee' });
        }

        // Fetch the created employee with joined data
        const fetchQuery = `
          SELECT 
            e.*,
            o.name as office_name,
            p.name as position_name
          FROM employees e
          LEFT JOIN offices o ON e.office_id = o.id
          LEFT JOIN positions p ON e.position_id = p.id
          WHERE e.id = ?
        `;

        global.db.query(fetchQuery, [results.insertId], (err, result) => {
          const employee = result[0];
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.status(201).json(employee);
        });
      }
    );
  });
});

// Update employee
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    office_id,
    position_id,
    monthly_salary,
    allowed_late_days,
    reporting_time,
    duty_hours,
    hire_date,
    status
  } = req.body;

  const query = `
    UPDATE employees SET 
      name = ?, email = ?, phone = ?, office_id = ?, position_id = ?,
      monthly_salary = ?, allowed_late_days = ?, reporting_time = ?, 
      duty_hours = ?, hire_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = ?
  `;

  global.db.query(
    query,
    [
      name, email, phone, office_id, position_id, monthly_salary,
      allowed_late_days, reporting_time, duty_hours, hire_date, status, id
    ],
    function(err, results) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update employee' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Fetch updated employee
      const fetchQuery = `
        SELECT 
          e.*,
          o.name as office_name,
          p.name as position_name
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.employee_id = ?
      `;

      global.db.query(fetchQuery, [id], (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(result[0]);
      });
    }
  );
});

// Delete employee
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  global.db.query('DELETE FROM employees WHERE employee_id = ?', [id], function(err, results) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete employee' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  });
});

// Upload employees in bulk
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const workbook = xlsx.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  const insertValues = [];

  data.forEach(row => {
    const {
      EmployeeID,
      Name,
      Email,
      Phone,
      OfficeID,
      PositionID,
      MonthlySalary,
      AllowedLateDays,
      ReportingTime,
      DutyHours,
      HireDate,
      Status
    } = row;

    if (EmployeeID && Name && OfficeID && PositionID && MonthlySalary && HireDate) {
      insertValues.push([EmployeeID, Name, Email, Phone, OfficeID, PositionID, MonthlySalary, AllowedLateDays || 3, ReportingTime || '09:00:00', DutyHours || 8, HireDate, Status || 'active']);
    }
  });

  // Bulk insert
  const query = `
    INSERT INTO employees (
      employee_id, name, email, phone, office_id, position_id,
      monthly_salary, allowed_late_days, reporting_time, duty_hours, hire_date, status
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email = VALUES(email),
      phone = VALUES(phone),
      office_id = VALUES(office_id),
      position_id = VALUES(position_id),
      monthly_salary = VALUES(monthly_salary),
      allowed_late_days = VALUES(allowed_late_days),
      reporting_time = VALUES(reporting_time),
      duty_hours = VALUES(duty_hours),
      hire_date = VALUES(hire_date),
      status = VALUES(status)
  `;

  global.db.query(query, [insertValues], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to upload employees' });
    }
    res.json({ message: 'Employees uploaded successfully' });
  });
});

// Export employees to Excel
router.get('/export', (req, res) => {
  const query = `
    SELECT 
      e.employee_id AS 'Employee ID',
      e.name AS 'Name',
      e.email AS 'Email',
      e.phone AS 'Phone',
      o.name AS 'Office',
      p.name AS 'Position',
      e.monthly_salary AS 'Monthly Salary',
      e.allowed_late_days AS 'Allowed Late Days',
      e.reporting_time AS 'Reporting Time',
      e.duty_hours AS 'Duty Hours',
      e.hire_date AS 'Hire Date',
      e.status AS 'Status'
    FROM employees e
    LEFT JOIN offices o ON e.office_id = o.id
    LEFT JOIN positions p ON e.position_id = p.id
  `;

  global.db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to export employees' });
    }

    const worksheet = xlsx.utils.json_to_sheet(results);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Employees');

    const exportPath = path.join(__dirname, '..', 'exports', 'Employees.xlsx');
    xlsx.writeFile(workbook, exportPath);

    res.download(exportPath, 'Employees.xlsx');
  });
});

// Get employee statistics
router.get('/stats/summary', (req, res) => {
  const queries = [
    // Total employees
    'SELECT COUNT(*) as total FROM employees WHERE status = "active"',
    // Office-wise employee count
    `SELECT 
      o.name as office_name, 
      COUNT(e.id) as employee_count,
      SUM(e.monthly_salary) as total_salary
    FROM offices o
    LEFT JOIN employees e ON o.id = e.office_id AND e.status = "active"
    GROUP BY o.id, o.name
    ORDER BY employee_count DESC`,
    // Position-wise employee count
    `SELECT 
      p.name as position_name,
      o.name as office_name,
      COUNT(e.id) as employee_count
    FROM positions p
    LEFT JOIN employees e ON p.id = e.position_id AND e.status = "active"
    LEFT JOIN offices o ON p.office_id = o.id
    GROUP BY p.id, p.name, o.name
    ORDER BY employee_count DESC`
  ];

  const results = {};

  // Execute queries sequentially
  global.db.query(queries[0], (err, totals) => {
    results.total = totals[0].total;

    global.db.query(queries[1], (err, officeStats) => {
      results.byOffice = officeStats;

      global.db.query(queries[2], (err, positionStats) => {
        results.byPosition = positionStats;
        res.json(results);
      });
    });
  });
});

export default router;
