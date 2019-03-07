import React from 'react';
import {Row,Col,Button,Table,message as Message, Divider, Modal,Badge} from 'antd';
import {API} from '@/api';
import ProxyServerModal from './components/proxyServerModal';

const confirm = Modal.confirm;
export default class ProxyServer extends React.PureComponent{
  state={
    tableLoading:true,
    proxyServerModalVisible:false,
    proxyServerModalConfirmLoading:false,
    currentProxyServer:{},
    proxyServerList:[]
  }
  loadMainData(){
    this.setState({
      tableLoading:true
    });
    API.getProxyServerList().then((response)=>{
      const {success,data,message} = response;
      if(success){
        this.setState({
          proxyServerList:data.data,
          tableLoading:false
        });
      }else{
        Message.error(message);
        this.setState({
          tableLoading:false
        });
      }
    })
  }
  handleProxyServerModalOk=(proxyServer)=>{
    const {currentProxyServer,es} = this.state;
    this.setState({
      proxyServerModalConfirmLoading:true
    });
    API[JSON.stringify(currentProxyServer)==='{}'?'addProxyServer':'updateProxyServer'](proxyServer).then((response)=>{
      const {success,message} = response;
      if(success){
        Message.success(`${JSON.stringify(currentProxyServer)==='{}'?'新增':'编辑'}代理服务成功`)
        this.handleProxyServerModalCancel();
        this.loadMainData();
      }else{
        Message.error(message);
        this.setState({
          proxyServerModalConfirmLoading:false
        });
      }
    });
  }
  handleProxyServerChange=(row)=>{
    this.setState({
      currentProxyServer:row,
      proxyServerModalVisible:true
    });
  }
  handleProxyServerModalCancel=()=>{
    this.ProxyServerModal.resetFields();
    this.setState({
      proxyServerModalConfirmLoading:false,
      proxyServerModalVisible:false
    });
  }
  handleProxyServerStatusChange=(row)=>{
    const {status,id,name} = row;
    const statusStr = status===1?'禁用':'开启';
    confirm({
      title:'确认',
      content:`确认是否${statusStr}服务「${name}」`,
      onOk:()=>{
        API.changeProxyServerStatus({
          status:status===1?0:1,
          id
        }).then((response)=>{
          const {success,message} = response;
          if(success){
            Message.success(`代理服务${statusStr}成功`);
            this.loadMainData();
          }else{
            Message.error(message);
          }
        });
      }
    })
  }
  componentDidMount(){
    this.loadMainData();
  }
  render(){
    const {proxyServerList,tableLoading,proxyServerModalVisible,currentProxyServer} = this.state;
    const columns = [{
      title:'序号',
      key:'index',
      render:(value,row,index)=>index+1
    },{
      title:'名称',
      key:'name',
      dataIndex:'name'
    },{
      title:'pid',
      key:'pid',
      dataIndex:'pid'
    },{
      title:'代理服务地址',
      key:'proxy_server_address',
      dataIndex:'proxy_server_address'
    },{
      title:'代理目标',
      key:'target',
      dataIndex:'target'
    },{
      title:'状态',
      key:'status',
      dataIndex:'status',
      render:(value,row)=>{
        return <React.Fragment><Badge status={Boolean(value)?'success':'error'} text={Boolean(value)?'已开启':'已禁用'} /></React.Fragment>
      }
    },{
      title:'操作',
      key:'actions',
      render:(value,row)=>{
        const {status} = row;
        return (<React.Fragment>
          <a href="javascript:void(0);" onClick={this.handleProxyServerChange.bind(this,row)}>编辑</a>
          <Divider type="vertical" />
          <a href="javascript:void(0);">删除</a>
          <Divider type="vertical" />
          <a href="javascript:void(0);" onClick={this.handleProxyServerStatusChange.bind(this,row)}>{Boolean(status)?'禁用':'重启'}</a>
        </React.Fragment>)
      }
    }];
    return (<div className="page-proxy-server">
      <Row>
        <Col className="text-right" offset={16} span={8}>
          <Button type="primary" onClick={()=>{this.setState({proxyServerModalVisible:true})}}>添加代理服务</Button>
        </Col>
      </Row>
      <Table style={{marginTop:10}} size="small" loading={tableLoading} columns={columns} dataSource={proxyServerList}/>
      <ProxyServerModal 
        ref={(modal)=>this.ProxyServerModal=modal}
        editable={JSON.stringify(currentProxyServer)!=='{}'} 
        proxyServer={currentProxyServer}
        visible={proxyServerModalVisible}
        onOk={this.handleProxyServerModalOk}
        onCancel={this.handleProxyServerModalCancel}/>
    </div>)
  } 
}