const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const ctvRoutes = require('./routes/ctv');
const agencyRoutes = require('./routes/agency');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:')) return callback(null, true);
    callback(new Error('Not allowed'));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/ctv', ctvRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`CCB Mart API running on http://localhost:${PORT}`);
});
