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
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'inherit', padding: '28px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', color: '#888', textTransform: 'uppercase', marginBottom: 4, fontWeight: 400 }}>
            Portal Space Systems
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', color: '#fff' }}>
            Portal Space Leaderboard
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4, fontWeight: 300 }}>
            {done.length > 0 ? `${done.length} completed run${done.length !== 1 ? 's' : ''}` : 'Waiting for results...'}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10, color: '#888', fontWeight: 300, lineHeight: 2.1 }}>
          <div>
            <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#fff', marginRight: 6, verticalAlign: 'middle' }} />
            Live
          </div>
          <div>{clock}</div>
          <div>{players.length} players</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#333', marginBottom: 22 }} />

      {/* Empty state */}
      {done.length === 0 && (
        <div style={{ textAlign: 'center', padding: 80, color: '#777', fontSize: 13, letterSpacing: '0.1em' }}>
          No completed runs yet
        </div>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10, marginBottom: 22 }}>
          {podium.map((p, i) => {
            const m = MEDAL[i]
            return (
              <div key={p.id} style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: 3, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8, color: m.color }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: m.color }}>
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
              <th style={{ fontSize: 9, letterSpacing: '0.22em', color: '#777', textTransform: 'uppercase', padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #333', fontWeight: 500, width: 36 }}>#</th>
              <th style={{ fontSize: 9, letterSpacing: '0.22em', color: '#777', textTransform: 'uppercase', padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #333', fontWeight: 500 }}>Player</th>
              <th style={{ fontSize: 9, letterSpacing: '0.22em', color: '#444', textTransform: 'uppercase', padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #1e1e1e', fontWeight: 500, width: 130 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((p, i) => (
              <tr key={p.id}>
                <td style={{ padding: '10px 10px', borderBottom: '1px solid #161616', fontSize: 11, color: '#777', width: 36 }}>{i + 4}</td>
                <td style={{ padding: '10px 10px', borderBottom: '1px solid #161616', fontSize: 13, color: '#fff' }}>{p.name}</td>
                <td style={{ padding: '10px 10px', borderBottom: '1px solid #161616', fontSize: 14, fontWeight: 300, color: '#fff', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.final_ms ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, borderTop: '1px solid #333', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#777', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        <span>Portal Space Systems</span>
        <span>{players.length} players registered</span>
      </div>
    </div>
  )
}
