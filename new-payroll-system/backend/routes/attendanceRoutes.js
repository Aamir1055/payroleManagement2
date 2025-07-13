import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
// Use global.db instead of importing

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Upload attendance sheet
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
    const { EmployeeID, Date, PunchIn, PunchOut } = row;
    if (EmployeeID && Date) {
      // Calculate hours worked
      let hoursWorked = 0;
      if (PunchIn && PunchOut) {
        const punchInTime = new Date(`1970-01-01T${PunchIn}`);
        const punchOutTime = new Date(`1970-01-01T${PunchOut}`);
        hoursWorked = (punchOutTime - punchInTime) / (1000 * 60 * 60);
      }
      
      insertValues.push([EmployeeID, Date, PunchIn, PunchOut, hoursWorked]);
    }
  });

  // Bulk insert with ON DUPLICATE KEY UPDATE
  const query = `
    INSERT INTO attendance (employee_id, date, punch_in, punch_out, hours_worked) 
    VALUES ?
    ON DUPLICATE KEY UPDATE 
      punch_in = VALUES(punch_in),
      punch_out = VALUES(punch_out),
      hours_worked = VALUES(hours_worked),
      updated_at = CURRENT_TIMESTAMP
  `;

  global.db.query(query, [insertValues], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to upload attendance' });
    }
    res.json({ message: 'Attendance uploaded successfully' });
  });
});

// Get attendance by employee ID with pagination
router.get('/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const query = `
    SELECT * FROM attendance 
    WHERE employee_id = ? 
    ORDER BY date DESC 
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM attendance WHERE employee_id = ?
  `;

  global.db.query(countQuery, [employeeId], (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const total = countResult[0].total;
    
    global.db.query(query, [employeeId, limit, offset], (err, attendance) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        data: attendance,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    });
  });
});

// Get all attendance with pagination
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const { month, year, office_id } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (month && year) {
    whereClause += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?';
    params.push(month, year);
  }

  if (office_id) {
    whereClause += ' AND e.office_id = ?';
    params.push(office_id);
  }

  const query = `
    SELECT 
      a.*,
      e.name as employee_name,
      o.name as office_name,
      p.name as position_name
    FROM attendance a
    JOIN employees e ON a.employee_id = e.employee_id
    JOIN offices o ON e.office_id = o.id
    JOIN positions p ON e.position_id = p.id
    ${whereClause}
    ORDER BY a.date DESC, a.employee_id
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM attendance a
    JOIN employees e ON a.employee_id = e.employee_id
    ${whereClause}
  `;

  global.db.query(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const total = countResult[0].total;
    
    global.db.query(query, [...params, limit, offset], (err, attendance) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        data: attendance,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    });
  });
});

// Export attendance to Excel
router.get('/export/excel', (req, res) => {
  const { month, year, office_id } = req.query;
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (month && year) {
    whereClause += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?';
    params.push(month, year);
  }

  if (office_id) {
    whereClause += ' AND e.office_id = ?';
    params.push(office_id);
  }

  const query = `
    SELECT 
      a.employee_id AS 'Employee ID',
      e.name AS 'Employee Name',
      o.name AS 'Office',
      p.name AS 'Position',
      a.date AS 'Date',
      a.punch_in AS 'Punch In',
      a.punch_out AS 'Punch Out',
      a.hours_worked AS 'Hours Worked',
      a.status AS 'Status',
      CASE WHEN a.is_late = 1 THEN 'Yes' ELSE 'No' END AS 'Is Late'
    FROM attendance a
    JOIN employees e ON a.employee_id = e.employee_id
    JOIN offices o ON e.office_id = o.id
    JOIN positions p ON e.position_id = p.id
    ${whereClause}
    ORDER BY a.date DESC, a.employee_id
  `;

  global.db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to export attendance' });
    }

    const worksheet = xlsx.utils.json_to_sheet(results);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    const exportPath = path.join(__dirname, '..', 'exports', 'Attendance.xlsx');
    xlsx.writeFile(workbook, exportPath);

    res.download(exportPath, 'Attendance.xlsx');
  });
});

export default router;
