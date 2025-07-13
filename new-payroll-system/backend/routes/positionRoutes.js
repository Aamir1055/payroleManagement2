import express from 'express';
import { db } from '../server.js';

const router = express.Router();

// Get all positions
router.get('/', (req, res) => {
  const query = `
    SELECT 
      p.*,
      o.name as office_name,
      COUNT(e.id) as employee_count
    FROM positions p
    LEFT JOIN offices o ON p.office_id = o.id
    LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
    GROUP BY p.id, p.name, p.description, p.office_id, p.created_at, p.updated_at, o.name
    ORDER BY o.name, p.created_at DESC
  `;

  db.all(query, (err, positions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(positions);
  });
});

// Get positions by office
router.get('/office/:officeId', (req, res) => {
  const { officeId } = req.params;

  const query = `
    SELECT 
      p.*,
      o.name as office_name,
      COUNT(e.id) as employee_count
    FROM positions p
    LEFT JOIN offices o ON p.office_id = o.id
    LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
    WHERE p.office_id = ?
    GROUP BY p.id, p.name, p.description, p.office_id, p.created_at, p.updated_at, o.name
    ORDER BY p.created_at DESC
  `;

  db.all(query, [officeId], (err, positions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(positions);
  });
});

// Get position by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      p.*,
      o.name as office_name,
      COUNT(e.id) as employee_count
    FROM positions p
    LEFT JOIN offices o ON p.office_id = o.id
    LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
    WHERE p.id = ?
    GROUP BY p.id, p.name, p.description, p.office_id, p.created_at, p.updated_at, o.name
  `;

  db.get(query, [id], (err, position) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    res.json(position);
  });
});

// Create new position
router.post('/', (req, res) => {
  const { name, office_id, description } = req.body;

  // Validate required fields
  if (!name || !office_id) {
    return res.status(400).json({ error: 'Position name and office are required' });
  }

  // Check if position already exists in the office
  db.get('SELECT id FROM positions WHERE name = ? AND office_id = ?', [name, office_id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existing) {
      return res.status(400).json({ error: 'Position already exists in this office' });
    }

    // Insert new position
    const query = `
      INSERT INTO positions (name, office_id, description) 
      VALUES (?, ?, ?)
    `;

    db.run(
      query,
      [name, office_id, description],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create position' });
        }

        // Fetch the created position with office info
        const fetchQuery = `
          SELECT 
            p.*,
            o.name as office_name,
            COUNT(e.id) as employee_count
          FROM positions p
          LEFT JOIN offices o ON p.office_id = o.id
          LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
          WHERE p.id = ?
          GROUP BY p.id, p.name, p.description, p.office_id, p.created_at, p.updated_at, o.name
        `;

        db.get(fetchQuery, [this.lastID], (err, position) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.status(201).json(position);
        });
      }
    );
  });
});

// Update position
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, office_id, description } = req.body;

  // Validate required fields
  if (!name || !office_id) {
    return res.status(400).json({ error: 'Position name and office are required' });
  }

  // Check if position already exists in the office (excluding current position)
  db.get('SELECT id FROM positions WHERE name = ? AND office_id = ? AND id != ?', [name, office_id, id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existing) {
      return res.status(400).json({ error: 'Position already exists in this office' });
    }

    const query = `
      UPDATE positions SET 
        name = ?, office_id = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(
      query,
      [name, office_id, description, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update position' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Position not found' });
        }

        // Fetch updated position with office info
        const fetchQuery = `
          SELECT 
            p.*,
            o.name as office_name,
            COUNT(e.id) as employee_count
          FROM positions p
          LEFT JOIN offices o ON p.office_id = o.id
          LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
          WHERE p.id = ?
          GROUP BY p.id, p.name, p.description, p.office_id, p.created_at, p.updated_at, o.name
        `;

        db.get(fetchQuery, [id], (err, position) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json(position);
        });
      }
    );
  });
});

// Delete position
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Check if position has employees
  db.get('SELECT COUNT(*) as count FROM employees WHERE position_id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete position with existing employees' });
    }

    // Delete position
    db.run('DELETE FROM positions WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete position' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Position not found' });
      }

      res.json({ message: 'Position deleted successfully' });
    });
  });
});

// Get position employees
router.get('/:id/employees', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      e.*,
      o.name as office_name
    FROM employees e
    LEFT JOIN offices o ON e.office_id = o.id
    WHERE e.position_id = ? AND e.status = 'active'
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
