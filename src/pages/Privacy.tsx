import { Link } from 'react-router-dom'
import { Logo } from '../App'

const CONTACT_EMAIL = 'wdorielan1@gmail.com'
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

      <p>Will Power (“we”, “us”) is an accountability fitness community app. This policy explains what information we collect, how we use it, and the choices you have. The app is currently in a free beta.</p>

      <h2>Information we collect</h2>
      <ul>
        <li><b>Account information:</b> your name and email address, and your password (stored securely by our authentication provider, never in plain text). If you sign in with Google, we receive your name and email from Google.</li>
        <li><b>Age check:</b> when you sign up (and once for accounts made before this check existed) we ask for your date of birth to make sure you are 13 or older. We do not save the date. We only save that you passed, and the day you did.</li>
        <li><b>Fitness profile:</b> goal, experience level, training days and time, equipment and how often you use each kind, current and target weight, cardio preference, any injuries or exercises you ask us to avoid, the lifts you hide, and which lifts you skip, finish and save (used only to improve your own suggestions).</li>
        <li><b>Activity you log:</b> workouts (weights, reps, sets, RPE, notes), cardio sessions, body weight, nutrition check-ins, and your streaks.</li>
        <li><b>Community activity:</b> the crews you join, your daily “I’m going” and “Workout complete” check-ins, and messages you post.</li>
        <li><b>Technical data:</b> basic information our hosting provider records when you visit, such as IP address and browser type.</li>
      </ul>
      <p>The health-related information above is information you choose to enter. Do not enter anything you are not comfortable storing in the app.</p>

      <h2>What other members can see</h2>
      <p>Your private data (profile, workout logs, body weight, cardio, nutrition) is visible only to you. When you join a crew, other signed-in members can see your <b>first name</b>, whether you are going or have completed today’s workout, your streak, and any messages you post in that crew. Do not post information in crew messages that you want to keep private.</p>

      <h2>Location and the crew map</h2>
      <p>Location is optional. When someone starts a crew they can pick a town or neighbourhood for it. We save only that general area, rounded to about one mile, and show it as a pin on the crew map. We never show where a member lives or where anyone is right now. If you choose “Use my area” (we encourage it, but it is optional), your browser asks for permission and we save a town-level pin, rounded to about one mile, in your private profile. We use it to suggest crews near you and to centre the map. Only you can see it, and you can remove it any time in Settings or on the map. We never save your exact location. If you tap “Locate me” on the map, your exact position appears as a blue dot on your own screen only. It is not sent to us or saved. If you tap “I’d join a crew here”, we save your general area (rounded to about one mile) so we can count how many people want a crew nearby. Other members only ever see that count. You can report a crew from its map card.</p>

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
        <li><b>AWS Amplify</b>: website hosting. Netlify manages DNS.</li>
        <li><b>Google</b>: optional “Continue with Google” sign-in.</li>
        <li><b>Your handle and name</b>: when you join we give you a handle based on the first part of your email address (for example <code>alex</code> from alex@example.com), and people can find you in search by name or handle. You can change your handle, or turn search off, any time on the Friends tab. Your full email is never shown.</li>
        <li><b>Crew videos</b>: a video you post to a crew is stored privately and deleted automatically 60 days after you post it. The post and its photos stay until you delete them. Deleting the post earlier removes the video straight away.</li>
        <li><b>Public profile</b>: when your profile is public, anyone with your profile link (willpower address plus /u/your-handle) can see your name, photo, bio, streak, workout counts, a calendar of the days you trained, badges, the crews you are in, and the text of posts you make while it is on. Photos and videos you post, your weight, your workout details and your messages stay private. New accounts start public; accounts created before this feature start private. You can switch it off in Settings, and public posts disappear from your profile when you delete them or turn your profile private.</li>
        <li><b>Google profile photo</b>: if you sign in with Google, we show your Google profile photo as your picture. People you are connected with in the app can see it, along with your first name and handle. The photo itself stays with Google; we only keep its link. You can also upload your own picture instead; we shrink it to a small square and store it with your account.</li>
        <li><b>USDA FoodData Central and Open Food Facts</b>: online food search in Fuel. When you tap “Search online”, the food name you typed is sent to these services. When you scan a barcode, the camera runs on your phone only while the scanner is open; the video is never recorded or uploaded, and only the barcode number is looked up. Nothing else about you is sent.</li>
        <li><b>OpenStreetMap</b>: map tiles and place search for the crew map. Your search words are sent to their service when you search for a place.</li>
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
      <p>Will Power is not intended for children under 13, and we do not knowingly collect their information. We ask for a date of birth at sign up and stop anyone who says they are under 13. If you believe a child has given us information, contact us and we will delete it.</p>

      <h2>Not medical advice</h2>
      <p>Workout and nutrition suggestions in the app are general information, not medical advice. Talk to a doctor before starting a new exercise or nutrition program.</p>

      <h2>Changes</h2>
      <p>We may update this policy as the app evolves. We will change the date above when we do, and may notify you of significant changes.</p>

      <h2>Contact</h2>
      <p>Questions or requests: {CONTACT_EMAIL}</p>

      <footer className="site-foot small mute"><Logo size={22} /> © {new Date().getFullYear()} Will Power · <Link to="/terms" className="mute" style={{ textDecoration: 'underline' }}>Terms</Link></footer>
    </div>
  )
}
