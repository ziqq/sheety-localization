import { Component, lazy } from 'solid-js';
import { Route } from '@solidjs/router';

const Home = lazy(() => import('../pages/Home'));
const Booking = lazy(() => import('../pages/Booking'));

const Header: Component = () => (
  <header>
    <nav>
      <Route path="/" component={Home}>Home</Route>
      <Route path="/booking" component={Booking}>Booking</Route>
    </nav>
  </header>
);

export default Header;