import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
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
import FeaturesPage from './pages/FeaturesPage';
import IntegrationsPage from './pages/IntegrationsPage';
// Filename intentionally has no "cookie"/"cookies" substring: ad blockers
// (EasyList etc.) match any path containing those words and block the module
// fetch, which would crash the whole React tree on mount.
import CookiePolicy from './pages/LegalNotice';
import PrivacyPolicy from './pages/PrivacyPolicy';

/**
 * Wraps <ChatPage /> with a React `key` derived from the ?machine= URL param.
 * Changing machines forces a full remount so the chat-history and chat-session
 * hooks read from the new machine's localStorage namespace cleanly — no stale
 * sidebar entries or follow-up context bleeding across machines.
 *
 * Normalizes display names ("Injection Molding Machine") and slugs
 * ("INJECTION_MOLDING_MACHINE") to the same canonical key.
 */
const machineKeyFromParam = (param) =>
  (param || 'ALL').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();

const ChatRoute = () => {
  const [params] = useSearchParams();
  const machineKey = machineKeyFromParam(params.get('machine'));
  return <ChatPage key={machineKey} />;
};
// (machineKeyFromParam is intentionally not exported — keeping App.jsx
// component-only so Vite fast-refresh stays happy.)

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/"             element={<LandingPage />} />
          <Route path="/features"     element={<FeaturesPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/integration"  element={<IntegrationsPage />} />
          <Route path="/machines"     element={<MachinesPage />} />
          <Route path="/chat"         element={<ChatRoute />} />
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
