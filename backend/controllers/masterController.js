const { query } = require('../utils/dbPromise');

// ================ OFFICE CONTROLLERS ================

exports.getAllOffices = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        o.id as office_id,
        o.name as office_name,
        o.location,
        COALESCE(emp_summary.employeeCount, 0) as employeeCount,
        COALESCE(emp_summary.totalSalary, 0) as totalSalary,
        o.created_at
      FROM offices o
      LEFT JOIN (
        SELECT 
          office_id, 
          COUNT(*) AS employeeCount, 
          SUM(monthlySalary) AS totalSalary 
        FROM employees 
        WHERE status = 1
        GROUP BY office_id
      ) emp_summary ON o.id = emp_summary.office_id
      ORDER BY o.name
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching offices:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createOffice = async (req, res) => {
  try {
    const { name, location } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Office name is required' });
    }
    
    const result = await query(
      'INSERT INTO offices (name, location) VALUES (?, ?)', 
      [name, location || '']
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      location: location || '',
      message: 'Office created successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Office name already exists' });
    }
    console.error('Error creating office:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createOfficeWithPositions = async (req, res) => {
  try {
    const { officeName, location, positions } = req.body;
    
    if (!officeName) {
      return res.status(400).json({ error: 'Office name is required' });
    }

    const officeResult = await query(
      'INSERT INTO offices (name, location) VALUES (?, ?)', 
      [officeName, location || '']
    );

    res.status(201).json({
      message: 'Office created successfully',
      officeId: officeResult.insertId,
      officeName,
      location: location || ''
    });
  } catch (err) {
    console.error('Error creating office with positions:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOfficePositions = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        o.id as office_id,
        o.name as office_name,
        o.location,
        p.id as position_id,
        p.title as position_name,
        op.reporting_time,
        op.duty_hours
      FROM offices o
      LEFT JOIN office_positions op ON o.id = op.office_id
      LEFT JOIN positions p ON op.position_id = p.id
      ORDER BY o.name, p.title
    `);
    
    const groupedData = {};
    results.forEach(row => {
      if (!groupedData[row.office_name]) {
        groupedData[row.office_name] = {
          office_id: row.office_id,
          office_name: row.office_name,
          location: row.location,
          positions: []
        };
      }
      
      if (row.position_name) {
        groupedData[row.office_name].positions.push({
          position_id: row.position_id,
          position_name: row.position_name,
          reporting_time: row.reporting_time,
          duty_hours: row.duty_hours
        });
      }
    });
    
    res.json(Object.values(groupedData));
  } catch (err) {
    console.error('Error fetching office positions:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOfficePositionDetails = async (req, res) => {
  try {
    const { officeId, positionId } = req.params;
    
    const results = await query(`
      SELECT 
        op.reporting_time,
        op.duty_hours,
        o.name as office_name,
        p.title as position_name
      FROM office_positions op
      JOIN offices o ON op.office_id = o.id
      JOIN positions p ON op.position_id = p.id
      WHERE op.office_id = ? AND op.position_id = ?
    `, [officeId, positionId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Office-Position combination not found' });
    }
    
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching office position details:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOfficeById = async (req, res) => {
  try {
    const { id } = req.params;
    const results = await query('SELECT * FROM offices WHERE id = ?', [id]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Office not found' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching office:', err);
    res.status(500).json({ error: err.message });
  }
};

// ================ POSITION CONTROLLERS ================

exports.getAllPositions = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        id as position_id,
        title as position_name,
        description
      FROM positions 
      ORDER BY title
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching positions:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createPosition = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Position title is required' });
    }
    
    const result = await query(
      'INSERT INTO positions (title, description) VALUES (?, ?)', 
      [title, description || '']
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      title, 
      description: description || '',
      message: 'Position created successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Position title already exists' });
    }
    console.error('Error creating position:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const result = await query(
      'UPDATE positions SET title = ?, description = ? WHERE id = ?',
      [title, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Position updated successfully'
    });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

exports.deletePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM positions WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Position not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Position deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

exports.createOfficeSpecificPosition = async (req, res) => {
  try {
    const { officeName, positionName, reportingTime, dutyHours } = req.body;
    
    if (!officeName || !positionName || !reportingTime || !dutyHours) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const officeResult = await query('SELECT id FROM offices WHERE name = ?', [officeName]);
    
    if (officeResult.length === 0) {
      return res.status(404).json({ error: 'Office not found' });
    }
    
    const officeId = officeResult[0].id;
    
    let posResult = await query('SELECT id FROM positions WHERE title = ?', [positionName]);
    let positionId;
    
    if (posResult.length > 0) {
      positionId = posResult[0].id;
    } else {
      const newPosResult = await query('INSERT INTO positions (title) VALUES (?)', [positionName]);
      positionId = newPosResult.insertId;
    }
    
    await query(`
      INSERT INTO office_positions (office_id, position_id, reporting_time, duty_hours)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      reporting_time = VALUES(reporting_time),
      duty_hours = VALUES(duty_hours)
    `, [officeId, positionId, reportingTime, dutyHours]);
    
    res.status(201).json({ 
      message: 'Office-Position relationship created/updated successfully',
      officeName,
      positionName,
      reportingTime,
      dutyHours
    });
  } catch (err) {
    console.error('Error creating office-specific position:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateOfficeSpecificPosition = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { officeName, positionName, reportingTime, dutyHours } = req.body;

    // 1. Verify office exists
    const [office] = await connection.query(
      'SELECT id FROM offices WHERE name = ? LIMIT 1', 
      [officeName]
    );
    if (!office) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Office not found' 
      });
    }

    // 2. Verify position exists or create it
    let [position] = await connection.query(
      'SELECT id FROM positions WHERE title = ? LIMIT 1', 
      [positionName]
    );
    
    if (!position) {
      const [result] = await connection.query(
        'INSERT INTO positions (title) VALUES (?)', 
        [positionName]
      );
      position = { id: result.insertId };
    }

    // 3. Check if the new relationship would create a duplicate
    const [existing] = await connection.query(
      `SELECT id FROM office_positions 
       WHERE office_id = ? AND position_id = ? AND id != ?`,
      [office.id, position.id, id]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'This office-position relationship already exists',
        existingId: existing[0].id
      });
    }

    // 4. Update the relationship
    const [result] = await connection.query(
      `UPDATE office_positions 
       SET office_id = ?,
           position_id = ?,
           reporting_time = ?,
           duty_hours = ?
       WHERE id = ?`,
      [office.id, position.id, reportingTime, dutyHours, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Office position relationship not found' 
      });
    }

    await connection.commit();
    
    res.status(200).json({ 
      success: true, 
      message: 'Office position updated successfully',
      data: {
        officeId: office.id,
        positionId: position.id,
        reportingTime,
        dutyHours
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating office position:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This office-position combination already exists',
        error: error.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

exports.deleteOfficePosition = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { officeId, positionId } = req.params;

    // First check if relationship exists
    const [existing] = await connection.query(
      'SELECT id FROM office_positions WHERE office_id = ? AND position_id = ?',
      [officeId, positionId]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Office-Position relationship not found' 
      });
    }

    // Delete the relationship
    const [result] = await connection.query(
      'DELETE FROM office_positions WHERE office_id = ? AND position_id = ?',
      [officeId, positionId]
    );

    await connection.commit();
    
    res.status(200).json({ 
      success: true,
      message: 'Office-Position relationship deleted successfully',
      deletedCount: result.affectedRows
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting office position:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete office position',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

exports.updateOfficePosition = async (req, res) => {
  try {
    const { officeId, positionId } = req.params;
    const { reportingTime, dutyHours } = req.body;

    const result = await query(
      `UPDATE office_positions 
       SET reporting_time = ?, duty_hours = ?
       WHERE office_id = ? AND position_id = ?`,
      [reportingTime, dutyHours, officeId, positionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Office position not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Office position updated successfully'
    });
  } catch (error) {
    console.error('Error updating office position:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// ================ DASHBOARD CONTROLLERS ================

exports.getDashboardSummary = async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        (SELECT COUNT(*) FROM offices) as totalOffices,
        (SELECT COUNT(*) FROM positions) as totalPositions,
        (SELECT COUNT(*) FROM employees WHERE status = 1) as totalEmployees,
        (SELECT COALESCE(SUM(monthlySalary), 0) FROM employees WHERE status = 1) as totalSalary
    `;
    
    const result = await query(summaryQuery);
    res.json(result[0]);
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: err.message });
  }
};