# ChatGenius

A real-time messaging application with AI-powered features for smarter workplace communication.

## Tech Stack

- **Frontend**: React with JavaScript, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: Clerk
- **Real-time Communication**: Socket.IO
- **Deployment**: AWS
- **Version Control**: GitHub

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB
- Clerk account for authentication
- AWS account for deployment

## Getting Started

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd chatgenius
   ```

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd client
   npm install

   # Install backend dependencies
   cd ../server
   npm install
   ```

3. Set up environment variables:
   Create `.env` files in both client and server directories with the necessary environment variables.

4. Start the development servers:
   ```bash
   # Start backend server
   cd server
   npm run dev

   # In a new terminal, start frontend
   cd client
   npm run dev
   ```

## Project Structure

```
chatgenius/
├── client/          # React frontend
├── server/          # Express backend
├── .gitignore
└── README.md
```

## Features

- Real-time messaging
- Channel and direct message support
- File sharing
- User presence indicators
- Thread support
- Emoji reactions
- AI-powered communication enhancements

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.