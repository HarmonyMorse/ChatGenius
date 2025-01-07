# ChatGenius Technical Specifications

## Overview
ChatGenius is a real-time chat application that enables users to communicate through channels and direct messages. The application uses Supabase for data storage and real-time communication, with a React frontend and Node.js/Express backend.

## Tech Stack
- Frontend: React (Vite)
- Backend: Node.js/Express
- Database: Supabase (PostgreSQL)
- Real-time: Supabase Realtime
- Authentication: Passport.js with JWT
- UI: Tailwind CSS

## Core Features

### Authentication
- User registration and login using Passport.js
- JWT-based authentication
- Protected routes and API endpoints
- Session management

### Real-time Communication
- Real-time message delivery using Supabase Realtime
- Message persistence in Supabase database
- Typing indicators
- Online/offline status
- Read receipts

### Channels
- Public and private channels
- Channel creation and management
- Channel membership and roles
- Channel search and discovery

### Direct Messages
- One-on-one messaging
- Group direct messages
- Message history
- User presence indicators

### Message Features
- Text messages with formatting
- File attachments
- Message editing and deletion
- Message reactions
- Message threading
- Message search
- Message pinning

### User Features
- User profiles
- Avatar customization
- Status messages
- User search
- User blocking
- User preferences

## Technical Implementation

### Database Schema
- Users table for user information
- Channels table for chat channels
- Messages table for chat messages
- Channel members table for channel membership
- Direct message rooms table
- Message reactions table
- User settings table

### Real-time Implementation
1. Message Broadcasting
   - Use Supabase Realtime for real-time message delivery
   - Subscribe to database changes for instant updates
   - Filter messages by channel/DM room
   - Handle message ordering and synchronization

2. Presence System
   - Track user online/offline status
   - Show typing indicators
   - Display read receipts
   - Update user presence in real-time

3. State Management
   - Use React state for UI updates
   - Maintain message cache
   - Handle optimistic updates
   - Manage connection state

### Security
- JWT authentication
- Input validation and sanitization
- Rate limiting
- Message encryption
- File upload validation
- SQL injection prevention

### Performance
- Message pagination
- Lazy loading
- Image optimization
- Caching strategies
- Connection pooling
- Database indexing

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/verify

### Users
- GET /api/users
- GET /api/users/:id
- PUT /api/users/:id
- DELETE /api/users/:id

### Channels
- GET /api/channels
- POST /api/channels
- GET /api/channels/:id
- PUT /api/channels/:id
- DELETE /api/channels/:id
- POST /api/channels/:id/members
- DELETE /api/channels/:id/members/:userId

### Messages
- GET /api/messages
- POST /api/messages
- PUT /api/messages/:id
- DELETE /api/messages/:id
- POST /api/messages/:id/reactions
- DELETE /api/messages/:id/reactions/:type

### Files
- POST /api/files/upload
- GET /api/files/:id
- DELETE /api/files/:id

## Frontend Structure
```
src/
├── components/
│   ├── Chat/
│   ├── Channels/
│   ├── Messages/
│   ├── Users/
│   └── common/
├── pages/
├── services/
├── hooks/
├── utils/
└── context/
```

## Backend Structure
```
src/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
└── utils/
```

## Deployment
- Frontend: Vercel
- Backend: AWS EC2
- Database: Supabase
- File Storage: AWS S3
- CDN: Cloudflare