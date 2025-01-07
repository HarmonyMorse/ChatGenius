import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Chat from './components/Chat';
import BrowseChannels from './pages/BrowseChannels';
import { getToken } from './services/auth';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/chat" replace />
            ) : (
              <Auth onAuthenticated={() => setIsAuthenticated(true)} />
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
      </Routes>
    </Router>
  );
}

export default App;
