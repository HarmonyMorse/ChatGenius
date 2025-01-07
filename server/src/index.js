import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';
import { authenticateJWT } from './middleware/auth.js';
import MessageService from './services/messageService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);

// Protected route example
app.get('/api/protected', authenticateJWT, (req, res) => {
    res.json({ message: 'Protected route accessed successfully', user: req.user });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

// Initialize message service
const messageService = new MessageService(io);

// Socket middleware to authenticate connections
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    // Verify token using passport-jwt
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (err || !user) {
            return next(new Error('Authentication error'));
        }
        socket.user = user;
        next();
    })({ headers: { authorization: `Bearer ${token}` } });
});

// Socket connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.user.username);

    // Set up message handlers
    messageService.setupSocketHandlers(socket);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.username);
    });
}); 