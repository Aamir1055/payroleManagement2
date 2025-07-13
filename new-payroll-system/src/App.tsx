import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import OfficeMaster from './pages/OfficeMaster';
import PositionMaster from './pages/PositionMaster';
import AttendanceUpload from './pages/AttendanceUpload';
import AttendanceReport from './pages/AttendanceReport';
import PayrollReport from './pages/PayrollReport';
import HolidayMaster from './pages/HolidayMaster';
import EmployeeDetails from './pages/EmployeeDetails';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="employees" element={<EmployeeManagement />} />
              <Route path="employees/:id" element={<EmployeeDetails />} />
              <Route path="offices" element={<OfficeMaster />} />
              <Route path="positions" element={<PositionMaster />} />
              <Route path="attendance-upload" element={<AttendanceUpload />} />
              <Route path="attendance-report" element={<AttendanceReport />} />
              <Route path="payroll-report" element={<PayrollReport />} />
              <Route path="holidays" element={<HolidayMaster />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
