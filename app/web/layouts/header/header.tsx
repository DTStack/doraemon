import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    AppstoreOutlined,
    CloudOutlined,
    CloudServerOutlined,
    DesktopOutlined,
    QuestionCircleOutlined,
    SettingOutlined,
    SyncOutlined,
    TagOutlined,
    UngroupOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { bindActionCreators } from 'redux';

import logo from '@/asset/images/logo.png';
import * as actions from '@/store/actions';
import config from '../../../../env.json';
import './style.scss';

const { SubMenu } = Menu;

const { Header } = Layout;

const navMenuList: any = [
    {
        name: '应用中心',
        path: '/page/toolbox',
        icon: <AppstoreOutlined />,
        routers: ['toolbox', 'switch-hosts-list', 'switch-hosts-edit', 'article-subscription-list'],
    },
    {
        name: '代理服务',
        path: '/page/proxy-server',
        icon: <CloudOutlined />,
        routers: ['proxy-server'],
    },
    {
        name: 'MCP',
        path: '/page/mcp-server-market',
        icon: <UngroupOutlined />,
        routers: [
            'mcp-server-market',
            'mcp-server-registry',
            'mcp-server-management',
            'mcp-server-detail',
            'mcp-server-inspector',
        ],
    },
    {
        name: '主机管理',
        path: '/page/host-management',
        icon: <CloudServerOutlined />,
        routers: ['host-management'],
    },
    {
        name: '环境管理',
        path: '/page/env-management',
        icon: <DesktopOutlined />,
        routers: ['env-management'],
    },
    {
        name: '配置中心',
        path: '/page/config-center',
        icon: <SettingOutlined />,
        routers: ['config-center', 'config-detail'],
    },
    {
        name: '标签管理',
        path: '/page/tags',
        icon: <TagOutlined />,
        routers: ['tags'],
    },
];
const HeaderComponent = (props: any) => {
    const { location } = props;
    const { localIp = '127.0.0.1' } = useSelector((state: any) => state.global);
    const { pathname } = location;
    const [selectedKeys, setSelectedKeys] = useState([pathname]);
    const { changeLocalIp } = bindActionCreators(actions, useDispatch());
    const handleSelectedKeys = (e: any) => {
        setSelectedKeys(e.key);
    };
    useEffect(() => {
        const current = navMenuList.filter((item) =>
            item.routers.some((ele) => pathname.indexOf(ele) > -1)
        );
        current.length && setSelectedKeys([current[0].path]);
    }, [pathname]);

    return (
        <Header className="dt-layout-header header_component">
            <div className="dt-header-log-wrapper logo">
                {/* @ts-ignore */}
                <Link to="/page/toolbox">
                    <img className="logo_img" src={logo} />
                    <span className="system-title">Doraemon</span>
                </Link>
            </div>
            <div className="menu_content">
                <Menu
                    mode="horizontal"
                    theme="dark"
                    onClick={handleSelectedKeys}
                    selectedKeys={selectedKeys}
                >
                    {navMenuList.map((nav: any) => {
                        const { children, name, path, icon } = nav;
                        if (Array.isArray(children) && children.length > 0) {
                            return (
                                <SubMenu
                                    key={name}
                                    title={
                                        <span>
                                            {icon}
                                            <span>Navigation Two</span>
                                        </span>
                                    }
                                >
                                    {children.map((navChild: any) => (
                                        <Menu.Item key={navChild.path}>
                                            {/* @ts-ignore */}
                                            <Link to={navChild.path}>
                                                {navChild.icon}
                                                <span>{navChild.name}</span>
                                            </Link>
                                        </Menu.Item>
                                    ))}
                                </SubMenu>
                            );
                        } else {
                            return (
                                <Menu.Item key={path}>
                                    {/* @ts-ignore */}
                                    <Link to={path}>
                                        {icon}
                                        <span>{name}</span>
                                    </Link>
                                </Menu.Item>
                            );
                        }
                    })}
                </Menu>
                <div>
                    <a href={config?.helpDocUrl || ''} rel="noopener noreferrer" target="_blank">
                        <QuestionCircleOutlined className="help-link" />
                    </a>
                    <span className="local-ip ml-20">{`本机IP: ${localIp}`}</span>

                    {/* 主动更新本地IP */}
                    <SyncOutlined className="refresh-cion" onClick={() => changeLocalIp(true)} />
                </div>
            </div>
        </Header>
    );
};
export default HeaderComponent;
