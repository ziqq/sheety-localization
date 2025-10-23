import { Component } from 'solid-js';
import Header from './header';
import Menu from './menu';

const MainLayout: Component<{ children?: any }> = (props) => <div class="l-app-content">{props.children}</div>;

export default MainLayout;
