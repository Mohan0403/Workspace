import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { setCredentials, logout, setLoading, setError, clearError } from '../store/authSlice';
import * as authService from '../services/authService';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isLoading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    const hydrateUser = async () => {
      if (!token || user) return;

      try {
        dispatch(setLoading(true));
        const { data } = await authService.getMe();
        dispatch(setCredentials({ user: data, token }));
      } catch (err) {
        dispatch(logout());
      } finally {
        dispatch(setLoading(false));
      }
    };

    hydrateUser();
  }, [token, user, dispatch]);

  const handleLogin = async (email, password) => {
    try {
      dispatch(clearError());
      dispatch(setLoading(true));
      const { data } = await authService.login({ email, password });
      dispatch(setCredentials({ user: data, token: data.token }));
      navigate('/dashboard');
    } catch (err) {
      dispatch(setError(err.response?.data?.message || 'Login failed'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleRegister = async (name, email, password) => {
    try {
      dispatch(clearError());
      dispatch(setLoading(true));
      const { data } = await authService.register({ name, email, password });
      dispatch(setCredentials({ user: data, token: data.token }));
      navigate('/dashboard');
    } catch (err) {
      dispatch(setError(err.response?.data?.message || 'Registration failed'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    dispatch(logout());
    navigate('/auth');
  };

  return {
    user,
    token,
    error,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearAuthError: () => dispatch(clearError()),
  };
};