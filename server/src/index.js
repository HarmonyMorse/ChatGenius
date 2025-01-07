import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import channelRoutes from './routes/channels.js';
import userRoutes from './routes/users.js';
import { authenticateJWT } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/users', userRoutes);

// Protected route example
app.get('/api/protected', authenticateJWT, (req, res) => {
    res.json({ message: 'Protected route accessed successfully', user: req.user });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 