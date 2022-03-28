import React, { useState, useEffect } from 'react';
import { AppstoreOutlined, CloudOutlined, DesktopOutlined, TagOutlined, SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as actions from '@/store/actions';
import logo from '@/asset/images/logo.png';
import config from '../../../../env.json';
import './style.scss';

const { SubMenu } = Menu;

const { Header } = Layout;

const navMenuList: any = [{
    name: '应用中心',
    path: '/page/toolbox',
    icon: <AppstoreOutlined />,
    routers: ['toolbox', 'switch-hosts-list', 'switch-hosts-edit', 'article-subscription-list']
}, {
    name: '代理服务',
    path: '/page/proxy-server',
    icon: <CloudOutlined />,
    routers: ['proxy-server']
}, {
    name: '主机管理',
    path: '/page/host-management',
    icon: <DesktopOutlined />,
    routers: ['host-management']
}, {
    name: '配置中心',
    path: '/page/config-center',
    icon: <SettingOutlined />,
    routers: ['config-center', 'config-detail']
}, {
    name: '标签管理',
    path: '/page/tags',
    icon: <TagOutlined />,
    routers: ['tags']
}]
const HeaderComponent = (props: any) => {
    const { location } = props;
    const { localIp = '127.0.0.1' } = useSelector((state: any) => state.global);
    const { pathname } = location;
    const [selectedKeys, setSelectedKeys] = useState([pathname]);
    const { changeLocalIp } = bindActionCreators(actions, useDispatch());
    const handleSelectedKeys = (e: any) => {
        setSelectedKeys(e.key);
    }
    useEffect(() => {
        let current = navMenuList.filter(item => item.routers.some((ele) => pathname.indexOf(ele) > -1))
        current.length && setSelectedKeys([current[0].path])
    }, [pathname])

    return (
        <Header className="dt-layout-header header_component">
            <div className="dt-header-log-wrapper logo">
                <Link to='/page/toolbox'>
                    <img className="logo_img" src={logo} />
                    <span className="system-title">Doraemon</span>
                </Link>
            </div>
            <div className="menu_content">
                <Menu
                    mode="horizontal"
                    theme="dark"
                    onClick={handleSelectedKeys}
                    selectedKeys={selectedKeys}>
                    {
                        navMenuList.map((nav: any) => {
                            const { children, name, path, icon } = nav;
                            if (Array.isArray(children) && children.length > 0) {
                                return <SubMenu key={name} title={<span>{icon}<span>Navigation Two</span></span>}>{children.map((navChild: any) => <Menu.Item key={navChild.path}><Link to={navChild.path}>{navChild.icon}<span>{navChild.name}</span></Link></Menu.Item>)}</SubMenu>;
                            } else {
                                return <Menu.Item key={path}><Link to={path}>{icon}<span>{name}</span></Link></Menu.Item>;
                            }
                        })
                    }
                </Menu>
                <div>
                    <a href={config?.helpDocUrl || ''} rel="noopener noreferrer" target='_blank'>
                        <QuestionCircleOutlined className="help-link" />
                    </a>
                    <span className="local-ip ml-20">{`本机IP: ${localIp}`}</span>

                    {/* 主动更新本地IP */}
                    <SyncOutlined className='refresh-cion' onClick={changeLocalIp} />
                </div>
            </div>
        </Header>
    );
}
export default HeaderComponent;
