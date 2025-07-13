import express from 'express';
// Use global.db instead of importing

const router = express.Router();

// Get all offices
router.get('/', (req, res) => {
  const query = `
    SELECT 
      o.*,
      COUNT(e.id) as employee_count,
      SUM(e.monthly_salary) as total_salary
    FROM offices o
    LEFT JOIN employees e ON o.id = e.office_id AND e.status = 'active'
    GROUP BY o.id, o.name, o.location, o.reporting_time, o.duty_hours, o.created_at, o.updated_at
    ORDER BY o.created_at DESC
  `;

  db.all(query, (err, offices) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(offices);
  });
});

// Get office by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      o.*,
      COUNT(e.id) as employee_count,
      SUM(e.monthly_salary) as total_salary
    FROM offices o
    LEFT JOIN employees e ON o.id = e.office_id AND e.status = 'active'
    WHERE o.id = ?
    GROUP BY o.id, o.name, o.location, o.reporting_time, o.duty_hours, o.created_at, o.updated_at
  `;

  db.get(query, [id], (err, office) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!office) {
      return res.status(404).json({ error: 'Office not found' });
    }
    res.json(office);
  });
});

// Create new office
router.post('/', (req, res) => {
  const { name, location, reporting_time, duty_hours } = req.body;

  // Validate required fields
  if (!name) {
    return res.status(400).json({ error: 'Office name is required' });
  }

  // Check if office name already exists
  db.get('SELECT id FROM offices WHERE name = ?', [name], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existing) {
      return res.status(400).json({ error: 'Office name already exists' });
    }

    // Insert new office
    const query = `
      INSERT INTO offices (name, location, reporting_time, duty_hours) 
      VALUES (?, ?, ?, ?)
    `;

    db.run(
      query,
      [name, location, reporting_time || '09:00:00', duty_hours || 8],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create office' });
        }

        // Fetch the created office
        db.get('SELECT * FROM offices WHERE id = ?', [this.lastID], (err, office) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.status(201).json({
            ...office,
            employee_count: 0,
            total_salary: 0
          });
        });
      }
    );
  });
});

// Update office
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, location, reporting_time, duty_hours } = req.body;

  // Validate required fields
  if (!name) {
    return res.status(400).json({ error: 'Office name is required' });
  }

  // Check if office name already exists (excluding current office)
  db.get('SELECT id FROM offices WHERE name = ? AND id != ?', [name, id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existing) {
      return res.status(400).json({ error: 'Office name already exists' });
    }

    const query = `
      UPDATE offices SET 
        name = ?, location = ?, reporting_time = ?, duty_hours = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(
      query,
      [name, location, reporting_time, duty_hours, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update office' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Office not found' });
        }

        // Fetch updated office with employee count
        const fetchQuery = `
          SELECT 
            o.*,
            COUNT(e.id) as employee_count,
            SUM(e.monthly_salary) as total_salary
          FROM offices o
          LEFT JOIN employees e ON o.id = e.office_id AND e.status = 'active'
          WHERE o.id = ?
          GROUP BY o.id, o.name, o.location, o.reporting_time, o.duty_hours, o.created_at, o.updated_at
        `;

        db.get(fetchQuery, [id], (err, office) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json(office);
        });
      }
    );
  });
});

// Delete office
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Check if office has employees
  db.get('SELECT COUNT(*) as count FROM employees WHERE office_id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete office with existing employees' });
    }

    // Delete office
    db.run('DELETE FROM offices WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete office' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Office not found' });
      }

      res.json({ message: 'Office deleted successfully' });
    });
  });
});

// Get office positions
router.get('/:id/positions', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      p.*,
      COUNT(e.id) as employee_count
    FROM positions p
    LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
    WHERE p.office_id = ?
    GROUP BY p.id, p.name, p.description, p.created_at, p.updated_at
    ORDER BY p.created_at DESC
  `;

  db.all(query, [id], (err, positions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(positions);
  });
});

// Get office employees
router.get('/:id/employees', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      e.*,
      p.name as position_name
    FROM employees e
    LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.office_id = ? AND e.status = 'active'
    ORDER BY e.created_at DESC
  `;

  db.all(query, [id], (err, employees) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(employees);
  });
});

export default router;
