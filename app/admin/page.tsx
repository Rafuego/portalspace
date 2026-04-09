'use client'
import { useEffect, useRef, useState } from 'react'
import type { Player } from '@/lib/supabase'

const s: Record<string, React.CSSProperties> = {
  page:       { background: '#fff', minHeight: '100vh', fontFamily: 'inherit', color: '#111' },
  header:     { borderBottom: '1px solid #e0e0e0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:       { fontSize: 13, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#111' },
  body:       { padding: 24, maxWidth: 780, margin: '0 auto' },
  addBar:     { display: 'flex', gap: 10, marginBottom: 24 },
  inp:        { flex: 1, maxWidth: 300, background: '#fff', border: '1px solid #ccc', color: '#111', fontFamily: 'inherit', fontSize: 13, padding: '9px 12px', borderRadius: 2, outline: 'none' },
  btnAdd:     { background: '#111', border: '1px solid #111', color: '#fff', fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.14em', padding: '9px 18px', cursor: 'pointer', borderRadius: 2, textTransform: 'uppercase' as const, fontWeight: 500 },
  list:       { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  row:        { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 3, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 },
  rowLive:    { background: '#fffafa', border: '1px solid #ffaaaa' },
  badge:      { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700 },
  name:       { flex: 1, fontSize: 14, fontWeight: 400 },
  nameMuted:  { color: '#888' },
  timer:      { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', minWidth: 110, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' },
  timerLive:  { color: '#cc3333' },
  timerEmpty: { color: '#bbb', fontSize: 16, fontWeight: 300 },
  actions:    { display: 'flex', gap: 8 },
  btnRec:     { background: '#fff', border: '1px solid #ddd', color: '#555', fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.12em', padding: '7px 14px', cursor: 'pointer', borderRadius: 2, textTransform: 'uppercase' as const, fontWeight: 500 },
  btnStop:    { background: '#cc3333', border: '1px solid #cc3333', color: '#fff', fontFamily: 'inherit', fontSize: 10, letterSpacing: '0.12em', padding: '7px 14px', cursor: 'pointer', borderRadius: 2, textTransform: 'uppercase' as const, fontWeight: 500 },
  btnDel:     { background: 'transparent', border: '1px solid #e0e0e0', color: '#bbb', fontFamily: 'inherit', fontSize: 10, padding: '7px 10px', cursor: 'pointer', borderRadius: 2, textTransform: 'uppercase' as const, letterSpacing: '0.1em' },
  doneBadge:  { fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#bbb', border: '1px solid #e0e0e0', padding: '6px 12px', borderRadius: 2, fontWeight: 500 },
  empty:      { textAlign: 'center' as const, padding: 48, color: '#bbb', fontSize: 12, letterSpacing: '0.1em' },
  authWrap:   { minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  authBox:    { width: 320, padding: 32, border: '1px solid #e0e0e0', borderRadius: 4 },
  authTitle:  { fontSize: 13, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 20, color: '#111' },
  authErr:    { fontSize: 12, color: '#cc3333', marginTop: 10 },
}

const MEDAL = [
  { bg: 'rgba(200,155,32,0.08)', color: '#C89B20', border: 'rgba(200,155,32,0.3)' },
  { bg: 'rgba(122,144,153,0.08)', color: '#7A9099', border: 'rgba(122,144,153,0.3)' },
  { bg: 'rgba(139,90,43,0.08)', color: '#8B5A2B', border: 'rgba(139,90,43,0.3)' },
]

function fmt(ms: number) {
  const m = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [ticks, setTicks] = useState(0)
  const tickRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('authed') === 'true') {
      setAuthed(true)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    fetch('/api/players').then(r => r.json()).then(setPlayers)
  }, [authed])

  useEffect(() => {
    const hasLive = players.some(p => p.state === 'live')
    if (hasLive && !tickRef.current) {
      tickRef.current = setInterval(() => setTicks(t => t + 1), 50)
    } else if (!hasLive && tickRef.current) {
      clearInterval(tickRef.current); tickRef.current = null
    }
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null } }
  }, [players])

  async function login() {
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
    if (res.ok) { sessionStorage.setItem('authed', 'true'); setAuthed(true) }
    else { setPwErr(true) }
  }

  async function addPlayer() {
    if (!name.trim()) return
    const res = await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
    const p = await res.json()
    setPlayers(prev => [...prev, p])
    setName('')
  }

  async function startTimer(id: string) {
    const start_ms = Date.now()
    const res = await fetch(`/api/players/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: 'live', start_ms }) })
    const updated = await res.json()
    setPlayers(prev => prev.map(p => p.id === id ? updated : p))
  }

  async function stopTimer(id: string) {
    const player = players.find(p => p.id === id)
    if (!player?.start_ms) return
    const final_ms = Date.now() - player.start_ms
    const res = await fetch(`/api/players/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: 'done', final_ms }) })
    const updated = await res.json()
    setPlayers(prev => prev.map(p => p.id === id ? updated : p))
  }

  async function deletePlayer(id: string) {
    await fetch(`/api/players/${id}`, { method: 'DELETE' })
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  if (!authed) return (
    <div style={s.authWrap}>
      <div style={s.authBox}>
        <div style={s.authTitle}>Portal Space Systems — Admin</div>
        <input style={s.inp} type="password" placeholder="Password" value={pw}
          onChange={e => { setPw(e.target.value); setPwErr(false) }}
          onKeyDown={e => e.key === 'Enter' && login()} />
        <button style={{ ...s.btnAdd, marginTop: 10, width: '100%' }} onClick={login}>Enter</button>
        {pwErr && <div style={s.authErr}>Incorrect password</div>}
      </div>
    </div>
  )

  const ranked = [...players].filter(p => p.state === 'done').sort((a, b) => (a.final_ms ?? 0) - (b.final_ms ?? 0))
  const rankMap = new Map(ranked.map((p, i) => [p.id, i]))

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.logo}>Portal Space Systems — Admin</div>
        <a href="/stream" target="_blank" style={{ fontSize: 11, color: '#999', textDecoration: 'none', letterSpacing: '0.1em' }}>Stream view ↗</a>
      </div>
      <div style={s.body}>
        <div style={s.addBar}>
          <input style={s.inp} placeholder="Player name" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()} />
          <button style={s.btnAdd} onClick={addPlayer}>Add player</button>
        </div>
        {players.length === 0
          ? <div style={s.empty}>No players yet. Add one above.</div>
          : <div style={s.list}>
              {players.map(p => {
                const rank = p.state === 'done' ? rankMap.get(p.id) ?? null : null
                const medal = rank !== null && rank < 3 ? MEDAL[rank] : null
                const elapsed = p.state === 'live' && p.start_ms ? Date.now() - p.start_ms : (p.final_ms ?? 0)
                return (
                  <div key={p.id} style={{ ...s.row, ...(p.state === 'live' ? s.rowLive : {}) }}>
                    <div style={{ width: 28, textAlign: 'center' }}>
                      <span style={{ ...s.badge, background: medal?.bg ?? 'transparent', color: medal?.color ?? '#bbb', border: `1px solid ${medal?.border ?? '#ddd'}` }}>
                        {rank !== null ? rank + 1 : '—'}
                      </span>
                    </div>
                    <div style={{ ...s.name, ...(p.state === 'pending' ? s.nameMuted : {}) }}>{p.name}</div>
                    <div style={{ ...s.timer, ...(p.state === 'live' ? s.timerLive : p.state === 'pending' ? s.timerEmpty : {}) }}>
                      {p.state === 'pending' ? '—:——.——' : fmt(elapsed)}
                    </div>
                    <div style={s.actions}>
                      {p.state === 'pending' && <button style={s.btnRec} onClick={() => startTimer(p.id)}>Record</button>}
                      {p.state === 'live'    && <button style={s.btnStop} onClick={() => stopTimer(p.id)}>Stop</button>}
                      {p.state === 'done'    && <span style={s.doneBadge}>Done</span>}
                      <button style={s.btnDel} onClick={() => deletePlayer(p.id)}>Del</button>
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </div>
  )
}
