import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { setCredentials } from '../store/authSlice';
import api from '../services/api';

const Settings = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', { name, email }); // you'd need a profile update endpoint
      dispatch(setCredentials({ user: data, token: localStorage.getItem('token') }));
      setMessage('Profile updated successfully');
    } catch (err) {
      setMessage('Error updating profile');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <h1 className="mb-8 text-3xl font-bold">Profile & Preferences</h1>
      <div className="glass-panel p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          {message && <p className="text-sm text-green-400">{message}</p>}
        </form>
        <hr className="my-6 border-0 border-t border-white/10" />
        <Button variant="danger" onClick={logout}>
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Settings;