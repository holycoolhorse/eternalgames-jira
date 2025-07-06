import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // First use saved user data immediately
          const userData = JSON.parse(savedUser);
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: userData },
          });
          
          // Then verify with server in background
          try {
            const response = await api.get('/auth/me');
            // Update with fresh data from server
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: response.data,
            });
          } catch (error) {
            // If server verification fails, keep using saved user data
            console.log('Server verification failed, using saved user data:', error.message);
            // Don't logout, just keep using saved data
          }
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      console.log('🔐 Login attempt:', credentials);
      
      const baseURL = '/api';
      const fullURL = `${baseURL}/auth/login`;
      
      console.log('🌐 Making request to:', fullURL);
      
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      const data = await response.json();
      console.log('📋 Response data:', data);
      
      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, data);
        return {
          success: false,
          message: data.message || `HTTP ${response.status}`,
        };
      }
      
      const { token, user } = data;
      
      if (!token || !user) {
        console.error('❌ Invalid response format:', data);
        return {
          success: false,
          message: 'Invalid response from server',
        };
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });
      
      console.log('✅ Login successful, user stored:', user);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      
      return {
        success: false,
        message: error.message || 'Network error',
      };
    }
  };

  const register = async (userData) => {
    try {
      const baseURL = '/api';
      const fullURL = `${baseURL}/auth/register`;
      
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.message || `HTTP ${response.status}`,
        };
      }
      
      const { token, user } = data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Kayıt başarısız',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
    localStorage.setItem('user', JSON.stringify({ ...state.user, ...userData }));
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
