import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { LoadingState, EmptyState, ErrorState } from '../../components/States';
import { useAuth } from '../../context/AuthContext';

const URGENCY_STYLES = {
  critical: 'var(--color-blood)',
  high: 'var(--color-amber)',
  medium: 'var(--color-bone-dim)',
  low: 'var(--color-bone-dim)',
};

export default function DonorDashboard({ profile }) {
  const { refreshProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [myResponses, setMyResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [reqRes, respRes] = await Promise.all([
        api.get('/api/requests?status=open'),
        api.get('/api/responses/my'),
      ]);
      setRequests(reqRes.requests);
      setMyResponses(respRes.responses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAvailability = async () => {
    setTogglingAvailability(true);
    try {
      await api.patch('/api/profiles/me', { isAvailable: !profile.is_available });
      await refreshProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingAvailability(false);
    }
  };

  const respondTo = async (responseId, status) => {
    try {
      await api.patch(`/api/responses/${responseId}`, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const pendingResponses = myResponses.filter((r) => r.status === 'pending');
  const respondedIds = new Set(myResponses.map((r) => r.blood_requests?.id));

  return (
    <div>
      <div className="flex justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl mb-1">
            Hi, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-[var(--color-bone-dim)] text-sm font-mono">
            {profile?.blood_group} · {profile?.city || 'Location set'}
          </p>
        </div>
        <button
          onClick={toggleAvailability}
          disabled={togglingAvailability}
          className={`px-4 py-2.5 rounded-sm text-sm font-medium transition-colors whitespace-nowrap border ${
            profile?.is_available
              ? 'border-[var(--color-sage)] text-[var(--color-sage)]'
              : 'border-[var(--color-ink-line)] text-[var(--color-bone-dim)]'
          }`}
        >
          {profile?.is_available ? '● Available' : '○ Unavailable'}
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && pendingResponses.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-mono uppercase tracking-wider text-[var(--color-blood)] mb-4">
            You've been matched
          </h2>
          <div className="space-y-3">
            {pendingResponses.map((r) => (
              <div
                key={r.id}
                className="p-5 border border-[var(--color-blood)] bg-[var(--color-blood-dim)] rounded-sm"
              >
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-[var(--color-bone)] font-medium">
                      {r.blood_requests?.blood_group_needed} needed ·{' '}
                      {r.blood_requests?.units_needed} unit{r.blood_requests?.units_needed > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-[var(--color-bone-dim)] mt-1">
                      {r.blood_requests?.hospital_address || 'Hospital location on file'}
                    </p>
                    <p className="text-xs font-mono text-[var(--color-bone-dim)] mt-2">
                      Match score: {r.ai_match_score}/100
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondTo(r.id, 'declined')}
                      className="px-4 py-2 text-sm border border-[var(--color-ink-line)] hover:border-[var(--color-bone-dim)] rounded-sm transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => respondTo(r.id, 'accepted')}
                      className="px-4 py-2 text-sm bg-[var(--color-blood)] hover:bg-[var(--color-blood-bright)] rounded-sm transition-colors"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-mono uppercase tracking-wider text-[var(--color-bone-dim)] mb-4">
          Open requests near you
        </h2>

        {loading && <LoadingState label="Finding nearby requests…" />}

        {!loading && !error && requests.length === 0 && (
          <EmptyState
            title="No open requests right now"
            body="When a nearby hospital posts an emergency request matching your blood type, it'll appear here."
          />
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="p-5 border border-[var(--color-ink-line)] rounded-sm flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg font-semibold w-14">{r.blood_group_needed}</span>
                  <div>
                    <p className="text-sm text-[var(--color-bone)]">
                      {r.units_needed} unit{r.units_needed > 1 ? 's' : ''} needed
                      {respondedIds.has(r.id) && (
                        <span className="text-[var(--color-sage)] text-xs ml-2 font-mono">
                          already matched
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-bone-dim)]">
                      {r.distanceKm != null ? `${r.distanceKm} km away` : 'Distance unavailable'}
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs font-mono uppercase px-2.5 py-1 rounded-sm border"
                  style={{
                    color: URGENCY_STYLES[r.urgency],
                    borderColor: URGENCY_STYLES[r.urgency],
                  }}
                >
                  {r.urgency}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
