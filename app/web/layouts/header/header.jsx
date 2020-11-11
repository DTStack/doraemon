import React, { useState } from 'react';
import { Layout, Row, Col, Menu, Icon } from 'antd';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logo from '../../asset/images/logo.svg';
import './style.scss';

const { Header } = Layout;
const navMenuList = [{
  name: '应用中心',
  path: '/page/toolbox',
  icon: 'appstore'
},{
  name: '代理服务',
  path: '/page/proxy-server',
  icon: 'cloud'
},{
  name:'主机管理',
  path:'/page/host-management',
  icon:'desktop'
},{
  name: '配置中心',
  path: '/page/config-center',
  icon: 'setting'
}]
const HeaderComponent = (props) => {
  const { location } = props;
  const { localIp } = useSelector((state) => state.global);
  const { pathname } = location;
  const [selectedKeys, setSelectedKeys] = useState([pathname]);
  const handleSelectedKeys = (e) => {
    setSelectedKeys(e.key);
  }
  return (
        <Header className="dt-layout-header header_component">
            <div className="dt-header-log-wrapper logo">
                <Link to='/page/home'>
                    <img className="logo_img" src={logo} />
                    <span className="system-title">哆啦A梦</span>
                </Link>
            </div>
            <div className="menu_content">
                <Menu
                        mode="horizontal"
                        theme="dark"
                        onClick={handleSelectedKeys}
                        selectedKeys={selectedKeys}>
                        {
                            navMenuList.map((nav) => {
                              const { children, name, path, icon } = nav;
                              if (Array.isArray(children) && children.length > 0) {
                                return <SubMenu key={name} title={<span><Icon type={icon} /><span>Navigation Two</span></span>}>{children.map((navChild) => <Menu.Item key={navChild.path}><Link to={navChild.path}><Icon type={navChild.icon} /><span>{navChild.name}</span></Link></Menu.Item>)}</SubMenu>
                              } else {
                                return <Menu.Item key={path}><Link to={path}><Icon type={icon} /><span>{name}</span></Link></Menu.Item>
                              }
                            })
                        }
                  </Menu>
                <div><span className="local-ip">{`本机IP: ${localIp}`}</span></div>
            </div>
        </Header>)
}
export default HeaderComponent;