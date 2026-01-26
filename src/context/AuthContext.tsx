import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type UserRole = 'Owner' | 'manager' | 'member';

interface Profile {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const initializedRef = { current: false };

        const handleAuthChange = async (event: string, session: any) => {
            if (!mounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                // If it's a new sign in or we haven't initialized the profile yet
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || !initializedRef.current) {
                    initializedRef.current = true;
                    setLoading(true);
                    await fetchProfile(currentUser.id);
                }
            } else {
                setProfile(null);
                setLoading(false);
                initializedRef.current = true;
            }
        };

        // Initialize with current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) {
                handleAuthChange('INITIAL_SESSION', session);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            handleAuthChange(event, session);
        });

        // Safety timeout: ensure loading is resolved even if everything else fails
        const timeout = setTimeout(() => {
            if (mounted) {
                setLoading(current => {
                    if (current) {
                        console.warn('Auth initialization timed out, forcing loading to false');
                        return false;
                    }
                    return false;
                });
            }
        }, 8000);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('Profile fetch error (ensure profiles table exists):', error.message);
                setProfile(null);
            } else {
                setProfile(data as Profile);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async () => {
        // We'll use OAuth or Email depending on Supabase setup. 
        // For now, providing a generic redirect-based sign-in trigger.
        // In a real flow, this would call supabase.auth.signInWithOAuth(...)
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
