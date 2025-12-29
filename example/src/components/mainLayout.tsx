import { Component } from 'solid-js';
import Header from './Header';
import Menu from './Menu';

const MainLayout: Component<{ children?: any }> = (props) => <div class="l-app-content">{props.children}</div>;

export default MainLayout;
