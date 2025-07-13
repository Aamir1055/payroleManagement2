import express from 'express';
// Use global.db instead of importing

const router = express.Router();

// Get all holidays
router.get('/', (req, res) => {
  const query = `
    SELECT 
      h.*,
      o.name as office_name
    FROM holidays h
    LEFT JOIN offices o ON h.office_id = o.id
    ORDER BY h.date DESC
  `;

  db.all(query, (err, holidays) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(holidays);
  });
});

// Get holidays by office
router.get('/office/:officeId', (req, res) => {
  const { officeId } = req.params;

  const query = `
    SELECT 
      h.*,
      o.name as office_name
    FROM holidays h
    LEFT JOIN offices o ON h.office_id = o.id
    WHERE h.office_id = ? OR h.office_id IS NULL
    ORDER BY h.date DESC
  `;

  db.all(query, [officeId], (err, holidays) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(holidays);
  });
});

// Get working days for a month
router.get('/working-days/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const { officeId } = req.query;

  // Get total days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Calculate Sundays
  let sundays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) { // Sunday
      sundays++;
    }
  }

  // Get holidays for the month
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;

  const query = `
    SELECT COUNT(*) as holiday_count
    FROM holidays
    WHERE date >= ? AND date <= ?
    AND (office_id = ? OR office_id IS NULL)
  `;

  db.get(query, [startDate, endDate, officeId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const totalDays = daysInMonth;
    const holidayCount = result.holiday_count || 0;
    const workingDays = totalDays - sundays - holidayCount;

    res.json({
      totalDays,
      sundays,
      holidays: holidayCount,
      workingDays
    });
  });
});

// Create new holiday
router.post('/', (req, res) => {
  const { name, date, type, office_id } = req.body;

  // Validate required fields
  if (!name || !date) {
    return res.status(400).json({ error: 'Holiday name and date are required' });
  }

  // Check if holiday already exists for the same date and office
  const checkQuery = office_id 
    ? 'SELECT id FROM holidays WHERE date = ? AND office_id = ?'
    : 'SELECT id FROM holidays WHERE date = ? AND office_id IS NULL';

  const checkParams = office_id ? [date, office_id] : [date];

  db.get(checkQuery, checkParams, (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (existing) {
      return res.status(400).json({ error: 'Holiday already exists for this date' });
    }

    // Insert new holiday
    const query = `
      INSERT INTO holidays (name, date, type, office_id) 
      VALUES (?, ?, ?, ?)
    `;

    db.run(
      query,
      [name, date, type || 'company', office_id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create holiday' });
        }

        // Fetch the created holiday with office info
        const fetchQuery = `
          SELECT 
            h.*,
            o.name as office_name
          FROM holidays h
          LEFT JOIN offices o ON h.office_id = o.id
          WHERE h.id = ?
        `;

        db.get(fetchQuery, [this.lastID], (err, holiday) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.status(201).json(holiday);
        });
      }
    );
  });
});

// Update holiday
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, date, type, office_id } = req.body;

  // Validate required fields
  if (!name || !date) {
    return res.status(400).json({ error: 'Holiday name and date are required' });
  }

  const query = `
    UPDATE holidays SET 
      name = ?, date = ?, type = ?, office_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(
    query,
    [name, date, type, office_id, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update holiday' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Holiday not found' });
      }

      // Fetch updated holiday with office info
      const fetchQuery = `
        SELECT 
          h.*,
          o.name as office_name
        FROM holidays h
        LEFT JOIN offices o ON h.office_id = o.id
        WHERE h.id = ?
      `;

      db.get(fetchQuery, [id], (err, holiday) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(holiday);
      });
    }
  );
});

// Delete holiday
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM holidays WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete holiday' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json({ message: 'Holiday deleted successfully' });
  });
});

export default router;
