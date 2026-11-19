import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import RideHistory from './pages/RideHistory';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-primary-bg text-text-primary">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/passenger" element={
              <ProtectedRoute allowedRole="passenger">
                <PassengerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/driver" element={
              <ProtectedRoute allowedRole="driver">
                <DriverDashboard />
              </ProtectedRoute>
            } />

            <Route path="/history" element={
              <ProtectedRoute>
                <RideHistory />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
