const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, { dbName: 'self-attendance' })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

app.get('/', (req, res) => {
  res.send('Self Attendance API is running');
});

const attendanceRoutes = require('./routes/attendanceRoutes');
app.use('/api/attendance', attendanceRoutes);
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
const subjectRoutes = require('./routes/subjectRoutes');
app.use('/api/subjects', subjectRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://192.168.1.105:${PORT}`);
});
