
import Canvas from './components/canvas/Canvas'
import HomePage from './pages/HomePage/HomePage'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'


function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/canvas" element={<Canvas />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
