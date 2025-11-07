
//import Canvas from './components/canvas/Canvas'
//import HomePage from './pages/HomePage/HomePage'
//import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
    <div className="App">

      <RouterProvider router={router} />

    </div>

  <Canvas/>
    </>
  )
}

export default App
