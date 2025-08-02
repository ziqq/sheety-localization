import { Component } from 'solid-js';
import Header from './components/Header';
import Menu from './components/Menu';

const App: Component<{ children: any }> = (props) => (
  <div class="l-app">
    <Header class="l-app__header" />
    <div class="l-app__body l-app-body">
      <Menu class="l-app-body__drawer" />
      <div class="l-app-body__content">
        <main>{props.children}</main>
      </div>
    </div>
  </div>
);

export default App;
