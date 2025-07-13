const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ 
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (validMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Employee data routes
router.get('/', employeeController.getEmployees);
router.get('/count', employeeController.getEmployeeCount);
router.get('/salary/total', employeeController.getTotalMonthlySalary);
router.get('/summary-by-office', employeeController.getSummaryByOffice);

// Office/position dropdown options
router.get('/offices/options', employeeController.getOfficeOptions);
router.get('/positions/options', employeeController.getPositionOptions);
router.get('/positions/by-office/:officeId', employeeController.getPositionsByOffice);
router.get('/office-position-details/:officeId/:positionId', employeeController.getOfficePositionDetails);

// Employee CRUD operations
router.post('/', employeeController.createEmployee);
router.get('/:employeeId', employeeController.getEmployeeById);
router.put('/:employeeId', employeeController.updateEmployee);
router.delete('/:employeeId', employeeController.deleteEmployee);

// Import/export routes
router.get('/template/download', employeeController.exportEmployeesTemplate);
router.get('/export', employeeController.exportEmployees);
router.post('/import', upload.single('file'), employeeController.importEmployees);

// Error handling middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      error: 'File upload error',
      details: err.message 
    });
  }
  next(err);
});

module.exports = router;