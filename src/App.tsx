import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { SubmissionForm } from './components/SubmissionForm';
import { Dashboard } from './components/Dashboard';
import { Leaderboard } from './components/Leaderboard';
import { ReportManager } from './components/ReportManager';
import { Login } from './components/Login';
import { InviteUser } from './components/InviteUser';
import { MemberDashboard } from './components/MemberDashboard';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

const AppContent = () => {
  const { user, profile } = useAuth();

  const defaultPath = profile?.role === 'member' ? '/member-dashboard' : '/dashboard';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans flex">
      {user && <Navigation />}
      <main className={`flex-1 ${user ? 'md:ml-36' : ''} px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-8`}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to={defaultPath} replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['Owner', 'manager']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/member-dashboard" element={
            <ProtectedRoute allowedRoles={['member']}>
              <MemberDashboard />
            </ProtectedRoute>
          } />

          <Route path="/invite" element={
            <ProtectedRoute allowedRoles={['Owner', 'manager']}>
              <InviteUser />
            </ProtectedRoute>
          } />

          <Route path="/leaderboard" element={
            <ProtectedRoute allowedRoles={['Owner', 'manager', 'member']}>
              <Leaderboard />
            </ProtectedRoute>
          } />

          <Route path="/submit" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <SubmissionForm />
            </ProtectedRoute>
          } />

          <Route path="/manage" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <ReportManager />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
