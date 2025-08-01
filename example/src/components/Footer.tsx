import { Component } from 'solid-js';

const Footer: Component = () => (
  <footer>
    <p>&copy; {new Date().getFullYear()} Booking App</p>
  </footer>
);

export default Footer;