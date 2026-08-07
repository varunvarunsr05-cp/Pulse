import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from './States';

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-ink)] flex items-center justify-center">
        <LoadingState label="Checking session…" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
