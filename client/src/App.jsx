import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import Auth from './pages/Auth';
import Chat from './components/Chat';
import './App.css';

function App() {
  const { isSignedIn } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/auth"
          element={
            isSignedIn ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/auth/signin" replace />
            )
          }
        />
        <Route
          path="/auth/*"
          element={
            isSignedIn ? (
              <Navigate to="/" replace />
            ) : (
              <SignedOut>
                <Auth />
              </SignedOut>
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            isSignedIn ? (
              <SignedIn>
                <Chat />
              </SignedIn>
            ) : (
              <Navigate to="/auth/signin" replace />
            )
          }
        />

        {/* Redirect all other routes to auth/signin when signed out, home when signed in */}
        <Route
          path="*"
          element={
            isSignedIn ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/auth/signin" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
