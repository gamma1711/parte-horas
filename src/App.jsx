import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MockDataProvider, useMockData } from './context/MockDataContext';

import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import WorkerDashboard from './pages/Worker/WorkerDashboard';
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import HRDashboard from './pages/HR/HRDashboard';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser } = useMockData();
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Permitir solo a los que tienen el rol, si se especifica
  if (allowedRole && currentUser.role !== allowedRole) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }
  
  return children;
};

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-slate-800 flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)] justify-center">
        <main className="flex-1 overflow-y-auto w-full bg-[#f3f4f6] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route 
        path="/worker" 
        element={
          <ProtectedRoute allowedRole="worker">
            <AppLayout>
              <WorkerDashboard />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manager" 
        element={
          <ProtectedRoute allowedRole="manager">
            <AppLayout>
              <ManagerDashboard />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/hr" 
        element={
          <ProtectedRoute allowedRole="hr">
            <AppLayout>
              <HRDashboard />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <MockDataProvider>
      <Router>
        <AppRoutes />
      </Router>
    </MockDataProvider>
  );
}

export default App;