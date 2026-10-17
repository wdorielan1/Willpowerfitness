import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Link } from 'react-router-dom'
import ProfileView from '../../src/ProfileView'
import Profile from '../../src/pages/Profile'
import { Icon } from '../../src/icons'
import { AppProvider, blankData } from '../../src/store'
import { computeStats } from '../../src/profileStats'
import { savePhotoBlob } from '../../src/photos'
import { cloudEnabled, type PublicPost } from '../../src/cloud'
import '../../src/styles.css'

declare global { interface Window { __profile: { computeStats: typeof computeStats; data: ReturnType<typeof blankData>; posts: PublicPost[]; edits: number; shares: number } } }

// Local, invented profile data only. Never authenticate or write to a backend.
if (cloudEnabled) throw new Error('Run the profile fixture with no Supabase environment configured.')
const params = new URLSearchParams(location.search)
const photo = await (await fetch('/landing/train.png')).blob()
await savePhotoBlob('profile-test-photo', photo, null)
const titles = ['Push Day', 'Pull Day', 'Leg Day', 'Shoulders', 'Arms', 'Full Body']
const posts: PublicPost[] = titles.map((title, i) => ({
  id: `fixture-${i}`, crewId: 'test-crew', kind: 'workout', text: `Finished ${title}`, ts: Date.parse(`2026-10-${15-i}T12:00:00Z`),
  hasPhoto: i < 3, isPublic: true, imageIds: i < 3 ? ['profile-test-photo'] : [],
  meta: { title, minutes: 52-i, sets: 18-i, volume: 8640-i*250, caption: i === 0 ? 'Stronger every day.' : undefined, prs: i === 0 ? [{ name: 'Bench press', weight: 225, reps: 5 }] : [], lifts: [{ n: 'Bench press', w: 225, r: 5 }] },
}))
posts.push({ id: 'text', crewId: 'test-crew', kind: 'post', text: 'One day at a time. Long captions still have a home here.', ts: Date.now(), hasPhoto: false, isPublic: true })
posts.push({ id: 'missing', crewId: 'test-crew', kind: 'photo', text: 'A photo no longer on this device', ts: Date.now(), hasPhoto: true, isPublic: true, imageIds: ['missing'] })
posts.push({ id: 'expired', crewId: 'test-crew', kind: 'video', text: 'Old clip', ts: Date.now(), hasPhoto: false, isPublic: true, meta: { video: { expired: true } } })
const data = blankData('Alex Carter')
data.bio = 'Consistent progress. Stronger every day.'
data.handle = 'alexcarter'; data.profilePublic = true
data.avatar = '/landing/train.png'
data.posts = posts.map((p) => ({ ...p, name: data.name, mine: true, imagePaths: [] }))
data.profile = { goal: 'strength', level: 'intermediate', days: [1,3,5], time: '06:00', gear: 'gym', style: 'strength', weight: 180, target: 185, cardio: true, reminders: true, avoid: '', wantsCommunity: true }
const entries = [{ name: 'Bench press', exId: 'bench', note: '', sets: [{ weight: 100, reps: 10 }] }]
data.logs = [{ date: '2026-10-15', dayType: 'Push', short: false, minutes: 52, entries }, { date: '2026-10-14', dayType: 'Pull', short: false, minutes: 48, entries }]
data.joined = ['test-crew']; data.primary = 'test-crew'
Object.assign(window, { __profile: { computeStats, data, posts, edits: 0, shares: 0 } })

function Harness() {
  const [failed, setFailed] = useState(params.has('error'))
  const isPublic = params.has('public')
  const body = <ProfileView
    name={params.has('long') ? 'Alexanderthegreat Carterwithaverylongname' : data.name}
    handle={data.handle} avatar={data.avatar} bio={data.bio}
    stats={params.has('legacy') ? { workoutsTotal: 12 } : { streak: 12, workoutsTotal: 280, workouts30: 18, minutesTotal: 8520, volumeTotal: 89400, since: '2024-02-01', days: ['2026-10-15', '2026-10-14'], badges: ['first','w10','w50','streak7'], crews: ['test-crew'] }}
    posts={params.has('loading') ? null : params.has('empty') ? [] : posts}
    postsError={failed ? 'Could not load posts.' : ''} onRetryPosts={() => setFailed(false)}
    crewName={() => 'Early Crew'} followers={82} following={64} countsLink={!isPublic} showLocked={!isPublic}
    onEditAvatar={isPublic ? undefined : () => { window.__profile.edits++ }}
    actions={isPublic ? <a className="primary" href="/#/join">Join Alex on Will Power</a> : <><Link className="ghost small-btn" to="/settings">Edit profile</Link><button className="ghost small-btn" onClick={() => { window.__profile.shares++ }} aria-label="Share profile"><Icon name="upload" size={18} />Share</button></>}
    about={!isPublic && <Link to="/settings">Profile settings</Link>}
  />
  return <div className="shell profile-shell"><header className="top"><span className="brand">WILL POWER</span></header><main>{isPublic ? body : <MemoryRouter>{body}</MemoryRouter>}</main></div>
}
if (params.has('owner')) {
  localStorage.setItem('wpf.session', JSON.stringify('profile-fixture@example.test'))
  localStorage.setItem('wpf.data.profile-fixture@example.test', JSON.stringify(data))
  createRoot(document.getElementById('root')!).render(<MemoryRouter><AppProvider><div className="shell profile-shell"><main><Profile /></main></div></AppProvider></MemoryRouter>)
} else createRoot(document.getElementById('root')!).render(<Harness />)
