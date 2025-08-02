import { lazy } from 'solid-js';

const routes = [
  {
    path: '/',
    component: lazy(() => import('./pages/PageOne')),
  },
  {
    path: '/page-one',
    component: lazy(() => import('./pages/PageOne')),
  },
  {
    path: '/page-two',
    component: lazy(() => import('./pages/PageTwo')),
  },
  {
    path: '/page-three',
    component: lazy(() => import('./pages/PageThree')),
  },
  {
    path: '/todo',
    component: lazy(() => import('./pages/TodoList')),
  },
];

export default routes;
