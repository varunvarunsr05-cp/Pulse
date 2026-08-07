import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import DashboardShell from '../components/DashboardShell';
import { LoadingState, ErrorState } from '../components/States';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ phone: '', address: '', city: '' });
  const [stats, setStats] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'donor') {
      api
        .get('/api/profiles/donor-stats')
        .then(setStats)
        .catch((err) => setError(err.message));
    }
  }, [profile?.role]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await api.patch('/api/profiles/me', form);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <DashboardShell>
        <LoadingState label="Loading profile…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-2xl">
        <h1 className="font-[var(--font-display)] text-3xl mb-1">Profile</h1>
        <p className="text-[var(--color-bone-dim)] text-sm mb-8">
          {profile.full_name || profile.hospital_name} · {profile.email}
        </p>

        {profile.role === 'donor' && stats && (
          <div className="grid grid-cols-3 gap-px bg-[var(--color-ink-line)] border border-[var(--color-ink-line)] mb-10">
            <Stat label="Donations" value={stats.totalDonations} />
            <Stat label="Units given" value={stats.totalUnits} />
            <Stat label="Lives impacted" value={stats.livesImpacted} accent />
          </div>
        )}

        {error && (
          <div className="mb-6">
            <ErrorState message={error} />
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--color-bone-dim)] mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full bg-[var(--color-ink-raised)] border border-[var(--color-ink-line)] focus:border-[var(--color-blood)] rounded-sm px-3.5 py-2.5 text-sm outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--color-bone-dim)] mb-1.5">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full bg-[var(--color-ink-raised)] border border-[var(--color-ink-line)] focus:border-[var(--color-blood)] rounded-sm px-3.5 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-bone-dim)] mb-1.5">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full bg-[var(--color-ink-raised)] border border-[var(--color-ink-line)] focus:border-[var(--color-blood)] rounded-sm px-3.5 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[var(--color-blood)] hover:bg-[var(--color-blood-bright)] rounded-sm text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-[var(--color-ink)] p-6">
      <p
        className="font-mono text-3xl mb-1"
        style={{ color: accent ? 'var(--color-blood)' : 'var(--color-bone)' }}
      >
        {value}
      </p>
      <p className="text-xs text-[var(--color-bone-dim)] uppercase tracking-wide">{label}</p>
    </div>
  );
}
