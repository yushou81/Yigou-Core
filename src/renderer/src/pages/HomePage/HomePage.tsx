import React from 'react'
import { useNavigate } from 'react-router-dom'
import { canvasService } from '../../services/canvasService'
import './HomePage.css' // Import the CSS file

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
    <div className="homePageContainer">
      <div className="homePageGrid">
        {/* Start Card */}
        <div className="card">
          <h2 className="cardTitle">开始</h2>
          <div className="buttonGrid">
            <button onClick={handleNew} className="actionButton">
              新建空白项目
            </button>
            <button onClick={handleOpen} className="actionButton">
              打开本地项目…
            </button>
          </div>
        </div>

        {/* Recents Card */}
        <div className="card">
          <h2 className="cardTitle">最近</h2>
          {recents.length === 0 ? (
            <div className="noRecents">暂无最近项目</div>
          ) : (
            <div className="recentItemsList">
              {recents.slice(0, 12).map(item => (
                <button
                  key={item.path}
                  onClick={() => handleOpenRecent(item.path)}
                  title={item.path}
                  className="recentItemButton"
                >
                  <span className="recentItemPath">
                    {item.path}
                  </span>
                  <span className="recentItemDate">
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
