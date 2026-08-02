
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { WorkCalendar } from './pages/WorkCalendar';
import { Doctors } from './pages/Doctors';
import { DoctorSettings } from './pages/DoctorSettings';
import { UrgentAppointment } from './pages/UrgentAppointment';
import { NewAppointment } from './pages/NewAppointment';
import { Patients } from './pages/Patients';
import { PatientDetails } from './pages/PatientDetails';
import { Payments } from './pages/Payments';
import { AppointmentReasons } from './pages/AppointmentReasons';
import { SmsSettings } from './pages/SmsSettings';
import { Profile } from './pages/Profile';
import { Personalization } from './pages/Personalization';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Install } from './pages/Install';
import { Accounting } from './pages/Accounting';
import { InsuranceSettings } from './pages/InsuranceSettings';
import { Expenses } from './pages/Expenses';
import { ClinicSettings } from './pages/ClinicSettings';
import { RestoreCheckpoints } from './pages/RestoreCheckpoints';
import { AuditLog } from './pages/AuditLog';
import { Secretaries } from './pages/Secretaries';
import { DoctorVisit } from './pages/DoctorVisit';
import { Notifications } from './pages/Notifications';
import { Error401 } from './pages/Error401';
import { Error403 } from './pages/Error403';
import { Error404 } from './pages/Error404';
import { Error500 } from './pages/Error500';
import { Error503 } from './pages/Error503';
import { useAppSelector } from './hooks/redux';
import { Toaster } from 'react-hot-toast';

// Installation Guard
const InstallGuard = ({ children }: { children?: React.ReactNode }) => {
  const isInstalled = useAppSelector(state => state.auth.isInstalled);
  const location = useLocation();

  const publicInstallPaths = ['/install'];

  if (!isInstalled && !publicInstallPaths.includes(location.pathname)) {
    return <Navigate to="/install" replace />;
  }

  if (isInstalled && publicInstallPaths.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Protected Route Component
const ProtectedRoute = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const App = () => {
  return (
      <AuthProvider>
        <DataProvider>
          <Toaster 
            position="top-center" 
            reverseOrder={false}
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'Vazirmatn',
                fontSize: '14px',
                borderRadius: '12px',
                background: '#fff',
                color: '#334155',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              },
            }}
          />
          <HashRouter>
            <InstallGuard>
              <Routes>
                {/* Error Routes */}
                <Route path="/401" element={<Error401 />} />
                <Route path="/403" element={<Error403 />} />
                <Route path="/500" element={<Error500 />} />
                <Route path="/503" element={<Error503 />} />

                {/* Installation Routes */}
                <Route path="/install" element={<Install />} />

                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/today" element={<Appointments />} />
                  <Route path="/calendar" element={<WorkCalendar />} />
                  <Route path="/appointment/new" element={<NewAppointment />} />
                  <Route path="/appointment/urgent" element={<UrgentAppointment />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patients/:id" element={<PatientDetails />} />
                  <Route path="/doctor/visit" element={<DoctorVisit />} />
                  <Route path="/doctors" element={<Doctors />} />
                  <Route path="/doctor/settings" element={<DoctorSettings />} />
                  <Route path="/settings/doctors" element={<Doctors />} />
                  <Route path="/settings/secretaries" element={<Secretaries />} />
                  <Route path="/settings/reasons" element={<AppointmentReasons />} />
                  <Route path="/settings/insurance" element={<InsuranceSettings />} />
                  <Route path="/settings/sms" element={<SmsSettings />} />
                  <Route path="/settings/clinic" element={<ClinicSettings />} />
                  <Route path="/settings/restore" element={<RestoreCheckpoints />} />
                  <Route path="/settings/audit-log" element={<AuditLog />} />
                  <Route path="/settings/personalization" element={<Personalization />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/accounting" element={<Accounting />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                </Route>

                {/* Fallback to Custom 404 Page */}
                <Route path="*" element={<Error404 />} />
              </Routes>
            </InstallGuard>
          </HashRouter>
        </DataProvider>
      </AuthProvider>
  );
};

export default App;
