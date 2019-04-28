import React from 'react';
import {Layout,Menu,Icon} from 'antd';
import {Link} from 'react-router-dom';
import BasicLayout from '@/layouts/basicLayout';
import './style.scss';

const {Sider, Content,Footer} = Layout;
const SubMenu = Menu.SubMenu;

const navMenuList = [{
  name:'邮件签名制作',
  path:'/page/mail-sign',
  icon:'solution'
},{
  name:'公司内部网址导航',
  path:'/page/internal-url-navigation',
  icon:'bars'
},{
  name:'工具箱',
  path:'/page/toolbox',
  icon:'appstore'
},{
  name:'代理服务',
  path:'/page/proxy-server',
  icon:'cloud'
},]
export default class SiderLayout extends React.PureComponent{
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
      <BasicLayout>
        <Layout className="layout-main">
          <Sider 
            className="left" 
            collapsible
            collapsed={collapsed}
            style={{height:'100%'}}
            onCollapse={this.handleCollapseChange}>
            <Menu 
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
            <Content className="right-content-wrapper">
              <div className="right-content">
                {this.props.children}
              </div>
            </Content>
            <Footer style={{ textAlign: 'center' }}>
              Doraemon ©2018 Created by 袋鼠云数据应用前端
            </Footer>
          </Layout>
        </Layout>
    </BasicLayout>)
  }
}