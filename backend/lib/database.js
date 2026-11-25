const UNAVAILABLE = 'Your saved records are temporarily unavailable. Please try again shortly.';

// Mongoose reconnects after an established connection drops, but an initial
// connection failure needs a new attempt (for example, while Atlas is paused).
function connectWithRetry(mongoose, uri, {
  retryMs = 15000,
  schedule = setTimeout,
  cancel = clearTimeout,
  logger = console,
} = {}) {
  if (!uri) throw new Error('MONGO_URI must be configured.');
  let stopped = false;
  let timer;
  const connect = async () => {
    try {
      await mongoose.connect(uri, { dbName: 'self-attendance', serverSelectionTimeoutMS: 10000 });
      if (!stopped) logger.info('MongoDB connected');
    } catch {
      // Driver errors may include connection details. Keep credentials out of logs.
      if (!stopped) {
        logger.error('MongoDB unavailable; retrying connection in 15 seconds.');
        timer = schedule(connect, retryMs);
      }
    }
  };
  void connect();
  return () => {
    stopped = true;
    if (timer) cancel(timer);
  };
}

function createDatabaseHandlers(connection) {
  const unavailable = res => res.status(503).json({ ok: false, message: UNAVAILABLE });
  return {
    requireDatabase(req, res, next) {
      if (connection.readyState !== 1) return unavailable(res);
      return next();
    },
    async healthCheck(req, res) {
      if (connection.readyState !== 1) return unavailable(res);
      try {
        await connection.db.command({ ping: 1 }, { timeoutMS: 5000 });
        return res.json({ ok: true, message: 'Attendance database connected' });
      } catch {
        return unavailable(res);
      }
    },
  };
}

module.exports = { connectWithRetry, createDatabaseHandlers, UNAVAILABLE };
