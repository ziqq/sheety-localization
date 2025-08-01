import { lazy } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import MainLayout from './layouts/MainLayout';

const Home = lazy(() => import('./pages/Home'));
const Booking = lazy(() => import('./pages/Booking'));
const Confirmation = lazy(() => import('./pages/Confirmation'));
const NotFound = lazy(() => import('./pages/NotFound'));

const RoutesConfig = () => (
  <Router>
    <MainLayout>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/booking" component={Booking} />
        <Route path="/confirmation" component={Confirmation} />
        <Route path="*" component={NotFound} />
      </Router>
    </MainLayout>
  </Router>
);

export default RoutesConfig;