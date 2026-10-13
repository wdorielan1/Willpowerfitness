import { useState } from 'react'
import { runChecks } from './checks.js'
import { createRoot } from 'react-dom/client'
import { DoneSheet } from '../../src/WorkoutShare'
import * as renderer from '../../src/shareSticker'
import * as photo from '../../src/sharePhoto'
import { fixture, noPrFixture } from './fixture'
import type { Settings } from '../../src/types'
import '../../src/styles.css'

const key = 'will-power-sticker-test-prefs'
function Harness() {
  const [settings, setSettings] = useState<Partial<Settings>>(() => JSON.parse(localStorage.getItem(key) || '{}'))
  const [result, setResult] = useState('Not run')
  const [report, setReport] = useState('')
  const addFixturePhoto = async (tone: string) => {
    const image = new Image(); image.src = '/ex/wide-grip-barbell-bench-press-0.jpg'; await image.decode()
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920
    const g = cv.getContext('2d')!; const k = Math.max(cv.width / image.width, cv.height / image.height)
    g.drawImage(image, (cv.width-image.width*k)/2, (cv.height-image.height*k)/2, image.width*k,image.height*k)
    g.fillStyle = tone === 'light' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)';g.fillRect(0,0,cv.width,cv.height)
    const blob = await new Promise<Blob>(r => cv.toBlob(b=>r(b!),'image/jpeg',.9))
    const transfer = new DataTransfer();transfer.items.add(new File([blob],tone+'.jpg',{type:'image/jpeg'}))
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))
  }
  const summary = new URLSearchParams(location.search).has('no-pr') ? noPrFixture : fixture
  return <><div style={{position:'fixed',top:0,left:0,right:0,zIndex:60,background:'#101114',padding:4,display:'flex',gap:4,flexWrap:'wrap'}}>
    <button className="small-btn" onClick={()=>void addFixturePhoto('light')}>Light photo</button><button className="small-btn" onClick={()=>void addFixturePhoto('dark')}>Dark photo</button>
    <button className="small-btn" onClick={async()=>{setResult('Running');try {const r=await runChecks();setReport(JSON.stringify(r));setResult('Passed '+r.checks.length+' checks')}catch(e){setResult('FAILED: '+(e as Error).message)}}}>Run checks</button><output id="test-status" style={{fontSize:12}}>{result}</output><script id="test-report" type="application/json">{report}</script>
    </div><main><h1>Browser verification fixture</h1><p>Invented workout history; never saved to the app.</p></main><DoneSheet summary={summary} settings={settings} onPrefs={(patch) => setSettings((current) => {
    const next = { ...current, ...patch }; localStorage.setItem(key, JSON.stringify(next)); return next
  })} onClose={() => {}} /></>
}
Object.assign(window, { __shareTest: { renderer, photo, fixture, noPrFixture, prefsKey: key } })
createRoot(document.getElementById('root')!).render(<Harness />)
