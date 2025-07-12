const { query } = require('../utils/dbPromise');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Helper to generate EMPXXX IDs
const generateNextEmployeeId = async () => {
  try {
    const result = await query(`
      SELECT employeeId FROM employees 
      WHERE employeeId REGEXP '^EMP[0-9]+$'
      ORDER BY CAST(SUBSTRING(employeeId, 4) AS UNSIGNED) DESC 
      LIMIT 1
    `);
    
    if (result.length === 0) {
      return 'EMP001';
    }
    
    const lastId = result[0].employeeId;
    const lastNumber = parseInt(lastId.substring(3));
    const nextNumber = lastNumber + 1;
    return `EMP${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    return 'EMP001';
  }
};

// All controller methods
module.exports = {
  getEmployees: async (req, res) => {
    try {
      const employees = await query(`
        SELECT 
          e.id,
          e.employeeId,
          e.name,
          e.email,
          e.office_id,
          e.position_id,
          e.monthlySalary,
          e.joiningDate,
          e.status,
          o.name AS office_name,
          p.title AS position_title,
          op.reporting_time,
          op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        ORDER BY e.employeeId
      `);
      res.json(employees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  },

  // Get next available employee ID
  getNextEmployeeId: async (req, res) => {
    try {
      const nextId = await generateNextEmployeeId();
      res.json({ nextEmployeeId: nextId });
    } catch (err) {
      console.error('Error generating next employee ID:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getOfficePositionData: async (req, res) => {
    try {
      const { officeId, positionId } = req.params;
      const result = await query(`
        SELECT reporting_time, duty_hours 
        FROM office_positions 
        WHERE office_id = ? AND position_id = ?
      `, [officeId, positionId]);
      
      if (result.length > 0) {
        res.json({
          reporting_time: result[0].reporting_time || 'Not set',
          duty_hours: result[0].duty_hours || 'Not set'
        });
      } else {
        res.json({
          reporting_time: 'Not set',
          duty_hours: 'Not set'
        });
      }
    } catch (err) {
      console.error('Error fetching office position data:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getEmployeeCount: async (req, res) => {
    try {
      const result = await query('SELECT COUNT(*) AS total FROM employees WHERE status = 1');
      res.json({ total: result[0].total });
    } catch (err) {
      console.error('Error fetching employee count:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getTotalMonthlySalary: async (req, res) => {
    try {
      const result = await query('SELECT SUM(monthlySalary) AS totalSalary FROM employees WHERE status = 1');
      res.json({ totalSalary: result[0].totalSalary || 0 });
    } catch (err) {
      console.error('Error fetching total salary:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getSummaryByOffice: async (req, res) => {
    try {
      const results = await query(`
        SELECT 
          o.id AS office_id, 
          o.name AS office,
          COALESCE(COUNT(e.id), 0) AS totalEmployees,
          COALESCE(SUM(e.monthlySalary), 0) AS totalSalary
        FROM offices o
        LEFT JOIN employees e ON o.id = e.office_id AND e.status = 1
        GROUP BY o.id, o.name
        ORDER BY o.name
      `);
      res.json(results);
    } catch (err) {
      console.error('Error fetching office summary:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getOfficeOptions: async (req, res) => {
    try {
      const results = await query('SELECT id, name FROM offices ORDER BY name');
      res.json(results);
    } catch (err) {
      console.error('Error fetching office options:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getPositionOptions: async (req, res) => {
    try {
      const results = await query('SELECT id, title FROM positions ORDER BY title');
      res.json(results);
    } catch (err) {
      console.error('Error fetching position options:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Get positions filtered by office
  getPositionsByOffice: async (req, res) => {
    try {
      const { officeId } = req.params;
      const results = await query(`
        SELECT DISTINCT p.id, p.title 
        FROM positions p
        INNER JOIN office_positions op ON p.id = op.position_id
        WHERE op.office_id = ?
        ORDER BY p.title
      `, [officeId]);
      res.json(results);
    } catch (err) {
      console.error('Error fetching positions by office:', err);
      res.status(500).json({ error: err.message });
    }
  },

  createEmployee: async (req, res) => {
    try {
      let { employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status } = req.body;
      
      // Auto-generate employee ID if not provided or empty
      if (!employeeId || employeeId.trim() === '') {
        employeeId = await generateNextEmployeeId();
      }
      
      const result = await query(`
        INSERT INTO employees 
        (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status ? 1 : 0]);

      // Fetch the created employee with office and position names
      const [newEmployee] = await query(`
        SELECT 
          e.*,
          o.name AS office_name,
          p.title AS position_title,
          op.reporting_time,
          op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [employeeId]);

      res.status(201).json(newEmployee);
    } catch (err) {
      console.error('Error creating employee:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Employee ID already exists' });
      }
      res.status(500).json({ error: err.message });
    }
  },

  getEmployeeById: async (req, res) => {
    try {
      const [employee] = await query(`
        SELECT 
          e.*,
          o.name AS office_name,
          p.title AS position_title,
          op.reporting_time,
          op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [req.params.employeeId]);

      if (employee) {
        res.json(employee);
      } else {
        res.status(404).json({ error: 'Employee not found' });
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const { name, email, office_id, position_id, monthlySalary, joiningDate, status } = req.body;
      
      const result = await query(`
        UPDATE employees SET
          name = ?, email = ?, office_id = ?, position_id = ?,
          monthlySalary = ?, joiningDate = ?, status = ?
        WHERE employeeId = ?
      `, [name, email, office_id, position_id, monthlySalary, joiningDate, status ? 1 : 0, req.params.employeeId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Fetch updated employee
      const [updatedEmployee] = await query(`
        SELECT 
          e.*,
          o.name AS office_name,
          p.title AS position_title,
          op.reporting_time,
          op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [req.params.employeeId]);

      res.json(updatedEmployee);
    } catch (err) {
      console.error('Error updating employee:', err);
      res.status(500).json({ error: err.message });
    }
  },

  deleteEmployee: async (req, res) => {
    try {
      const result = await query('DELETE FROM employees WHERE employeeId = ?', [req.params.employeeId]);
      if (result.affectedRows > 0) {
        res.json({ message: 'Employee deleted successfully' });
      } else {
        res.status(404).json({ error: 'Employee not found' });
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Export employees template
  exportEmployeesTemplate: async (req, res) => {
    try {
      const [offices, positions] = await Promise.all([
        query('SELECT id, name FROM offices ORDER BY name'),
        query('SELECT id, title FROM positions ORDER BY title')
      ]);

      // Create sample data with proper structure
      const sampleData = [{
        'Employee ID': 'EMP001',
        'Name': 'John Doe',
        'Email': 'john.doe@company.com',
        'Office ID': offices.length > 0 ? offices[0].id : 1,
        'Position ID': positions.length > 0 ? positions[0].id : 1,
        'Monthly Salary': 5000,
        'Joining Date': '2024-01-01',
        'Status': 'active'
      }];

      const workbook = XLSX.utils.book_new();
      
      // Main template sheet
      const templateSheet = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, templateSheet, 'Employee Template');
      
      // Office reference sheet
      const officeRefData = offices.map(office => ({
        'Office ID': office.id,
        'Office Name': office.name
      }));
      const officeSheet = XLSX.utils.json_to_sheet(officeRefData);
      XLSX.utils.book_append_sheet(workbook, officeSheet, 'Office Reference');
      
      // Position reference sheet
      const positionRefData = positions.map(position => ({
        'Position ID': position.id,
        'Position Title': position.title
      }));
      const positionSheet = XLSX.utils.json_to_sheet(positionRefData);
      XLSX.utils.book_append_sheet(workbook, positionSheet, 'Position Reference');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err) {
      console.error('Error creating template:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Export current employees
  exportEmployees: async (req, res) => {
    try {
      const employees = await query(`
        SELECT 
          e.employeeId as 'Employee ID',
          e.name as 'Name',
          e.email as 'Email',
          o.name as 'Office',
          p.title as 'Position',
          e.monthlySalary as 'Monthly Salary',
          e.joiningDate as 'Joining Date',
          CASE WHEN e.status = 1 THEN 'Active' ELSE 'Inactive' END as 'Status'
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        ORDER BY e.employeeId
      `);

      if (employees.length === 0) {
        return res.status(404).json({ error: 'No employees found to export' });
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(employees);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=employees_export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err) {
      console.error('Error exporting employees:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Import employees from Excel
  importEmployees: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = path.resolve(req.file.path);
    
    try {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      if (!Array.isArray(data) || data.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Invalid or empty Excel file' });
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of data) {
        try {
          let employeeId = row['Employee ID'];
          
          // Auto-generate ID if not provided
          if (!employeeId || employeeId.trim() === '') {
            employeeId = await generateNextEmployeeId();
          }

          await query(`
            INSERT INTO employees 
            (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              email = VALUES(email),
              office_id = VALUES(office_id),
              position_id = VALUES(position_id),
              monthlySalary = VALUES(monthlySalary),
              joiningDate = VALUES(joiningDate),
              status = VALUES(status)
          `, [
            employeeId,
            row['Name'] || '',
            row['Email'] || '',
            parseInt(row['Office ID']) || null,
            parseInt(row['Position ID']) || null,
            parseFloat(row['Monthly Salary']) || 0,
            row['Joining Date'] || new Date().toISOString().split('T')[0],
            row['Status']?.toLowerCase() === 'active' ? 1 : 0
          ]);
          
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Row ${successCount + errorCount}: ${error.message}`);
        }
      }

      fs.unlinkSync(filePath);
      
      res.json({
        message: `Import completed. ${successCount} employees processed successfully.`,
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // Limit error messages
      });
    } catch (err) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.error('Error importing employees:', err);
      res.status(500).json({ error: 'Failed to process the file: ' + err.message });
    }
  }
};