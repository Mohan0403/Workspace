import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { connectSocket, disconnectSocket } from '../services/socketService';

export const useSocket = () => {
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      connectSocket(token);

      return () => {
        disconnectSocket();
      };
    } else {
      disconnectSocket();
    }
  }, [token]);
};