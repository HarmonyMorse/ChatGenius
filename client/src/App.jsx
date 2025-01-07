import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Chat from './components/Chat';
import { getUser, getToken } from './services/auth';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for stored user data and token on mount
    const storedUser = getUser();
    const token = getToken();
    if (storedUser && token) {
      setUser({ ...storedUser, token });
    }
  }, []);

  const handleLogin = ({ user, token }) => {
    setUser({ ...user, token });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/auth"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <Auth onLogin={handleLogin} />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            user ? (
              <Chat
                user={user}
                channelId="general" // TODO: Make this dynamic based on selected channel
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
