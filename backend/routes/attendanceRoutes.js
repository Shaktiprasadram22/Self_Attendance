const express = require('express');
const router = express.Router();
const { markAttendance, getAll, clearOne } = require('../controllers/attendanceController');
const auth = require('../middleware/auth');

router.use(auth);
router.post('/mark', markAttendance);
router.get('/all', getAll);
router.delete('/clear', clearOne);

module.exports = router;
