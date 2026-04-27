import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';

import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import HRDashboard from './pages/HR/HRDashboard';
import WorkerDashboard from './pages/Worker/WorkerDashboard';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser } = useData();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Permitir basado en keywords o coincidencia exacta
  if (allowedRole) {
    const role = currentUser.role.toLowerCase();
    const isAllowed = 
      (allowedRole === 'manager' && (role.includes('manager') || role === 'hsqe')) ||
      (allowedRole === 'hr' && role === 'rrhh') ||
      (role === allowedRole);

    if (!isAllowed) {
      // Redirigir a su propio dashboard si intenta entrar a uno prohibido
      let target = '/worker';
      if (role.includes('manager') || role === 'hsqe') target = '/manager';
      if (role === 'rrhh') target = '/hr';
      return <Navigate to={target} replace />;
    }
  }

  return children;
};

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-48px)] justify-center">
        <main className="flex-1 overflow-y-auto w-full bg-white px-6 py-5">
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
      <Route
        path="/worker"
        element={
          <ProtectedRoute allowedRole="worker">
            <WorkerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <DataProvider>
      <Router>
        <AppRoutes />
      </Router>
    </DataProvider>
  );
}

export default App;