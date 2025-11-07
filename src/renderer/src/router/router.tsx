// src/router.tsx
import { BrowserRouter, createBrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
//import App from '../App';
import HomePage from '../components/HomePage';
import Canvas from '@renderer/components/canvas/Canvas'
//import AboutPage from './pages/AboutPage';
//import NotFoundPage from './pages/NotFoundPage';

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path:"/canvas",
    element:<Canvas />,
  },
    /*
    children: [

      {
        path: "home",
        element: <HomePage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "*",  // 这是用于处理找不到页面的情况
        element: <NotFoundPage />,
      },

    ],

       */

]);

export default router;
