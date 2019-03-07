import React from 'react';
import {Layout,Menu,Icon} from 'antd';
import {Link} from 'react-router-dom';
import './style.scss';

const {Header, Sider, Content,Footer} = Layout;
const SubMenu = Menu.SubMenu;

const navMenuList = [{
  name:'代理服务',
  path:'/page/proxy-server',
  icon:'cloud'
}]
export default class Index extends React.PureComponent{
  state={
    collapsed:true,
    selectedKeys:[]
  }
  handleCollapseChange=()=>{
    const {collapsed} = this.state;
    this.setState({
      collapsed:!collapsed
    })
  }
  componentDidMount(){
    this.setState({
      selectedKeys:[this.props.location.pathname]
    })
  }
  render(){
    const {collapsed,selectedKeys} = this.state;
    return (
      <Layout className="layout-main">
        <Sider 
          className="left" 
          collapsible
          collapsed={collapsed}
          onCollapse={this.handleCollapseChange}>
          <div className="logo"></div>
          <Menu 
            theme="dark"
            mode="inline"
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
          <Header style={{ background: '#fff', padding: 0 }}><span className="system-title">哆啦A梦</span></Header>
          <Content className="main-content-wrapper">
            <div className="main-content">
              {this.props.children}
            </div>
          </Content>
          <Footer style={{ textAlign: 'center' }}>
            Doraemon ©2018 Created by 袋鼠云数据应用前端
          </Footer>
        </Layout>
    </Layout>)
  }
}