import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        // Redirect to login but save the path they were trying to access
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // User is logged in but doesn't have the required role
        // members go to leaderboard, everyone else defaults to dashboard
        return <Navigate to={profile.role === 'member' ? "/leaderboard" : "/dashboard"} replace />;
    }

    return <>{children}</>;
};
