import React,{useState} from 'react';
import {Layout,Menu,Icon} from 'antd';
import {Link} from 'react-router-dom';
import BasicLayout from '@/layouts/basicLayout';
import './style.scss';
const {Sider, Content,Footer} = Layout;
const SubMenu = Menu.SubMenu;

const navMenuList = [{
  name:'应用中心',
  path:'/page/toolbox',
  icon:'appstore'
},{
  name:'代理服务',
  path:'/page/proxy-server',
  icon:'cloud'
},{
  name:'主机管理',
  path:'/page/host-management',
  icon:'desktop'
},{
  name:'配置中心',
  path:'/page/config-center',
  icon:'setting'
}]
const SiderLayout = (props)=>{
  const {location,children} = props;
  const {pathname} = location;
  const [collapsed,setCollapsed] = useState(false);
  const [selectedKeys,setSelectedKeys] = useState([pathname]);
  const handleCollapseChange = ()=>{
    setCollapsed(!collapsed)
  }
  return (
    <BasicLayout>
      <Layout className="layout-main">
        <Sider
          trigger={null} 
          collapsible 
          collapsed={collapsed}
          style={{height:'100%',background:'#262E36'}}
        >
          <div className="collapsed-wrap">
            <Icon
              className="trigger"
              type={collapsed ? 'menu-unfold' : 'menu-fold'}
              onClick={handleCollapseChange}
            />
          </div>
          <Menu
            mode="inline"
            theme="dark"
            style={{background:'#262E36'}}
            selectedKeys={selectedKeys}>
            {
              navMenuList.map((nav)=>{
                const {children,name,path,icon} = nav;
                if(Array.isArray(children)&&children.length>0){
                  return <SubMenu key={name} title={<span><Icon type={icon} /><span>Navigation Two</span></span>}>{children.map((navChild)=><Menu.Item key={navChild.path}><Link to={navChild.path}><Icon type={navChild.icon} /><span>{navChild.name}</span></Link></Menu.Item>)}</SubMenu>
                }else{
                  return <Menu.Item key={path}><Link to={path}><Icon type={icon} /><span>{name}</span></Link></Menu.Item>
                }
              })
            }
          </Menu>
        </Sider>
        <Layout className="right">
          <Content className="right-content-wrapper">
            <div className="right-content">
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </BasicLayout>)
}
export default SiderLayout;