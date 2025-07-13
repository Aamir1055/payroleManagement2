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
          e.employeeId,
          e.name,
          e.email,
          o.name AS office,
          p.title AS position,
          e.monthlySalary,
          e.joiningDate,
          CASE WHEN e.status = 1 THEN 'Active' ELSE 'Inactive' END AS status
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
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
      const result = await query(`SELECT * FROM employees WHERE employeeId = ?`, [employeeId]);
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
      office,        // <-- Name of office
      position,      // <-- Title of position
      monthlySalary,
      joiningDate,
      status
    } = req.body;

    if (!employeeId || !name || !office || !position) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get office ID by name
    const [officeRow] = await query('SELECT id FROM offices WHERE name = ?', [office]);
    if (!officeRow) return res.status(400).json({ error: `Office not found: ${office}` });

    // Get position ID by title
    const [positionRow] = await query('SELECT id FROM positions WHERE title = ?', [position]);
    if (!positionRow) return res.status(400).json({ error: `Position not found: ${position}` });

    await query(`
      INSERT INTO employees (
        employeeId, name, email, office_id, position_id,
        monthlySalary, joiningDate, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employeeId,
      name,
      email || null,
      officeRow.id,
      positionRow.id,
      monthlySalary,
      joiningDate,
      status ?? 1
    ]);

    res.status(201).json({ message: 'Employee created successfully' });

  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
},
  updateEmployee: async (req, res) => {
    const { employeeId } = req.params;
    const { name, email, office_id, position_id, monthlySalary, joiningDate, status } = req.body;
    try {
      await query(`
        UPDATE employees SET 
        name = ?, email = ?, office_id = ?, position_id = ?, monthlySalary = ?, joiningDate = ?, status = ?
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

  getPositionsByOffice: async (req, res) => {
    const { officeId } = req.params;
    try {
      const positions = await query(`SELECT id, title FROM positions WHERE office_id = ?`, [officeId]);
      res.json(positions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  },

  // ===============================
  // 🔹 Summary & Stats
  // ===============================
  getOfficePositionData: async (req, res) => {
    const { officeId, positionId } = req.params;
    try {
      const data = await query(`
        SELECT e.name, e.email, e.monthlySalary 
        FROM employees e 
        WHERE e.office_id = ? AND e.position_id = ?
      `, [officeId, positionId]);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  },

  getEmployeeCount: async (req, res) => {
    try {
      const result = await query(`SELECT COUNT(*) AS count FROM employees`);
      res.json(result[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch employee count' });
    }
  },

  getTotalMonthlySalary: async (req, res) => {
    try {
      const result = await query(`SELECT SUM(monthlySalary) AS totalSalary FROM employees`);
      res.json(result[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch total salary' });
    }
  },

  getSummaryByOffice: async (req, res) => {
    try {
      const summary = await query(`
        SELECT o.name AS office, COUNT(e.id) AS employeeCount
        FROM employees e
        JOIN offices o ON e.office_id = o.id
        GROUP BY o.name
      `);
      res.json(summary);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch summary' });
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
        'Employee ID': 'EMP001',
        'Name': 'John Doe',
        'Email': 'john.doe@example.com',
        'Office': offices[0]?.name || 'Headquarters',
        'Position': positions[0]?.title || 'Manager',
        'Monthly Salary': 5000,
        'Joining Date': new Date().toISOString().split('T')[0],
        'Status': 'active'
      }];

      const templateSheet = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(workbook, templateSheet, 'Employee Template');

      const officeSheet = XLSX.utils.json_to_sheet(offices.map(o => ({ 'Valid Office Names': o.name })));
      XLSX.utils.book_append_sheet(workbook, officeSheet, 'Office Reference');

      const positionSheet = XLSX.utils.json_to_sheet(positions.map(p => ({ 'Valid Position Titles': p.title })));
      XLSX.utils.book_append_sheet(workbook, positionSheet, 'Position Reference');

      const instructionSheet = XLSX.utils.aoa_to_sheet([
        ['INSTRUCTIONS:'],
        ['1. Fill data in "Employee Template" sheet only'],
        ['2. Use exact office/position values from reference sheets'],
        ['3. Status must be "active" or "inactive"'],
        ['4. Dates in YYYY-MM-DD'],
        ['5. Employee ID must be unique']
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
          CASE WHEN e.status = 1 THEN 'Active' ELSE 'Inactive' END AS 'Status'
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
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

  importEmployees: async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('employee')) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      const [offices, positions] = await Promise.all([
        query('SELECT id, name FROM offices'),
        query('SELECT id, title FROM positions')
      ]);
      const officeMap = new Map(offices.map(o => [o.name.toLowerCase(), o.id]));
      const positionMap = new Map(positions.map(p => [p.title.toLowerCase(), p.id]));

      const transaction = await beginTransaction();
      let successCount = 0;
      const errors = [];

      for (const [index, row] of data.entries()) {
        const rowNumber = index + 2;
        try {
          const empId = row['Employee ID'];
          const name = row['Name'];
          const officeId = officeMap.get(String(row['Office']).toLowerCase());
          const positionId = positionMap.get(String(row['Position']).toLowerCase());
          const monthlySalary = parseFloat(row['Monthly Salary']) || 0;
          const joiningDate = row['Joining Date'] ? new Date(row['Joining Date']).toISOString().split('T')[0] : null;
          const status = String(row['Status'] || 'active').toLowerCase() === 'active' ? 1 : 0;

          if (!empId || !name || !officeId || !positionId) {
            throw new Error('Missing required fields');
          }

          const [existing] = await query(`SELECT id FROM employees WHERE employeeId = ?`, [empId], transaction);

          if (existing) {
            await query(`UPDATE employees SET name = ?, email = ?, office_id = ?, position_id = ?, monthlySalary = ?, joiningDate = ?, status = ?, updated_at = CURRENT_TIMESTAMP() WHERE employeeId = ?`, [name, row['Email'], officeId, positionId, monthlySalary, joiningDate, status, empId], transaction);
          } else {
            await query(`INSERT INTO employees (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [empId, name, row['Email'], officeId, positionId, monthlySalary, joiningDate, status], transaction);
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
