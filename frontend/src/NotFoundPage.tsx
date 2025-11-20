import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="text-center max-w-md animate-scale-in">
        <div className="w-20 h-20 bg-gradient-to-br from-cube-red via-cube-blue to-cube-green rounded-2xl mx-auto mb-6 opacity-50 transform rotate-12"></div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
        <p className="text-slate-400 mb-8">
          Looks like this cube configuration doesn't exist
        </p>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Card>
    </div>
  );
};

export default NotFoundPage;