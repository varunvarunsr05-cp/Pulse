import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PulseLine from '../components/PulseLine';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <Nav />

      {/* Hero: the thesis, not a stock photo */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="font-mono text-xs tracking-[0.2em] text-[var(--color-blood)] uppercase mb-6"
        >
          Every 2 seconds, someone needs blood
        </motion.p>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="font-[var(--font-display)] text-5xl md:text-7xl leading-[1.05] tracking-tight text-[var(--color-bone)] max-w-4xl"
        >
          The right donor,{' '}
          <span className="italic text-[var(--color-blood-bright)]">found in seconds</span>
          , not hours.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-6 text-lg text-[var(--color-bone-dim)] max-w-2xl leading-relaxed"
        >
          When a hospital posts an emergency request, our ranking engine scores every
          nearby donor on compatibility, distance, and readiness — and shows exactly
          why each one made the list. No black box. No guesswork. Just the fastest
          path from request to donor.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-10 flex flex-wrap gap-4"
        >
          <Link
            to="/register?role=donor"
            className="px-7 py-3.5 bg-[var(--color-blood)] hover:bg-[var(--color-blood-bright)] text-[var(--color-bone)] rounded-sm font-medium transition-colors"
          >
            Become a donor
          </Link>
          <Link
            to="/register?role=hospital"
            className="px-7 py-3.5 border border-[var(--color-ink-line)] hover:border-[var(--color-bone-dim)] text-[var(--color-bone)] rounded-sm font-medium transition-colors"
          >
            I'm a hospital
          </Link>
        </motion.div>
      </section>

      <div className="max-w-5xl mx-auto px-6">
        <PulseLine variant="active" />
      </div>

      {/* How the ranking works — the real substance, shown plainly */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <h2 className="font-[var(--font-display)] text-3xl md:text-4xl text-[var(--color-bone)] mb-3">
          How a match is scored
        </h2>
        <p className="text-[var(--color-bone-dim)] max-w-xl mb-12">
          Five factors, weighted and shown to every hospital that uses the platform.
          Nothing about the ranking is hidden.
        </p>

        <div className="grid md:grid-cols-2 gap-px bg-[var(--color-ink-line)] border border-[var(--color-ink-line)]">
          {[
            {
              weight: '30',
              title: 'Blood type compatibility',
              body: 'Exact matches rank highest; medically compatible types still qualify, scored by clinical priority.',
            },
            {
              weight: '25',
              title: 'Distance from hospital',
              body: 'Calculated in real time from donor location. Full score within 2km, tapering to zero past 30km.',
            },
            {
              weight: '20',
              title: 'Donation readiness',
              body: 'Donors past the mandatory 56-day gap and inside their healthy donation window score highest.',
            },
            {
              weight: '15',
              title: 'Current availability',
              body: 'Donors self-report availability. Unavailable donors are still shown, never silently dropped.',
            },
            {
              weight: '10',
              title: 'Response reliability',
              body: 'Built from donation history — donors who follow through on past matches rank slightly higher.',
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              custom={i}
              className="bg-[var(--color-ink)] p-7 md:p-8"
            >
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-mono text-2xl text-[var(--color-blood)]">{f.weight}</span>
                <span className="font-mono text-xs text-[var(--color-bone-dim)]">/ 100 pts</span>
              </div>
              <h3 className="text-[var(--color-bone)] font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--color-bone-dim)] leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
          <div className="bg-[var(--color-ink)] p-7 md:p-8 flex flex-col justify-center">
            <p className="text-sm text-[var(--color-bone-dim)] leading-relaxed">
              Ineligible donors — recent donation, underweight, unavailable — are
              excluded before scoring even begins. Safety gates come first, ranking
              second.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">
        <PulseLine />
      </div>

      {/* Role split */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-8">
        <div className="border border-[var(--color-ink-line)] p-8 rounded-sm">
          <p className="font-mono text-xs text-[var(--color-blood)] uppercase tracking-wider mb-3">
            For donors
          </p>
          <h3 className="font-[var(--font-display)] text-2xl mb-3">
            Get notified when you're actually needed
          </h3>
          <p className="text-[var(--color-bone-dim)] text-sm leading-relaxed mb-6">
            Set your blood type and location once. When a nearby hospital needs your
            type, you'll see the request, the distance, and can respond in one tap.
          </p>
          <Link
            to="/register?role=donor"
            className="text-sm font-medium text-[var(--color-bone)] border-b border-[var(--color-blood)] pb-0.5"
          >
            Register as a donor →
          </Link>
        </div>
        <div className="border border-[var(--color-ink-line)] p-8 rounded-sm">
          <p className="font-mono text-xs text-[var(--color-amber)] uppercase tracking-wider mb-3">
            For hospitals
          </p>
          <h3 className="font-[var(--font-display)] text-2xl mb-3">
            Post a request, see ranked donors instantly
          </h3>
          <p className="text-[var(--color-bone-dim)] text-sm leading-relaxed mb-6">
            Enter blood type, units, and urgency. The engine scores every eligible
            donor nearby and shows the reasoning behind each rank.
          </p>
          <Link
            to="/register?role=hospital"
            className="text-sm font-medium text-[var(--color-bone)] border-b border-[var(--color-amber)] pb-0.5"
          >
            Register as a hospital →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-ink-line)] py-10">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center text-xs text-[var(--color-bone-dim)] font-mono">
          <span>Blood Donor Matching & Emergency Response</span>
          <span>Built for demonstration purposes</span>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  return (
    <nav className="max-w-5xl mx-auto px-6 py-6 flex justify-between items-center">
      <span className="font-[var(--font-display)] text-lg tracking-tight">
        Pulse<span className="text-[var(--color-blood)]">.</span>
      </span>
      <div className="flex gap-6 items-center text-sm">
        <Link to="/login" className="text-[var(--color-bone-dim)] hover:text-[var(--color-bone)] transition-colors">
          Log in
        </Link>
        <Link
          to="/register"
          className="px-4 py-2 bg-[var(--color-ink-raised)] border border-[var(--color-ink-line)] hover:border-[var(--color-bone-dim)] rounded-sm transition-colors"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
