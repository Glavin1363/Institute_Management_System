import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbGetCurrentUser, dbLogout } from '../data/db';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = dbGetCurrentUser();
        setUser(currentUser);
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = () => {
        dbLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser: login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
