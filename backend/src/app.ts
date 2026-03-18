import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import assetRoutes from './routes/assets';
import operationRoutes from './routes/operations';
import dashboardRoutes from './routes/dashboard';
import configRoutes from './routes/config';
import logRoutes from './routes/logs';
import excelRoutes from './routes/excel';
import backupRoutes from './routes/backup';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/backup', backupRoutes);

app.use(express.static(path.join(__dirname, '../public')));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
