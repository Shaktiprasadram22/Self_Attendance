const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { connectWithRetry, createDatabaseHandlers } = require('./lib/database');

dotenv.config();
require('./lib/authConfig');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

connectWithRetry(mongoose, MONGO_URI);
const database = createDatabaseHandlers(mongoose.connection);

app.get('/', (req, res) => {
  res.send('Self Attendance API is running');
});

const attendanceRoutes = require('./routes/attendanceRoutes');
app.get('/api/attendance/health', database.healthCheck);
app.use('/api', database.requireDatabase);
app.use('/api/attendance', attendanceRoutes);
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
const subjectRoutes = require('./routes/subjectRoutes');
app.use('/api/subjects', subjectRoutes);
const todoRoutes = require('./routes/todoRoutes');
app.use('/api/todos', todoRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
