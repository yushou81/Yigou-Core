
import Canvas from './components/canvas/Canvas'


function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas />
      
    </div>
  )
}

export default App
