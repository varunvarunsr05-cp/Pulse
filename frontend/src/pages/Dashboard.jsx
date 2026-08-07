import { useAuth } from '../context/AuthContext';
import DashboardShell from '../components/DashboardShell';
import { LoadingState } from '../components/States';
import DonorDashboard from './dashboard/DonorDashboard';
import HospitalDashboard from './dashboard/HospitalDashboard';

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <DashboardShell>
        <LoadingState label="Loading your dashboard…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {profile.role === 'hospital' ? (
        <HospitalDashboard profile={profile} />
      ) : (
        <DonorDashboard profile={profile} />
      )}
    </DashboardShell>
  );
}
