import React,{useEffect} from 'react';
import { Route,Redirect,Switch } from 'react-router-dom';
import {bindActionCreators} from 'redux';
import {useDispatch} from 'react-redux';
import {LocaleProvider} from 'antd';
import zhCN from 'antd/lib/locale-provider/zh_CN';
import routes from '@/router';
import * as actions from '@/store/actions';


const App = ()=>{
  const {changeLocalIp} = bindActionCreators(actions,useDispatch());
  useEffect(()=>{
    changeLocalIp();
  },[])
  return  <div style={{height:'100%'}}>
    <LocaleProvider locale={zhCN}>
      <Switch>
        {
          routes.map((route)=>{
            const {redirect,path} = route;
            if(redirect){
              return  <Redirect key={path} exact path={path} to={redirect}/>
            }else{
              const Layout = route.layout;
              const Component = route.component;
              return <Route exact={path!=='*'} key={path} path={path} render={(props)=>(Layout?<Layout {...props}><Component {...props}/></Layout>:<Component {...props}/>)}/>
            }
          })
        }
      </Switch>
    </LocaleProvider>
  </div>
}

export default App;
