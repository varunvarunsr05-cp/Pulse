import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import PulseLine from '../components/PulseLine';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Auth({ mode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isRegister = mode === 'register';

  const [role, setRole] = useState(searchParams.get('role') === 'hospital' ? 'hospital' : 'donor');
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    bloodGroup: '',
    hospitalName: '',
    licenseNumber: '',
    dateOfBirth: '',
    weightKg: '',
    address: '',
    city: '',
  });
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('role') === 'hospital') setRole('hospital');
  }, [searchParams]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Location detection is not supported by your browser. Enter your address manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError('Could not detect location. You can still continue — add your address for context.');
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!coords) {
          setError('Please detect your location before continuing — it\'s how we match distance.');
          setLoading(false);
          return;
        }

        await api.post('/api/auth/register', {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role,
          phone: form.phone,
          bloodGroup: role === 'donor' ? form.bloodGroup : undefined,
          hospitalName: role === 'hospital' ? form.hospitalName : undefined,
          licenseNumber: role === 'hospital' ? form.licenseNumber : undefined,
          dateOfBirth: role === 'donor' ? form.dateOfBirth : undefined,
          weightKg: role === 'donor' && form.weightKg ? Number(form.weightKg) : undefined,
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: form.address,
          city: form.city,
        });

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInError) throw signInError;
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)] flex flex-col">
      <nav className="max-w-5xl mx-auto w-full px-6 py-6">
        <Link to="/" className="font-[var(--font-display)] text-lg tracking-tight">
          Pulse<span className="text-[var(--color-blood)]">.</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-start md:items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <h1 className="font-[var(--font-display)] text-3xl mb-2">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-[var(--color-bone-dim)] text-sm mb-8">
            {isRegister
              ? 'Takes about a minute. We use your location only to calculate distance.'
              : 'Log in to see requests near you.'}
          </p>

          {isRegister && (
            <div className="flex gap-2 mb-6" role="radiogroup" aria-label="Account type">
              <RoleTab active={role === 'donor'} onClick={() => setRole('donor')}>
                I'm a donor
              </RoleTab>
              <RoleTab active={role === 'hospital'} onClick={() => setRole('hospital')}>
                I'm a hospital
              </RoleTab>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isRegister && (
              <Field
                label={role === 'hospital' ? 'Hospital / facility name' : 'Full name'}
                value={role === 'hospital' ? form.hospitalName : form.fullName}
                onChange={(v) => updateField(role === 'hospital' ? 'hospitalName' : 'fullName', v)}
                required
              />
            )}

            {isRegister && role === 'hospital' && (
              <Field
                label="Contact person name"
                value={form.fullName}
                onChange={(v) => updateField('fullName', v)}
                required
              />
            )}

            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => updateField('email', v)}
              required
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => updateField('password', v)}
              required
              hint={isRegister ? 'At least 8 characters' : undefined}
            />

            {isRegister && (
              <Field
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(v) => updateField('phone', v)}
              />
            )}

            {isRegister && role === 'donor' && (
              <>
                <div>
                  <label className="block text-xs text-[var(--color-bone-dim)] mb-2">
                    Blood group <span className="text-[var(--color-blood)]">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_GROUPS.map((bg) => (
                      <button
                        type="button"
                        key={bg}
                        onClick={() => updateField('bloodGroup', bg)}
                        className={`py-2 text-sm font-mono rounded-sm border transition-colors ${
                          form.bloodGroup === bg
                            ? 'border-[var(--color-blood)] bg-[var(--color-blood-dim)] text-[var(--color-bone)]'
                            : 'border-[var(--color-ink-line)] text-[var(--color-bone-dim)] hover:border-[var(--color-bone-dim)]'
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Date of birth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(v) => updateField('dateOfBirth', v)}
                  />
                  <Field
                    label="Weight (kg)"
                    type="number"
                    value={form.weightKg}
                    onChange={(v) => updateField('weightKg', v)}
                  />
                </div>
              </>
            )}

            {isRegister && role === 'hospital' && (
              <Field
                label="License number"
                value={form.licenseNumber}
                onChange={(v) => updateField('licenseNumber', v)}
              />
            )}

            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Address"
                    value={form.address}
                    onChange={(v) => updateField('address', v)}
                  />
                  <Field label="City" value={form.city} onChange={(v) => updateField('city', v)} />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locating}
                    className="w-full py-2.5 border border-[var(--color-ink-line)] hover:border-[var(--color-bone-dim)] rounded-sm text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {locating ? (
                      'Detecting…'
                    ) : coords ? (
                      <span className="text-[var(--color-sage)]">✓ Location detected</span>
                    ) : (
                      'Detect my location'
                    )}
                  </button>
                  <p className="text-xs text-[var(--color-bone-dim)] mt-1.5">
                    Required — this is how we calculate distance to match requests.
                  </p>
                </div>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="text-sm text-[var(--color-blood-bright)] bg-[var(--color-blood-dim)] border border-[var(--color-blood)] rounded-sm px-4 py-3"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[var(--color-blood)] hover:bg-[var(--color-blood-bright)] rounded-sm font-medium transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="mt-8">
            <PulseLine />
          </div>

          <p className="text-center text-sm text-[var(--color-bone-dim)] mt-6">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <Link to="/login" className="text-[var(--color-bone)] border-b border-[var(--color-blood)]">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New here?{' '}
                <Link to="/register" className="text-[var(--color-bone)] border-b border-[var(--color-blood)]">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function RoleTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm rounded-sm border transition-colors ${
        active
          ? 'border-[var(--color-blood)] bg-[var(--color-blood-dim)] text-[var(--color-bone)]'
          : 'border-[var(--color-ink-line)] text-[var(--color-bone-dim)] hover:border-[var(--color-bone-dim)]'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, type = 'text', value, onChange, required, hint }) {
  return (
    <div>
      <label className="block text-xs text-[var(--color-bone-dim)] mb-1.5">
        {label} {required && <span className="text-[var(--color-blood)]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--color-ink-raised)] border border-[var(--color-ink-line)] focus:border-[var(--color-blood)] rounded-sm px-3.5 py-2.5 text-sm text-[var(--color-bone)] outline-none transition-colors"
      />
      {hint && <p className="text-xs text-[var(--color-bone-dim)] mt-1">{hint}</p>}
    </div>
  );
}
