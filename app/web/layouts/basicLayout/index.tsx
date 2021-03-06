import * as React from 'react';
import {Layout } from 'antd';
import classnames from 'classnames';
import { renderRoutes } from 'react-router-config'
import './style.scss';
import Header from '../header/header';
const { Content} = Layout;

const BasicLayout = (props: any)=>{
    const {className,route,location} = props;
    const { pathname } = location;
    return (
        <Layout className="layout-basic">
            <Header location={location}/>
            <Content className={classnames('main-content',className)}>
                <div className="context_container">{renderRoutes(route.routes)}</div>
            </Content>
        </Layout>)
}
export default BasicLayout;