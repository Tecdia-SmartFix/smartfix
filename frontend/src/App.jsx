import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { MachineProvider } from './context/MachineContext';
import { AlertProvider } from './context/AlertContext';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import Navbar from './components/Navbar';
import BackgroundAnimation from './components/BackgroundAnimation';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import MachinesPage from './pages/MachinesPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/"             element={<LandingPage />} />
          <Route path="/machines"     element={<MachinesPage />} />
          <Route path="/chat"         element={<ChatPage />} />
          <Route path="/admin/login"  element={<AdminLogin />} />
          <Route path="/admin"        element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } />
        </Routes>
      </AnimatePresence>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <MachineProvider>
          <AlertProvider>
            <Router>
              <div className="min-h-screen relative transition-colors duration-500 text-tecdia-text"
                   style={{ background: 'linear-gradient(135deg, #89CFF3 0%, #A0E9FF 50%, #89CFF3 100%)' }}>
                <BackgroundAnimation />
                <div className="relative z-10">
                  <AnimatedRoutes />
                </div>
              </div>
            </Router>
          </AlertProvider>
        </MachineProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
