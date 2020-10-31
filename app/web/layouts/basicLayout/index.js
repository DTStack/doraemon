import React from 'react';
import {Layout } from 'antd';
import classnames from 'classnames';
import { renderRoutes } from 'react-router-config'
import './style.scss';
import Header from '../header/header';
import SiderComponent from '../sider';
const { Content} = Layout;

const BasicLayout = (props)=>{
  const {className,route,location} = props;
  const { pathname } = location;
  return (
    <Layout className="layout-basic">
      <Header location={location}/>
      <Content className={classnames('main-content',className)}>
        {
          ['/page/config-center','/page/host-management'].includes(pathname)&&(
            <SiderComponent location={location}/>
          )
        }
        <div className="context_container">{renderRoutes(route.routes)}</div>
      </Content>
    </Layout>)
}
export default BasicLayout;