import * as React from 'react';
import { Layout, Modal } from 'antd';
import classnames from 'classnames';
import { renderRoutes } from 'react-router-config'
import './style.scss';
import Header from '../header/header';
import { ChromeOutlined } from '@ant-design/icons';
const { Content} = Layout;

const BasicLayout = (props: any)=>{
    const {className, route, location} = props;
    const { pathname } = location;

    // 如果弹出过哆啦A梦 Chrome 插件的弹框，则后续不再弹出
    React.useEffect(() => {
        const key = 'show_chrome_tool'
        const hasBeenShowed = localStorage.getItem(key) === 'yes'
        const chromeToolUrl = 'https://github.com/JackWang032/doraemon-proxy-tool'

        !hasBeenShowed && Modal.info({
            title: '哆啦A梦 Chrome 插件',
            icon: <ChromeOutlined />,
            content: <>
                <p>支持代理服务的快速切换环境、数栈自动登录等功能，请点击下方链接了解详情：</p>
                <a href={chromeToolUrl} target='_blank'>{chromeToolUrl}</a>
            </>,
            onOk() {
                localStorage.setItem(key, 'yes')
            }
        });
    }, [pathname])

    return (
        <Layout className="layout-basic">
            <Header location={location}/>
            <Content className={classnames('main-content',className)}>
                <div className="context_container">{renderRoutes(route.routes)}</div>
            </Content>
        </Layout>)
}
export default BasicLayout;
