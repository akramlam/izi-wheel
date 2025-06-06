import React, { useState } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShineBorder } from '../components/magicui/shine-border';

const RegisterSuper: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.register({ email, password, role: 'SUPER' });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 px-4">
        <div className="w-full max-w-sm sm:max-w-md bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center mb-4">
            <div className="relative h-24 w-24 sm:h-32 sm:w-32 mb-2">
              <ShineBorder borderWidth={3} shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} duration={10} />
              <img src="/loo.jpg" alt="Logo IziKADO" className="absolute inset-0 h-full w-full object-contain bg-white p-3 sm:p-4" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-indigo-700">Registration Successful</h1>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base text-green-600">Super user registered successfully! You can now log in.</p>
          <Button className="w-full py-2.5 sm:py-3 text-sm sm:text-base" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 px-4">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="flex flex-col items-center mb-4">
          <div className="relative h-24 w-24 sm:h-32 sm:w-32 mb-2">
            <ShineBorder borderWidth={3} shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} duration={10} />
            <img src="/loo.jpg" alt="Logo IziKADO" className="absolute inset-0 h-full w-full object-contain bg-white p-3 sm:p-4" />
          </div>
        </div>
        <div className="flex justify-center mb-4 sm:mb-6">
          <span className="text-base sm:text-lg font-semibold text-indigo-700">Super User Registration</span>
        </div>
        <div className="space-y-4">
          {error && (
            <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-3 sm:mb-4">
              <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:py-2.5 text-sm sm:text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="mb-4 sm:mb-6">
              <label className="mb-1.5 sm:mb-2 block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 sm:py-2.5 text-sm sm:text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full py-2.5 sm:py-3 text-sm sm:text-base">
              {loading ? 'Registering...' : 'Register as Super User'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterSuper; 