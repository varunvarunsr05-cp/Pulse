import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { LoadingState, EmptyState, ErrorState } from '../../components/States';
import ScoreRing from '../../components/ScoreRing';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = [
  { value: 'critical', label: 'Critical', color: 'var(--color-blood)' },
  { value: 'high', label: 'High', color: 'var(--color-amber)' },
  { value: 'medium', label: 'Medium', color: 'var(--color-bone-dim)' },
  { value: 'low', label: 'Low', color: 'var(--color-bone-dim)' },
];

export default function HospitalDashboard({ profile }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const { requests } = await api.get('/api/requests');
      setRequests(requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  if (selectedRequest) {
    return (
      <MatchView
        request={selectedRequest}
        onBack={() => {
          setSelectedRequest(null);
          loadRequests();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl mb-1">Requests</h1>
          <p className="text-[var(--color-bone-dim)] text-sm">
            {profile?.hospital_name} — manage active and past blood requests
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-3 bg-[var(--color-blood)] hover:bg-[var(--color-blood-bright)] rounded-sm font-medium text-sm transition-colors whitespace-nowrap"
        >
          + New request
        </button>
      </div>

      {loading && <LoadingState label="Loading requests…" />}
      {!loading && error && <ErrorState message={error} onRetry={loadRequests} />}
      {!loading && !error && requests.length === 0 && (
        <EmptyState
          title="No requests yet"
          body="When you post an emergency blood request, it'll show up here with AI-ranked donor matches."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="text-sm px-4 py-2 bg-[var(--color-blood)] hover:bg-[var(--color-blood-bright)] rounded-sm transition-colors"
            >
              Post your first request
            </button>
          }
        />
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} onClick={() => setSelectedRequest(r)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <NewRequestModal
            onClose={() => setShowForm(false)}
            onCreated={(req) => {
              setShowForm(false);
              loadRequests();
              setSelectedRequest(req);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RequestCard({ request, onClick }) {
  const urgency = URGENCY_LEVELS.find((u) => u.value === request.urgency);
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-5 border border-[var(--color-ink-line)] hover:border-[var(--color-bone-dim)] rounded-sm transition-colors flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4">
        <span className="font-mono text-lg font-semibold w-14">{request.blood_group_needed}</span>
        <div>
          <p className="text-sm text-[var(--color-bone)]">
            {request.units_needed} unit{request.units_needed > 1 ? 's' : ''} needed
          </p>
          <p className="text-xs text-[var(--color-bone-dim)]">
            {new Date(request.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-mono uppercase px-2.5 py-1 rounded-sm border"
          style={{ color: urgency?.color, borderColor: urgency?.color }}
        >
          {urgency?.label}
        </span>
        <StatusPill status={request.status} />
      </div>
    </button>
  );
}

function StatusPill({ status }) {
  const styles = {
    open: 'text-[var(--color-amber)]',
    matched: 'text-[var(--color-sage)]',
    fulfilled: 'text-[var(--color-sage)]',
    cancelled: 'text-[var(--color-bone-dim)]',
    expired: 'text-[var(--color-bone-dim)]',
  };
  return (
    <span className={`text-xs font-mono capitalize ${styles[status] || ''}`}>{status}</span>
  );
}

function NewRequestModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    bloodGroupNeeded: '',
    unitsNeeded: 1,
    urgency: 'medium',
    patientCondition: '',
    notes: '',
  });
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError('Could not detect location. Try again or check browser permissions.');
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.bloodGroupNeeded) {
      setError('Select the blood group needed.');
      return;
    }
    if (!coords) {
      setError('Location is required so donors can be ranked by distance.');
      return;
    }
    setSubmitting(true);
    try {
      const { request } = await api.post('/api/requests', {
        ...form,
        unitsNeeded: Number(form.unitsNeeded),
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      onCreated(request);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-ink-raised)] border border-[var(--color-ink-line)] rounded-sm w-full max-w-lg p-7 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-[var(--font-display)] text-2xl mb-1">New blood request</h2>
        <p className="text-sm text-[var(--color-bone-dim)] mb-6">
          We'll rank every eligible donor nearby the moment this is posted.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--color-bone-dim)] mb-2">
              Blood group needed <span className="text-[var(--color-blood)]">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  type="button"
                  key={bg}
                  onClick={() => setForm((f) => ({ ...f, bloodGroupNeeded: bg }))}
                  className={`py-2 text-sm font-mono rounded-sm border transition-colors ${
                    form.bloodGroupNeeded === bg
                      ? 'border-[var(--color-blood)] bg-[var(--color-blood-dim)]'
                      : 'border-[var(--color-ink-line)] text-[var(--color-bone-dim)] hover:border-[var(--color-bone-dim)]'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--color-bone-dim)] mb-1.5">Units needed</label>
              <input
                type="number"
                min="1"
                value={form.unitsNeeded}
                onChange={(e) => setForm((f) => ({ ...f, unitsNeeded: e.target.value }))}
                className="w-full bg-[var(--color-ink)] border border-[var(--color-ink-line)] focus:border-[var(--color-blood)] rounded-sm px-3.5 py-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-bone-dim)] mb-1.5">Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
                className="w-full bg-[var(--color-ink)] border border-[var(--color-ink-line)] focus:border-[var(--color-blood)] rounded-sm px-3.5 py-2.5 text-sm outline-none"
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-bone-dim)] mb-1.5">
              Patient condition (optional)
            </label>
            <input
              type="text"
              value={form.patientCondition}
              onChange={(e) => setForm((f) => ({ ...f, patientCondition: e.target.value }))}
              placeholder="e.g. post-surgical, trauma"
              className="w-full bg-[var(--color-ink)] border border-[var(--color-ink-line)] focus:border-[var(--color-blood)] rounded-sm px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--color-bone-dim)]"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-bone-dim)] mb-1.5">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-[var(--color-ink)] border border-[var(--color-ink-line)] focus:border-[var(--color-blood)] rounded-sm px-3.5 py-2.5 text-sm outline-none resize-none"
            />
          </div>

          <div className="text-xs text-[var(--color-bone-dim)] flex items-center gap-2">
            {locating ? (
              'Detecting hospital location…'
            ) : coords ? (
              <span className="text-[var(--color-sage)]">✓ Location detected</span>
            ) : (
              <button type="button" onClick={detectLocation} className="underline">
                Retry location detection
              </button>
            )}
          </div>

          {error && (
            <div role="alert" className="text-sm text-[var(--color-blood-bright)] bg-[var(--color-blood-dim)] border border-[var(--color-blood)] rounded-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-[var(--color-ink-line)] hover:border-[var(--color-bone-dim)] rounded-sm text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[var(--color-blood)] hover:bg-[var(--color-blood-bright)] rounded-sm text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Posting…' : 'Post request'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function MatchView({ request, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get(`/api/requests/${request.id}/matches`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [request.id]);

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-[var(--color-bone-dim)] hover:text-[var(--color-bone)] mb-6 transition-colors"
      >
        ← Back to requests
      </button>

      <div className="flex items-center gap-4 mb-2">
        <span className="font-mono text-2xl font-semibold">{request.blood_group_needed}</span>
        <h1 className="font-[var(--font-display)] text-2xl">
          {request.units_needed} unit{request.units_needed > 1 ? 's' : ''} needed
        </h1>
      </div>
      <p className="text-sm text-[var(--color-bone-dim)] mb-8">
        Ranked by compatibility, distance, readiness, availability, and reliability
      </p>

      {loading && <LoadingState label="Running AI match…" />}
      {!loading && error && <ErrorState message={error} onRetry={loadMatches} />}

      {!loading && !error && data && (
        <>
          <div className="flex gap-6 mb-6 text-sm font-mono text-[var(--color-bone-dim)]">
            <span>{data.totalCandidates} candidates scanned</span>
            <span className="text-[var(--color-sage)]">{data.eligibleCount} eligible</span>
          </div>

          {data.matches.length === 0 && (
            <EmptyState
              title="No compatible donors found"
              body="No donors in the system match this blood type yet. Try again once more donors register."
            />
          )}

          <div className="space-y-3">
            {data.matches.map((m, i) => (
              <MatchCard
                key={m.donorId}
                match={m}
                rank={i + 1}
                expanded={expandedId === m.donorId}
                onToggle={() => setExpandedId(expandedId === m.donorId ? null : m.donorId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MatchCard({ match, rank, expanded, onToggle }) {
  if (!match.eligible) {
    return (
      <div className="p-5 border border-[var(--color-ink-line)] rounded-sm opacity-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-bone)]">{match.name}</p>
            <p className="text-xs text-[var(--color-bone-dim)] mt-1">
              {match.exclusionReasons?.join(' · ')}
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--color-bone-dim)] uppercase">Not eligible</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-ink-line)] rounded-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between gap-4 hover:bg-[var(--color-ink-raised)] transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-[var(--color-bone-dim)] w-6">#{rank}</span>
          <ScoreRing score={match.totalScore} />
          <div>
            <p className="text-sm text-[var(--color-bone)] font-medium">{match.name}</p>
            <p className="text-xs text-[var(--color-bone-dim)] font-mono">
              {match.bloodGroup} · {match.distanceKm} km away
            </p>
          </div>
        </div>
        <span className="text-xs text-[var(--color-bone-dim)]">{expanded ? '−' : '+'}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--color-ink-line)]"
          >
            <div className="p-5 grid sm:grid-cols-2 gap-3">
              {Object.entries(match.breakdown).map(([key, val]) => (
                <div key={key} className="flex justify-between items-baseline gap-2 text-sm">
                  <span className="text-[var(--color-bone-dim)] capitalize">{key}</span>
                  <span className="font-mono text-[var(--color-bone)] text-right">
                    {val.score}/{val.max}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-bone-dim)]">
              {Object.values(match.breakdown).map((v, i) => (
                <span key={i}>{v.detail}</span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
