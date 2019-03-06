import React, { Component } from 'react';
import { Route,Redirect,Switch } from 'react-router-dom';
import MainLayout from '@/layouts/mainLayout';
import Home from '@/pages/home';
import ProxyServer from '@/pages/proxyServer';

const urlPrefix = '/page'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { current: 'home' };
  }

  handleClick(e) {
    console.log('click ', e, this.state);
    this.setState({
      current: e.key
    });
  }

  render() {
    return <div style={{height:'100%'}}>
      <Switch>
        <Redirect exact path='/' to={{pathname:`${urlPrefix}/home`}}/>
        <Route exact path={`${urlPrefix}/home`} render={(props)=>(<MainLayout {...props}><Home/></MainLayout>)}/>
        <Route exact path={`${urlPrefix}/proxy-server`} render={(props)=>(<MainLayout {...props}><ProxyServer/></MainLayout>)}/>
      </Switch>
    </div>;
  }
}

export default App;
