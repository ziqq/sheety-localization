import { lazy } from 'solid-js';

const routes = [
  {
    path: '/',
    component: lazy(() => import('./pages/sheety')),
  },
  {
    path: '/i18n',
    component: lazy(() => import('./pages/i18n')),
  },
  {
    path: '/sheety',
    component: lazy(() => import('./pages/sheety')),
  },
  {
    path: '/todo',
    component: lazy(() => import('./pages/todo')),
  },
];

export default routes;
