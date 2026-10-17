import { Link } from 'react-router-dom'
import { Logo } from '../App'

const CONTACT_EMAIL = 'wdorielan1@gmail.com'
const UPDATED = 'October 9, 2026'

export default function Terms() {
  return (
    <div className="site legal">
      <header className="site-nav">
        <Link to="/" className="brand"><Logo size={34} /><span>WILL POWER</span></Link>
        <Link to="/" className="small mute">← Back</Link>
      </header>

      <h1>Terms of Service</h1>
      <p className="mute small">Last updated {UPDATED}</p>

      <p>Welcome to Will Power (“we”, “us”). By creating an account or using the app and website, you agree to these Terms and our <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>. If you do not agree, please do not use the service.</p>

      <h2>The service</h2>
      <p>Will Power is an accountability fitness community. It offers workout communities (“crews”), daily check-ins, workout and nutrition suggestions, progress tracking, and related features. The service is currently in a free beta. Features may change, be added, or be removed at any time, and we may introduce paid plans in the future.</p>

      <h2>Eligibility and your account</h2>
      <ul>
        <li>You must be at least 13 years old. If you are under the age of majority where you live, use the app only with a parent or guardian’s permission.</li>
        <li>Give accurate information and keep your login secure. You are responsible for activity on your account.</li>
        <li>Tell us promptly if you believe your account has been accessed without permission.</li>
      </ul>

      <h2>Health and safety disclaimer</h2>
      <p>Exercise carries a risk of injury. The workouts, nutrition targets, and other content in the app are general information only. They are not medical advice, and we are not your doctor, dietitian, or coach. Talk to a qualified professional before starting any exercise or nutrition program, especially if you have a medical condition, injury, or are pregnant. Stop exercising and seek help if you feel pain, dizziness, or discomfort. You use the app and perform any exercise <b>at your own risk</b>.</p>

      <h2>Community rules</h2>
      <p>Crews are meant to be encouraging. When you use the community features you agree not to:</p>
      <ul>
        <li>harass, threaten, shame, or discriminate against others;</li>
        <li>post anything unlawful, hateful, sexually explicit, or that promotes self-harm or disordered eating;</li>
        <li>share other people’s private information;</li>
        <li>spam, advertise, or impersonate anyone;</li>
        <li>try to disrupt, scrape, or break into the service, or access another person’s account.</li>
      </ul>
      <p>We may remove content, restrict features, or suspend accounts that break these rules or put others at risk.</p>

      <h2>Your content</h2>
      <p>You keep ownership of what you submit, such as messages and logs. You give us a limited license to store, display, and process that content as needed to run the service, including showing your first name, check-ins, streak, and messages to other members of the crews you join. You are responsible for the content you post.</p>

      <h2>Our content</h2>
      <p>The app, its design, name, logo, and software belong to us or our licensors. You may use them only to use the service for your personal, non-commercial purposes. Do not copy, resell, or reverse engineer them except as the law allows.</p>

      <h2>Beta service and availability</h2>
      <p>The service is provided “as is” and “as available,” especially during beta. We do not promise that it will always be available, error-free, or that your data will never be lost. Keep your own records of anything important.</p>

      <h2>Disclaimers and limits of liability</h2>
      <p>To the fullest extent the law allows, we disclaim all warranties, express or implied. We are not liable for indirect, incidental, special, or consequential damages, or for any injury, loss, or damage arising from your use of the service or from exercise or nutrition decisions you make. If we are found liable, our total liability to you will not exceed the greater of the amount you paid us in the past 12 months or US$50. Some places do not allow these limits, so they may not apply to you in full.</p>

      <h2>Ending your account</h2>
      <p>You can stop using the service at any time and ask us to delete your account at {CONTACT_EMAIL}. We may suspend or end access if you break these Terms or if we need to protect the service or other users.</p>

      <h2>Changes to these Terms</h2>
      <p>We may update these Terms. We will change the date above, and when a change is significant we will try to let you know. Continuing to use the service after a change means you accept the new Terms.</p>

      <h2>Contact</h2>
      <p>Questions about these Terms: {CONTACT_EMAIL}</p>

      <footer className="site-foot small mute"><Logo size={22} /> © {new Date().getFullYear()} Will Power · <Link to="/privacy" className="mute" style={{ textDecoration: 'underline' }}>Privacy</Link></footer>
    </div>
  )
}
