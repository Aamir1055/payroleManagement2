import express from 'express';
// Use global.db instead of importing

const router = express.Router();

// Calculate payroll for a specific month
router.post('/calculate/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const { officeId } = req.body;

  // Get working days for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  let sundays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) sundays++;
  }

  // Get holidays for the month
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;

  const holidayQuery = `
    SELECT COUNT(*) as holiday_count
    FROM holidays
    WHERE date >= ? AND date <= ?
    AND (office_id = ? OR office_id IS NULL)
  `;

  db.get(holidayQuery, [startDate, endDate, officeId], (err, holidayResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const workingDays = daysInMonth - sundays - (holidayResult.holiday_count || 0);

    // Get employees for the office
    const employeeQuery = officeId 
      ? 'SELECT * FROM employees WHERE office_id = ? AND status = "active"'
      : 'SELECT * FROM employees WHERE status = "active"';

    const employeeParams = officeId ? [officeId] : [];

    db.all(employeeQuery, employeeParams, (err, employees) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const payrollData = [];

      employees.forEach(employee => {
        // Get attendance for the employee in the month
        const attendanceQuery = `
          SELECT 
            DATE(date) as date,
            punch_in,
            punch_out,
            hours_worked,
            status,
            is_late
          FROM attendance
          WHERE employee_id = ? AND date >= ? AND date <= ?
          ORDER BY date
        `;

        db.all(attendanceQuery, [employee.employee_id, startDate, endDate], (err, attendance) => {
          if (err) {
            console.error('Error fetching attendance:', err);
            return;
          }

          // Calculate attendance statistics
          let presentDays = 0;
          let halfDays = 0;
          let lateDays = 0;
          let absentDays = 0;

          const attendanceMap = {};
          attendance.forEach(record => {
            attendanceMap[record.date] = record;
          });

          // Check each working day
          for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month - 1, day);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Skip Sundays
            if (currentDate.getDay() === 0) continue;

            // Check if it's a holiday
            const holidayCheckQuery = `
              SELECT COUNT(*) as is_holiday
              FROM holidays
              WHERE date = ? AND (office_id = ? OR office_id IS NULL)
            `;

            db.get(holidayCheckQuery, [dateStr, employee.office_id], (err, holidayCheck) => {
              if (err) return;

              if (holidayCheck.is_holiday > 0) return; // Skip holidays

              const attendanceRecord = attendanceMap[dateStr];
              
              if (!attendanceRecord) {
                absentDays++;
              } else {
                const hoursWorked = attendanceRecord.hours_worked || 0;
                const dutyHours = employee.duty_hours || 8;

                if (hoursWorked >= dutyHours) {
                  presentDays++;
                } else if (hoursWorked < dutyHours / 2) {
                  absentDays++;
                } else {
                  halfDays++;
                }

                if (attendanceRecord.is_late) {
                  lateDays++;
                }
              }
            });
          }

          // Calculate salary after processing all days
          setTimeout(() => {
            const allowedLateDays = employee.allowed_late_days || 3;
            const excessLateDays = Math.max(0, lateDays - allowedLateDays);
            
            const monthlySalary = parseFloat(employee.monthly_salary);
            const perDaySalary = monthlySalary / workingDays;

            // Calculate deductions
            const lateDeduction = excessLateDays * 0.5 * perDaySalary;
            const halfDayDeduction = halfDays * 0.5 * perDaySalary;
            
            // Leave deduction logic
            let leaveDeduction = 0;
            const allowedLeaves = 2;
            if (absentDays <= allowedLeaves) {
              leaveDeduction = absentDays * perDaySalary;
            } else {
              leaveDeduction = 2 * perDaySalary + (absentDays - 2) * 2 * perDaySalary;
            }

            const totalDeduction = lateDeduction + halfDayDeduction + leaveDeduction;
            const netSalary = monthlySalary - totalDeduction;

            // Insert or update payroll record
            const payrollQuery = `
              INSERT OR REPLACE INTO payroll (
                employee_id, month, year, working_days, present_days, absent_days,
                half_days, late_days, excess_late_days, monthly_salary, per_day_salary,
                late_deduction, half_day_deduction, leave_deduction, total_deduction, net_salary
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(payrollQuery, [
              employee.employee_id, month, year, workingDays, presentDays, absentDays,
              halfDays, lateDays, excessLateDays, monthlySalary, perDaySalary,
              lateDeduction, halfDayDeduction, leaveDeduction, totalDeduction, netSalary
            ], function(err) {
              if (err) {
                console.error('Error inserting payroll:', err);
              }
            });

            payrollData.push({
              employee_id: employee.employee_id,
              name: employee.name,
              working_days: workingDays,
              present_days: presentDays,
              absent_days: absentDays,
              half_days: halfDays,
              late_days: lateDays,
              excess_late_days: excessLateDays,
              monthly_salary: monthlySalary,
              per_day_salary: perDaySalary,
              late_deduction: lateDeduction,
              half_day_deduction: halfDayDeduction,
              leave_deduction: leaveDeduction,
              total_deduction: totalDeduction,
              net_salary: netSalary
            });
          }, 100);
        });
      });

      // Return response after processing
      setTimeout(() => {
        res.json({
          message: 'Payroll calculated successfully',
          working_days: workingDays,
          total_employees: employees.length,
          data: payrollData
        });
      }, 500);
    });
  });
});

// Get payroll report for a specific month
router.get('/report/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const { officeId } = req.query;

  let query = `
    SELECT 
      p.*,
      e.name,
      e.email,
      o.name as office_name,
      pos.name as position_name
    FROM payroll p
    JOIN employees e ON p.employee_id = e.employee_id
    LEFT JOIN offices o ON e.office_id = o.id
    LEFT JOIN positions pos ON e.position_id = pos.id
    WHERE p.month = ? AND p.year = ?
  `;

  let params = [month, year];

  if (officeId) {
    query += ' AND e.office_id = ?';
    params.push(officeId);
  }

  query += ' ORDER BY e.name';

  db.all(query, params, (err, payrollData) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate summary statistics
    const summary = payrollData.reduce((acc, record) => {
      acc.totalEmployees++;
      acc.totalMonthlySalary += record.monthly_salary;
      acc.totalDeductions += record.total_deduction;
      acc.totalNetSalary += record.net_salary;
      acc.totalPresentDays += record.present_days;
      acc.totalAbsentDays += record.absent_days;
      acc.totalHalfDays += record.half_days;
      acc.totalLateDays += record.late_days;
      return acc;
    }, {
      totalEmployees: 0,
      totalMonthlySalary: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      totalPresentDays: 0,
      totalAbsentDays: 0,
      totalHalfDays: 0,
      totalLateDays: 0
    });

    res.json({
      summary,
      data: payrollData
    });
  });
});

// Get payroll summary by office
router.get('/summary/:year/:month', (req, res) => {
  const { year, month } = req.params;

  const query = `
    SELECT 
      o.name as office_name,
      COUNT(p.id) as employee_count,
      SUM(p.monthly_salary) as total_monthly_salary,
      SUM(p.total_deduction) as total_deductions,
      SUM(p.net_salary) as total_net_salary,
      AVG(p.present_days) as avg_present_days,
      SUM(p.absent_days) as total_absent_days,
      SUM(p.half_days) as total_half_days,
      SUM(p.late_days) as total_late_days
    FROM payroll p
    JOIN employees e ON p.employee_id = e.employee_id
    JOIN offices o ON e.office_id = o.id
    WHERE p.month = ? AND p.year = ?
    GROUP BY o.id, o.name
    ORDER BY o.name
  `;

  db.all(query, [month, year], (err, summary) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(summary);
  });
});

// Get employee payroll history
router.get('/employee/:employeeId/history', (req, res) => {
  const { employeeId } = req.params;

  const query = `
    SELECT 
      p.*,
      e.name,
      o.name as office_name
    FROM payroll p
    JOIN employees e ON p.employee_id = e.employee_id
    LEFT JOIN offices o ON e.office_id = o.id
    WHERE p.employee_id = ?
    ORDER BY p.year DESC, p.month DESC
  `;

  db.all(query, [employeeId], (err, history) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(history);
  });
});

export default router;
