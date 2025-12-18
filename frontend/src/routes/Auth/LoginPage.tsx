import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import logo from '@/assets/logo.jpg';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        setError(response?.data?.message || 'Login failed. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="relative">
          {/* Subtle glow effect behind card */}
          <div className="pointer-events-none absolute -inset-[1px] rounded-[1.75rem] bg-gradient-to-r from-cube-red/20 via-cube-blue/20 to-cube-green/20 blur opacity-60" />
          
          <Card className="relative rounded-[1.75rem] border border-border/70 shadow-2xl backdrop-blur animate-scale-in">
            {/* Header Section */}
            <div className="text-center space-y-3 mb-8">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
                <img
                  src={logo}
                  alt="CubeIQ logo"
                  className="h-12 w-12 rounded-xl object-cover shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
                <p className="text-muted-foreground">
                  Sign in to continue solving cubes
                </p>
              </div>
            </div>


            {/* Form Section */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                loading={loading} 
                className="w-full mt-6"
              >
                Sign in
              </Button>
            </form>

            {/* Footer Section */}
            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link 
                  to="/signup" 
                  className="font-medium text-primary hover:underline transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </Card>
        </div>

        {/* Additional Info Card */}
        <Card className="mt-4 border border-border/50 bg-card/70 p-4 backdrop-blur">
          <p className="text-xs text-center text-muted-foreground">
            Secure login powered by industry-standard encryption
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;