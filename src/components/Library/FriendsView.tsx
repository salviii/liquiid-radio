import { useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { Users, Trash2, UserPlus, X, Copy, Rss } from 'lucide-react'

export function FriendsView() {
  const friends = usePlayerStore((s) => s.friends)
  const removeFriend = usePlayerStore((s) => s.removeFriend)
  const addFriend = usePlayerStore((s) => s.addFriend)
  const [showAdd, setShowAdd] = useState(false)
  const [username, setUsername] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) return

    addFriend({
      userId: Math.random().toString(36).substring(2),
      username: username.trim(),
      displayName: username.trim(),
      mode: 'follow',
      trackCount: 0,
    })

    setUsername('')
    setShowAdd(false)
  }

  return (
    <div className="flex-1 overflow-auto pb-24">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl tracking-tight" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Friends
          </h2>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-accent flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:scale-105"
          >
            <UserPlus size={16} /> Add Friend
          </button>
        </div>
        <p className="knob-label mb-6" style={{ fontSize: '11px' }}>
          Follow or import audio libraries from friends
        </p>

        {/* Share link — panel-section inset */}
        <div className="panel-section p-4 mb-6" style={{ borderRadius: '4px' }}>
          <p className="knob-label mb-2" style={{ color: 'var(--theme-accent)' }}>
            Your share link
          </p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 truncate"
              style={{
                background: 'var(--theme-bg)',
                color: 'var(--theme-text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                borderRadius: '3px',
                border: '1px solid var(--theme-border)',
              }}>
              hurakan.app/u/your-username
            </code>
            <button className="btn-outline p-2" style={{ color: 'var(--theme-accent)' }}>
              <Copy size={16} />
            </button>
          </div>
        </div>

        {/* Friends list */}
        <div className="space-y-3">
          {friends.map(friend => (
            <div
              key={friend.id}
              className="panel flex items-center gap-4 p-4"
              style={{ borderRadius: '4px' }}
            >
              <div className="w-10 h-10 flex items-center justify-center text-sm font-medium"
                style={{
                  background: 'var(--theme-bg-panel)',
                  color: 'var(--theme-accent)',
                  borderRadius: '4px',
                  border: '1px solid var(--theme-border)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                }}>
                {friend.displayName[0]?.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)' }}>
                  {friend.displayName}
                </p>
                <p style={{ color: 'var(--theme-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>
                  @{friend.username} &middot; {friend.trackCount} tracks
                </p>
              </div>

              {/* Mode badge: LED for follow, different style for snapshot */}
              {friend.mode === 'follow' ? (
                <span className="flex items-center gap-2 px-2 py-1"
                  style={{
                    background: 'var(--theme-bg-panel)',
                    borderRadius: '3px',
                    border: '1px solid var(--theme-border)',
                  }}>
                  <span className="led active" />
                  <span className="knob-label" style={{ color: 'var(--theme-accent)' }}>Following</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 px-2 py-1"
                  style={{
                    background: 'var(--theme-bg-secondary)',
                    borderRadius: '3px',
                    border: '1px solid var(--theme-border)',
                  }}>
                  <Copy size={10} style={{ color: 'var(--theme-text-muted)' }} />
                  <span className="knob-label">Snapshot</span>
                </span>
              )}

              <button
                onClick={() => removeFriend(friend.id)}
                className="btn-ghost p-2"
                style={{ color: 'var(--theme-accent-red)' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {friends.length === 0 && (
            <div className="panel-section text-center py-16"
              style={{ borderRadius: '4px' }}>
              <Users size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--theme-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)', fontFamily: 'var(--font-display)' }}>No friends yet</p>
              <p className="knob-label mt-1">
                Share your link or add friends to merge libraries
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add friend modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAdd(false)}>
          <div className="panel w-full max-w-md p-6 shadow-xl"
            style={{ borderRadius: '6px' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg" style={{ color: 'var(--theme-text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Add Friend</h3>
              <button onClick={() => setShowAdd(false)} className="btn-ghost" style={{ color: 'var(--theme-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="knob-label" style={{ display: 'block', marginBottom: '4px' }}>Username or Link</label>
                <input
                  type="text"
                  placeholder="Enter username or share link"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--theme-bg)',
                    border: '1px solid var(--theme-border)',
                    color: 'var(--theme-text)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-accent flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                  <Rss size={16} /> Follow Live
                </button>
                <button type="button"
                  onClick={() => {
                    if (username.trim()) {
                      addFriend({
                        userId: Math.random().toString(36).substring(2),
                        username: username.trim(),
                        displayName: username.trim(),
                        mode: 'snapshot',
                        snapshotDate: Date.now(),
                        trackCount: 0,
                      })
                      setUsername('')
                      setShowAdd(false)
                    }
                  }}
                  className="btn-outline flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                  <Copy size={16} /> Import Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
