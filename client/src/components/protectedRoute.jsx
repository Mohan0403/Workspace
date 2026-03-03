import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = () => {
  const { token, isLoading } = useSelector((state) => state.auth);

  if (isLoading) {
    return <div className="min-h-screen bg-[#0a0a0f] text-gray-300 flex items-center justify-center">Loading...</div>;
  }

  return token ? <Outlet /> : <Navigate to="/auth" />;
};

export default ProtectedRoute;