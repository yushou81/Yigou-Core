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

function removeRecent(path: string): void {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return
    const filtered = list.filter((item: RecentItem) => item.path !== path)
    localStorage.setItem(RECENTS_KEY, JSON.stringify(filtered))
  } catch {
    // 忽略错误
  }
}

export default function HomePage(): React.JSX.Element {
  const navigate = useNavigate()
  const [recents, setRecents] = React.useState<RecentItem[]>(getRecents())
  const [toast, setToast] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [filteredRecents, setFilteredRecents] = React.useState<RecentItem[]>(recents)
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const refreshRecents = () => {
    const newRecents = getRecents()
    setRecents(newRecents)
    // 如果有搜索关键词，重新过滤
    if (searchQuery.trim()) {
      filterRecents(newRecents, searchQuery)
    } else {
      setFilteredRecents(newRecents)
    }
  }

  const filterRecents = (items: RecentItem[], query: string) => {
    const trimmedQuery = query.trim().toLowerCase()
    if (!trimmedQuery) {
      setFilteredRecents(items)
      return
    }
    const filtered = items.filter(item =>
      item.path.toLowerCase().includes(trimmedQuery)
    )
    setFilteredRecents(filtered)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(() => {
      filterRecents(recents, value)
    }, 300) // 300ms 防抖延迟
  }

  // 当 recents 更新且没有搜索关键词时，同步 filteredRecents
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecents(recents)
    }
  }, [recents, searchQuery])

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

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
    } else {
      // 检查是否是文件不存在的错误
      const isFileNotFound = res.message?.includes('ENOENT') || 
                             res.message?.includes('不存在') ||
                             res.message?.includes('not found') ||
                             res.message?.includes('No such file')
      
      if (isFileNotFound) {
        setToast('文件不存在，已从列表中移除')
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast(res.message || '加载失败')
        setTimeout(() => setToast(null), 3000)
      }
      
      // 如果加载失败（特别是文件不存在），从列表中移除
      removeRecent(path)
      refreshRecents()
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
          {recents.length > 0 && (
            <div className="searchBox">
              <input
                type="text"
                className="searchInput"
                placeholder="搜索最近项目..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          )}
          {recents.length === 0 ? (
            <div className="noRecents">暂无最近项目</div>
          ) : filteredRecents.length === 0 ? (
            <div className="noRecents">未找到匹配的项目</div>
          ) : (
            <div className="recentItemsList">
              {filteredRecents.slice(0, 12).map(item => (
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
      
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            background: '#0B3042',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontSize: '0.85rem',
            maxWidth: '300px',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
