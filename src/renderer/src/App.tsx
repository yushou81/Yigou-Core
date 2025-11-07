
//import Canvas from './components/canvas/Canvas'
//import HomePage from './pages/HomePage/HomePage'
import React from 'react';
import { RouterProvider } from 'react-router-dom'
import'./App.css'
import router from '@renderer/router/router'

function App(): React.JSX.Element {
  //const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
      <div className="App">
        <RouterProvider router={router} />
      </div>

  )
}


export default App
