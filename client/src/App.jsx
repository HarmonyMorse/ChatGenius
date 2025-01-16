import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Chat from './components/Chat';
import BrowseChannels from './pages/BrowseChannels';
import RagChatPage from './pages/RagChatPage';
import PersonaChat from './components/PersonaChat';
import { getToken, logout } from './services/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return null;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/chat" replace />
            ) : (
              <Auth onLogin={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/chat"
          element={
            isAuthenticated ? (
              <Chat onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/browse-channels"
          element={
            isAuthenticated ? (
              <BrowseChannels />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/search"
          element={
            isAuthenticated ? (
              <RagChatPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/persona/:userId"
          element={
            isAuthenticated ? (
              <PersonaChat />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
