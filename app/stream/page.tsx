'use client'
import { useEffect, useState } from 'react'
import { supabase, type Player } from '@/lib/supabase'

function fmt(ms: number) {
  const m = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`
}

const MEDAL = [
  { cls: 'p1', label: '1st place', color: '#C89B20', bg: 'rgba(200,155,32,0.08)', border: 'rgba(200,155,32,0.2)' },
  { cls: 'p2', label: '2nd place', color: '#7A9099', bg: 'rgba(122,144,153,0.08)', border: 'rgba(122,144,153,0.15)' },
  { cls: 'p3', label: '3rd place', color: '#8B5A2B', bg: 'rgba(139,90,43,0.08)',  border: 'rgba(139,90,43,0.15)' },
]

export default function StreamPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [clock, setClock] = useState('')
  const [username, setUsername] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function submitName() {
    if (!username.trim()) return
    await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: username.trim() }) })
    setSubmitted(true)
  }

  useEffect(() => {
    supabase.from('players').select('*').order('created_at').then(({ data }) => {
      if (data) setPlayers(data)
    })

    const channel = supabase
      .channel('players-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
        if (payload.eventType === 'INSERT') {
          setPlayers(prev => [...prev, payload.new as Player])
        } else if (payload.eventType === 'UPDATE') {
          setPlayers(prev => prev.map(p => p.id === (payload.new as Player).id ? payload.new as Player : p))
        } else if (payload.eventType === 'DELETE') {
          setPlayers(prev => prev.filter(p => p.id !== (payload.old as Player).id))
        }
      })
      .subscribe()

    const tick = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-CA', { hour12: false }))
    }, 1000)

    return () => { supabase.removeChannel(channel); clearInterval(tick) }
  }, [])

  const done = [...players].filter(p => p.state === 'done').sort((a, b) => (a.final_ms ?? 0) - (b.final_ms ?? 0))
  const podium = done.slice(0, 3)
  const rest = done.slice(3)
  const cols = podium.length === 1 ? '1fr' : podium.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr'

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'inherit', padding: '36px 32px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img src="/portal-logo.png" alt="Portal" style={{ height: 80, display: 'inline-block' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', color: '#fff' }}>
            Leaderboard
          </div>
          <div style={{ fontSize: 14, color: '#999', marginTop: 6, fontWeight: 300 }}>
            {done.length > 0 ? `${done.length} completed run${done.length !== 1 ? 's' : ''}` : 'Waiting for results...'}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, color: '#888', fontWeight: 300, lineHeight: 2.1 }}>
          <div>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#fff', marginRight: 8, verticalAlign: 'middle' }} />
            Live
          </div>
          <div>{clock}</div>
          <div>{players.length} players</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#333', marginBottom: 26 }} />

      {/* Player registration */}
      {!submitted ? (
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, alignItems: 'center' }}>
          <input
            style={{ flex: 1, maxWidth: 320, background: 'transparent', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', fontSize: 15, padding: '12px 16px', borderRadius: 6, outline: 'none' }}
            placeholder="Enter your username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitName()}
          />
          <button
            style={{ background: '#fff', border: 'none', color: '#000', fontFamily: 'inherit', fontSize: 13, letterSpacing: '0.1em', padding: '12px 24px', cursor: 'pointer', borderRadius: 6, textTransform: 'uppercase', fontWeight: 600 }}
            onClick={submitName}
          >
            Join
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 28, fontSize: 15, color: '#777', letterSpacing: '0.06em' }}>
          ✓ Registered as <span style={{ color: '#fff', fontWeight: 500 }}>{username}</span> — waiting for your run
        </div>
      )}

      {/* Empty state */}
      {done.length === 0 && (
        <div style={{ textAlign: 'center', padding: 80, color: '#777', fontSize: 16, letterSpacing: '0.08em' }}>
          No completed runs yet
        </div>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14, marginBottom: 28 }}>
          {podium.map((p, i) => {
            const m = MEDAL[i]
            return (
              <div key={p.id} style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: 6, padding: '24px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 10, color: m.color }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8, color: '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: m.color }}>
                  {fmt(p.final_ms ?? 0)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rest of the table */}
      {rest.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ fontSize: 11, letterSpacing: '0.2em', color: '#777', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #333', fontWeight: 500, width: 44 }}>#</th>
              <th style={{ fontSize: 11, letterSpacing: '0.2em', color: '#777', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #333', fontWeight: 500 }}>Player</th>
              <th style={{ fontSize: 11, letterSpacing: '0.2em', color: '#777', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #333', fontWeight: 500, width: 150 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((p, i) => (
              <tr key={p.id}>
                <td style={{ padding: '12px 12px', borderBottom: '1px solid #1e1e1e', fontSize: 14, color: '#777', width: 44 }}>{i + 4}</td>
                <td style={{ padding: '12px 12px', borderBottom: '1px solid #1e1e1e', fontSize: 16, color: '#fff' }}>{p.name}</td>
                <td style={{ padding: '12px 12px', borderBottom: '1px solid #1e1e1e', fontSize: 17, fontWeight: 300, color: '#fff', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.final_ms ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, borderTop: '1px solid #333', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#777', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        <span>Portal Space Systems</span>
        <span>{players.length} players registered</span>
      </div>
    </div>
  )
}
