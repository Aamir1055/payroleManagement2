const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// -------- DASHBOARD ROUTES --------
router.get('/dashboard-summary', masterController.getDashboardSummary);

// -------- OFFICE ROUTES --------
router.get('/offices', masterController.getAllOffices);
router.post('/offices', masterController.createOffice);
router.post('/offices-with-positions', masterController.createOfficeWithPositions);
router.get('/office-positions', masterController.getOfficePositions);
router.get('/office-position-details/:officeId/:positionId', masterController.getOfficePositionDetails);
router.get('/offices/:id', masterController.getOfficeById);

// -------- POSITION ROUTES --------
router.get('/positions', masterController.getAllPositions);
router.post('/positions', masterController.createPosition);
router.put('/positions/:id', masterController.updatePosition);
router.delete('/positions/:id', masterController.deletePosition);

// -------- OFFICE-POSITION ROUTES --------
router.post('/office-specific-position', masterController.createOfficeSpecificPosition);
router.put('/office-specific-position/:id', masterController.updateOfficeSpecificPosition);
router.put('/office-positions/:officeId/:positionId', masterController.updateOfficePosition);
router.delete('/office-positions/:officeId/:positionId', masterController.deleteOfficePosition);

module.exports = router;