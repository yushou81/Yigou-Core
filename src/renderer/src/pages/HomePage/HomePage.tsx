import React from 'react'
import { useNavigate } from 'react-router-dom'
import { canvasService } from '../../services/canvasService'

type RecentItem = { path: string; openedAt: number }

const RECENTS_KEY = 'yigou_recent_projects'

function getRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.sort((a, b) => b.openedAt - a.openedAt)
  } catch { return [] }
}

export default function HomePage(): React.JSX.Element {
  const navigate = useNavigate()
  const [recents, setRecents] = React.useState<RecentItem[]>(getRecents())
  
  const refreshRecents = () => setRecents(getRecents())

  const handleNew = () => {
    canvasService.clearCanvas()
    canvasService.setCurrentProjectPath(null)
    navigate('/canvas')
  }

  const handleOpen = async () => {
    const res = await canvasService.loadProjectFromFile()
    if (res.success) {
      refreshRecents()
      navigate('/canvas')
    }
  }

  const handleOpenRecent = async (path: string) => {
    const res = await canvasService.loadProjectFromPath(path)
    if (res.success) {
      refreshRecents()
      navigate('/canvas')
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div style={{ width: 960, maxWidth: '92vw', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', padding: 20 }}>
          <h2 style={{ margin: '4px 0 16px 0' }}>开始</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <button onClick={handleNew} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', textAlign: 'left', cursor: 'pointer' }}>
              新建空白项目
            </button>
            <button onClick={handleOpen} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', textAlign: 'left', cursor: 'pointer' }}>
              打开本地项目…
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', padding: 20 }}>
          <h2 style={{ margin: '4px 0 16px 0' }}>最近</h2>
          {recents.length === 0 ? (
            <div style={{ color: '#6b7280' }}>暂无最近项目</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recents.slice(0, 12).map(item => (
                <button
                  key={item.path}
                  onClick={() => handleOpenRecent(item.path)}
                  title={item.path}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                    {item.path}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>
                    {new Date(item.openedAt).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


