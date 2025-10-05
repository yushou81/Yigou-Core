// src/router.tsx
import { createBrowserRouter } from 'react-router-dom';
//import App from '../App';
import HomePage from '../components/HomePage';
//import AboutPage from './pages/AboutPage';
//import NotFoundPage from './pages/NotFoundPage';

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
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
  },
]);

export default router;
