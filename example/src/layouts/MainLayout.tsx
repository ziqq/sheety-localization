import { Component } from 'solid-js';
import Header from '../components/Header';
import Menu from '../components/Menu';

const MainLayout: Component<{ children?: any }> = (props) => <div class="l-app-content">{props.children}</div>;

export default MainLayout;
