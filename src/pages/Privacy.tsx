import { Link } from 'react-router-dom'
import { Logo } from '../App'

// TODO(owner): replace before launch.
const CONTACT_EMAIL = '[your contact email]'
const UPDATED = 'October 8, 2026'

export default function Privacy() {
  return (
    <div className="site legal">
      <header className="site-nav">
        <Link to="/" className="brand"><Logo size={34} /><span>WILL POWER</span></Link>
        <Link to="/" className="small mute">← Back</Link>
      </header>

      <h1>Privacy Policy</h1>
      <p className="mute small">Last updated {UPDATED}</p>

      <p>Will Power Fitness (“we”, “us”) is an accountability fitness community app. This policy explains what information we collect, how we use it, and the choices you have. The app is currently in a free beta.</p>

      <h2>Information we collect</h2>
      <ul>
        <li><b>Account information:</b> your name and email address, and your password (stored securely by our authentication provider, never in plain text). If you sign in with Google, we receive your name and email from Google.</li>
        <li><b>Fitness profile:</b> goal, experience level, training days and time, equipment, current and target weight, cardio preference, and any injuries or exercises you ask us to avoid.</li>
        <li><b>Activity you log:</b> workouts (weights, reps, sets, RPE, notes), cardio sessions, body weight, nutrition check-ins, and your streaks.</li>
        <li><b>Community activity:</b> the crews you join, your daily “I’m going” and “Workout complete” check-ins, and messages you post.</li>
        <li><b>Technical data:</b> basic information our hosting provider records when you visit, such as IP address and browser type.</li>
      </ul>
      <p>The health-related information above is information you choose to enter. Do not enter anything you are not comfortable storing in the app.</p>

      <h2>What other members can see</h2>
      <p>Your private data (profile, workout logs, body weight, cardio, nutrition) is visible only to you. When you join a crew, other signed-in members can see your <b>first name</b>, whether you are going or have completed today’s workout, your streak, and any messages you post in that crew. Do not post information in crew messages that you want to keep private.</p>

      <h2>How we use information</h2>
      <ul>
        <li>To run the app: sign you in, save your data, generate workouts, and show your progress.</li>
        <li>To power community features such as check-ins, completion rates, and leaderboards.</li>
        <li>To keep the service secure and fix problems.</li>
        <li>To contact you about your account or important changes.</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>

      <h2>Service providers</h2>
      <p>We use trusted providers to operate the app. They process data only to provide their services:</p>
      <ul>
        <li><b>Supabase</b>: authentication and database storage.</li>
        <li><b>Netlify</b>: website hosting.</li>
        <li><b>Google</b>: optional “Continue with Google” sign-in.</li>
      </ul>

      <h2>Data stored on your device</h2>
      <p>The app may store small amounts of data in your browser (for example, to keep you signed in and to cache your information). You can clear this at any time in your browser settings.</p>

      <h2>Your choices</h2>
      <ul>
        <li>You can view and edit your profile in the app.</li>
        <li>You can leave any crew at any time.</li>
        <li>You can ask us to delete your account and data by emailing {CONTACT_EMAIL}.</li>
      </ul>

      <h2>Retention and security</h2>
      <p>We keep your information while your account is active and delete it after you request deletion, except where we must keep it for legal reasons. We use industry-standard safeguards, but no online service can be completely secure.</p>

      <h2>Children</h2>
      <p>Will Power Fitness is not intended for children under 13, and we do not knowingly collect their information. If you believe a child has given us information, contact us and we will delete it.</p>

      <h2>Not medical advice</h2>
      <p>Workout and nutrition suggestions in the app are general information, not medical advice. Talk to a doctor before starting a new exercise or nutrition program.</p>

      <h2>Changes</h2>
      <p>We may update this policy as the app evolves. We will change the date above when we do, and may notify you of significant changes.</p>

      <h2>Contact</h2>
      <p>Questions or requests: {CONTACT_EMAIL}</p>

      <footer className="site-foot small mute"><Logo size={22} /> © {new Date().getFullYear()} Will Power Fitness</footer>
    </div>
  )
}
