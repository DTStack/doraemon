import React, { Component } from 'react';
import { Route,Redirect,Switch } from 'react-router-dom';
import {LocaleProvider} from 'antd';
import zhCN from 'antd/lib/locale-provider/zh_CN';
import routes from '@/router';

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
      <LocaleProvider locale={zhCN}>
        <Switch>
          {
            routes.map((route)=>{
              const {redirect,path} = route;
              if(redirect){
                return  <Redirect key={path} exact path={path} to={redirect}/>
              }else{
                const Layout = route.layout;
                const Component = route.component
                return <Route exact key={path} path={path} render={(props)=>(<Layout {...props}><Component/></Layout>)}/>
              }
            })
          }
        </Switch>
      </LocaleProvider>
    </div>;
  }
}

export default App;
