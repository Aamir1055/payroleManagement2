const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Employee data routes
router.get('/', employeeController.getEmployees);
router.get('/next-id', employeeController.getNextEmployeeId);
router.get('/office-position/:officeId/:positionId', employeeController.getOfficePositionData);
router.get('/count', employeeController.getEmployeeCount);
router.get('/salary/total', employeeController.getTotalMonthlySalary);
router.get('/summary-by-office', employeeController.getSummaryByOffice);

// Office/position dropdown options
router.get('/offices/options', employeeController.getOfficeOptions);
router.get('/positions/options', employeeController.getPositionOptions);
router.get('/positions/by-office/:officeId', employeeController.getPositionsByOffice);

// Employee CRUD operations
router.post('/', employeeController.createEmployee);
router.get('/:employeeId', employeeController.getEmployeeById);
router.put('/:employeeId', employeeController.updateEmployee);
router.delete('/:employeeId', employeeController.deleteEmployee);

// Import/export routes
router.get('/template/download', employeeController.exportEmployeesTemplate);
router.get('/export', employeeController.exportEmployees);
router.post('/import', upload.single('file'), employeeController.importEmployees);

module.exports = router;