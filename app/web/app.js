import React,{useEffect} from 'react';
import { Route,Redirect,Switch } from 'react-router-dom';
import {bindActionCreators} from 'redux';
import {useDispatch} from 'react-redux';
import {LocaleProvider} from 'antd';
import zhCN from 'antd/lib/locale-provider/zh_CN';
import routes from '@/router';
import { renderRoutes } from 'react-router-config'
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
          renderRoutes(routes)
        }
      </Switch>
    </LocaleProvider>
  </div>
}

export default App;
