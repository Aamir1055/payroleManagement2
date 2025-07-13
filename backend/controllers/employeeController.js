const { query, beginTransaction, commitTransaction, rollbackTransaction } = require('../utils/dbPromise');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

module.exports = {
  // ===============================
  // 🔹 CRUD Operations
  // ===============================
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
          o.name AS office_name,
          p.title AS position_title,
          e.monthlySalary,
          e.joiningDate,
          e.status,
          op.reporting_time,
          op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        ORDER BY e.name
      `);
      res.json(employees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  },

  getEmployeeById: async (req, res) => {
    const { employeeId } = req.params;
    try {
      const result = await query(`
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
      
      if (result.length === 0) return res.status(404).json({ error: 'Employee not found' });
      res.json(result[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch employee' });
    }
  },

  createEmployee: async (req, res) => {
    try {
      const {
        employeeId,
        name,
        email,
        office_id,
        position_id,
        monthlySalary,
        joiningDate,
        status
      } = req.body;

      if (!employeeId || !name || !office_id || !position_id) {
        return res.status(400).json({ error: 'Missing required fields: employeeId, name, office_id, position_id' });
      }

      // Verify office and position exist and are linked
      const officePositionCheck = await query(`
        SELECT op.id, o.name as office_name, p.title as position_title
        FROM office_positions op
        JOIN offices o ON op.office_id = o.id
        JOIN positions p ON op.position_id = p.id
        WHERE op.office_id = ? AND op.position_id = ?
      `, [office_id, position_id]);

      if (officePositionCheck.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid office-position combination. This position is not available in the selected office.' 
        });
      }

      await query(`
        INSERT INTO employees (
          employeeId, name, email, office_id, position_id,
          monthlySalary, joiningDate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employeeId,
        name,
        email || null,
        office_id,
        position_id,
        monthlySalary,
        joiningDate,
        status ?? 1
      ]);

      res.status(201).json({ message: 'Employee created successfully' });

    } catch (error) {
      console.error('Error creating employee:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Employee ID already exists' });
      }
      res.status(500).json({ error: 'Failed to create employee' });
    }
  },

  updateEmployee: async (req, res) => {
    const { employeeId } = req.params;
    const { name, email, office_id, position_id, monthlySalary, joiningDate, status } = req.body;
    
    try {
      // If office_id and position_id are provided, verify they are linked
      if (office_id && position_id) {
        const officePositionCheck = await query(`
          SELECT op.id
          FROM office_positions op
          WHERE op.office_id = ? AND op.position_id = ?
        `, [office_id, position_id]);

        if (officePositionCheck.length === 0) {
          return res.status(400).json({ 
            error: 'Invalid office-position combination. This position is not available in the selected office.' 
          });
        }
      }

      await query(`
        UPDATE employees SET 
        name = ?, email = ?, office_id = ?, position_id = ?, 
        monthlySalary = ?, joiningDate = ?, status = ?
        WHERE employeeId = ?
      `, [name, email, office_id, position_id, monthlySalary, joiningDate, status, employeeId]);
      
      res.json({ message: 'Employee updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  },

  deleteEmployee: async (req, res) => {
    const { employeeId } = req.params;
    try {
      await query(`DELETE FROM employees WHERE employeeId = ?`, [employeeId]);
      res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  },

  // ===============================
  // 🔹 Office/Position Dropdowns
  // ===============================
  getOfficeOptions: async (req, res) => {
    try {
      const offices = await query(`SELECT id, name FROM offices ORDER BY name`);
      res.json(offices);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch office options' });
    }
  },

  getPositionOptions: async (req, res) => {
    try {
      const positions = await query(`SELECT id, title FROM positions ORDER BY title`);
      res.json(positions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch position options' });
    }
  },

  // Get positions available for a specific office
  getPositionsByOffice: async (req, res) => {
    const { officeId } = req.params;
    try {
      const positions = await query(`
        SELECT p.id, p.title, op.reporting_time, op.duty_hours
        FROM positions p
        JOIN office_positions op ON p.id = op.position_id
        WHERE op.office_id = ?
        ORDER BY p.title
      `, [officeId]);
      res.json(positions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch positions for office' });
    }
  },

  // Get office-position details (reporting time and duty hours)
  getOfficePositionDetails: async (req, res) => {
    const { officeId, positionId } = req.params;
    try {
      const details = await query(`
        SELECT 
          op.reporting_time,
          op.duty_hours,
          o.name as office_name,
          p.title as position_title
        FROM office_positions op
        JOIN offices o ON op.office_id = o.id
        JOIN positions p ON op.position_id = p.id
        WHERE op.office_id = ? AND op.position_id = ?
      `, [officeId, positionId]);
      
      if (details.length === 0) {
        return res.status(404).json({ error: 'Office-position combination not found' });
      }
      
      res.json(details[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch office-position details' });
    }
  },

  // ===============================
  // 🔹 Summary & Stats
  // ===============================
  getEmployeeCount: async (req, res) => {
    try {
      const result = await query(`SELECT COUNT(*) AS count FROM employees WHERE status = 1`);
      res.json(result[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch employee count' });
    }
  },

  getTotalMonthlySalary: async (req, res) => {
    try {
      const result = await query(`SELECT SUM(monthlySalary) AS totalSalary FROM employees WHERE status = 1`);
      res.json(result[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch total salary' });
    }
  },

  getSummaryByOffice: async (req, res) => {
    try {
      const summary = await query(`
        SELECT 
          o.id as office_id,
          o.name AS office,
          COUNT(e.id) AS totalEmployees,
          COALESCE(SUM(e.monthlySalary), 0) AS totalSalary
        FROM offices o
        LEFT JOIN employees e ON o.id = e.office_id AND e.status = 1
        GROUP BY o.id, o.name
        ORDER BY o.name
      `);
      res.json(summary);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  },

  // Generate next employee ID
  getNextEmployeeId: async (req, res) => {
    try {
      const result = await query(`
        SELECT employeeId 
        FROM employees 
        WHERE employeeId REGEXP '^EMP[0-9]+$' 
        ORDER BY CAST(SUBSTRING(employeeId, 4) AS UNSIGNED) DESC 
        LIMIT 1
      `);

      let nextNumber = 1;
      if (result.length > 0) {
        const lastNumber = parseInt(result[0].employeeId.substring(3));
        nextNumber = lastNumber + 1;
      }
      res.json({ nextEmployeeId: `EMP${nextNumber.toString().padStart(3, '0')}` });
    } catch (err) {
      console.error('Error generating next employee ID:', err);
      res.status(500).json({ error: 'Failed to generate employee ID' });
    }
  },

  // ===============================
  // 🔹 Excel Export/Import
  // ===============================
  exportEmployeesTemplate: async (req, res) => {
    try {
      const [offices, positions] = await Promise.all([
        query('SELECT id, name FROM offices ORDER BY name'),
        query('SELECT id, title FROM positions ORDER BY title')
      ]);

      const workbook = XLSX.utils.book_new();

      const templateData = [{
        'Employee ID': '',
        'Name': 'John Doe',
        'Email': 'john.doe@example.com',
        'Office': offices[0]?.name || 'Head Office',
        'Position': positions[0]?.title || 'Software Developer',
        'Monthly Salary': 5000,
        'Joining Date': new Date().toISOString().split('T')[0],
        'Status': 'Active'
      }];

      const templateSheet = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(workbook, templateSheet, 'Employee Template');

      const officeSheet = XLSX.utils.json_to_sheet(offices.map(o => ({ 'Office ID': o.id, 'Office Name': o.name })));
      XLSX.utils.book_append_sheet(workbook, officeSheet, 'Office Reference');

      const positionSheet = XLSX.utils.json_to_sheet(positions.map(p => ({ 'Position ID': p.id, 'Position Title': p.title })));
      XLSX.utils.book_append_sheet(workbook, positionSheet, 'Position Reference');

      const instructionSheet = XLSX.utils.aoa_to_sheet([
        ['INSTRUCTIONS:'],
        ['1. Fill data in "Employee Template" sheet'],
        ['2. Employee ID will be auto-generated if left empty'],
        ['3. Use exact Office and Position names from reference sheets'],
        ['4. Status: Active or Inactive'],
        ['4. Dates in YYYY-MM-DD format'],
        ['5. Office and Position combination must exist in system'],
        ['6. All fields except Employee ID are required']
      ]);
      XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err) {
      console.error('Error creating template:', err);
      res.status(500).json({ error: err.message });
    }
  },

  exportEmployees: async (req, res) => {
    try {
      const employees = await query(`
        SELECT 
          e.employeeId AS 'Employee ID',
          e.name AS 'Name',
          e.email AS 'Email',
          o.name AS 'Office',
          p.title AS 'Position',
          e.monthlySalary AS 'Monthly Salary',
          e.joiningDate AS 'Joining Date',
          CASE WHEN e.status = 1 THEN 'Active' ELSE 'Inactive' END AS 'Status',
          op.reporting_time AS 'Reporting Time',
          op.duty_hours AS 'Duty Hours'
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        ORDER BY e.employeeId
      `);

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(employees);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', `attachment; filename=employees_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err) {
      console.error('Error exporting employees:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Generate next employee ID for auto-generation
  generateNextEmployeeId: async () => {
    try {
      const result = await query(`
        SELECT employeeId 
        FROM employees 
        WHERE employeeId REGEXP '^EMP[0-9]+$' 
        ORDER BY CAST(SUBSTRING(employeeId, 4) AS UNSIGNED) DESC 
        LIMIT 1
      `);

      let nextNumber = 1;
      if (result.length > 0) {
        const lastNumber = parseInt(result[0].employeeId.substring(3));
        nextNumber = lastNumber + 1;
      }
      return `EMP${nextNumber.toString().padStart(3, '0')}`;
    } catch (err) {
      throw new Error('Failed to generate employee ID');
    }
  },

  importEmployees: async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('employee')) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      const transaction = await beginTransaction();
      let successCount = 0;
      const errors = [];

      for (const [index, row] of data.entries()) {
        const rowNumber = index + 2;
        try {
          let empId = row['Employee ID'];
          const name = row['Name'];
          const email = row['Email'];
          const officeName = row['Office'];
          const positionName = row['Position'];
          const monthlySalary = parseFloat(row['Monthly Salary']) || 0;
          const joiningDate = row['Joining Date'] ? new Date(row['Joining Date']).toISOString().split('T')[0] : null;
          const statusText = row['Status'] || 'Active';
          const status = statusText.toLowerCase() === 'active' ? 1 : 0;

          if (!name || !officeName || !positionName) {
            throw new Error('Missing required fields: Name, Office, Position');
          }

          // Auto-generate employee ID if not provided
          if (!empId) {
            empId = await module.exports.generateNextEmployeeId();
          }

          // Get office ID
          const [office] = await query(`SELECT id FROM offices WHERE name = ?`, [officeName], transaction);
          if (!office) {
            throw new Error(`Office "${officeName}" not found`);
          }

          // Get position ID
          const [position] = await query(`SELECT id FROM positions WHERE title = ?`, [positionName], transaction);
          if (!position) {
            throw new Error(`Position "${positionName}" not found`);
          }

          const officeId = office.id;
          const positionId = position.id;

          // Verify office-position combination exists
          const officePositionCheck = await query(`
            SELECT id FROM office_positions WHERE office_id = ? AND position_id = ?
          `, [officeId, positionId], transaction);

          if (officePositionCheck.length === 0) {
            throw new Error(`Office "${officeName}" does not have position "${positionName}"`);
          }

          const [existing] = await query(`SELECT id FROM employees WHERE employeeId = ?`, [empId], transaction);

          if (existing) {
            await query(`
              UPDATE employees SET 
              name = ?, email = ?, office_id = ?, position_id = ?, 
              monthlySalary = ?, joiningDate = ?, status = ?, 
              updated_at = CURRENT_TIMESTAMP() 
              WHERE employeeId = ?
            `, [name, email, officeId, positionId, monthlySalary, joiningDate, status, empId], transaction);
          } else {
            await query(`
              INSERT INTO employees (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [empId, name, email, officeId, positionId, monthlySalary, joiningDate, status], transaction);
          }

          successCount++;
        } catch (error) {
          errors.push(`Row ${rowNumber}: ${error.message}`);
        }
      }

      await commitTransaction(transaction);
      fs.unlinkSync(filePath);
      res.json({ message: `Imported ${successCount} employees`, errors });
    } catch (err) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      console.error('Import failed:', err);
      res.status(500).json({ error: 'Failed to import employees', details: err.message });
    }
  }
};