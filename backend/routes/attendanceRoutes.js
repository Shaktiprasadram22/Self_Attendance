const express = require('express');
const router = express.Router();
const { healthCheck, markAttendance, getAll, clearOne } = require('../controllers/attendanceController');
const auth = require('../middleware/auth');

router.get('/health', healthCheck);
router.use(auth);
router.post('/mark', markAttendance);
router.get('/all', getAll);
router.delete('/clear', clearOne);

module.exports = router;
