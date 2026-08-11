import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    AppstoreOutlined,
    BookOutlined,
    CloudOutlined,
    CloudServerOutlined,
    DesktopOutlined,
    MoreOutlined,
    QuestionCircleOutlined,
    RobotOutlined,
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
import { getMenuState, NAV_MENU_LIST } from './nav-config';
import './style.scss';

const { SubMenu } = Menu;

const { Header } = Layout;

const iconMap: Record<string, React.ReactNode> = {
    appstore: <AppstoreOutlined />,
    cloud: <CloudOutlined />,
    ungroup: <UngroupOutlined />,
    book: <BookOutlined />,
    robot: <RobotOutlined />,
    more: <MoreOutlined />,
    'cloud-server': <CloudServerOutlined />,
    desktop: <DesktopOutlined />,
    setting: <SettingOutlined />,
    tag: <TagOutlined />,
};

const HeaderComponent = (props: any) => {
    const { location } = props;
    const { localIp = '127.0.0.1' } = useSelector((state: any) => state.global);
    const { pathname } = location;
    const initialMenuState = getMenuState(pathname, NAV_MENU_LIST);
    const [selectedKeys, setSelectedKeys] = useState(initialMenuState.selectedKeys);
    const [openKeys, setOpenKeys] = useState(initialMenuState.openKeys);
    const { changeLocalIp } = bindActionCreators(actions, useDispatch());
    useEffect(() => {
        const nextMenuState = getMenuState(pathname, NAV_MENU_LIST);
        setSelectedKeys(nextMenuState.selectedKeys);
        setOpenKeys(nextMenuState.openKeys);
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
                    selectedKeys={selectedKeys}
                    openKeys={openKeys}
                    onOpenChange={(keys) => setOpenKeys(keys as string[])}
                >
                    {NAV_MENU_LIST.map((nav: any) => {
                        const { children, name, path, iconKey } = nav;
                        const icon = iconMap[iconKey];
                        if (Array.isArray(children) && children.length > 0) {
                            return (
                                <SubMenu
                                    key={path}
                                    title={
                                        <span>
                                            {icon}
                                            <span>{name}</span>
                                        </span>
                                    }
                                >
                                    {children.map((navChild: any) => (
                                        <Menu.Item key={navChild.path}>
                                            {/* @ts-ignore */}
                                            <Link to={navChild.path}>
                                                {iconMap[navChild.iconKey]}
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
