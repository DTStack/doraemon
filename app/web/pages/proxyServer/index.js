import React from 'react';
import {Row,Col,Button,Table,message as Message, Divider, Modal,Badge,Popconfirm} from 'antd';
import {API} from '@/api';
import ProxyServerModal from './components/proxyServerModal';
import ProxyRuleModal from './components/proxyRuleModal';
import './style.scss';

const confirm = Modal.confirm;
export default class ProxyServer extends React.PureComponent{
  state={
    //代理服务
    currentProxyServer:{},
    proxyServerModalVisible:false,
    proxyServerModalConfirmLoading:false,
    //代理规则
    currentProxyRule:{},
    proxyRuleModalVisible:false,
    proxyRuleModalConfirmLoading:false,
    //主表格
    mainTableLoading:true,
    maintTableList:[],
    maintTableTotal:10,
    mainTableParams:{
      pageNo:1,
      pageSize:10
    },
    expandedRowKeys:[],
    //子表格
    subTableData:[],
    subTableLoading:true,
  }
  //获取页面主要数据
  loadMainData(){
    const {mainTableParams} = this.state;
    this.setState({
      mainTableLoading:true
    });
    API.getProxyServerList(mainTableParams).then((response)=>{
      const {success,data,message} = response;
      if(success){
        this.setState({
          maintTableList:data.data,
          maintTableTotal:data.count,
          mainTableLoading:false
        });
      }else{
        Message.error(message);
        this.setState({
          mainTableLoading:false
        });
      }
    });
  }
  //获取子表格数据
  loadSubTableData(row){
    const {id} = row;
    this.setState({
      subTableLoading:true
    });
    API.getProxyRuleList({
      proxy_server_id:id
    }).then((response)=>{
      const {success,data,message} = response;
      if(success){
        this.setState({
          subTableData:data.data,
          subTableLoading:false
        });
      }else{
        Message.error(message);
        this.setState({
          subTableLoading:false
        });
      }
    });
  }
  /**
   * 代理服务
   */
  //编辑
  handleProxyServerEdit=(row)=>{
    this.setState({
      currentProxyServer:row,
      proxyServerModalVisible:true
    });
  }
  //删除
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
  handleProxyServerModalOk=(proxyServer)=>{
    const {currentProxyServer} = this.state;
    this.setState({
      proxyServerModalConfirmLoading:true
    });
    API[proxyServer.id?'updateProxyServer':'addProxyServer'](proxyServer).then((response)=>{
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
  handleProxyServerModalCancel=()=>{
    this.ProxyServerModal.resetFields();
    this.setState({
      currentProxyServer:{},
      proxyServerModalConfirmLoading:false,
      proxyServerModalVisible:false
    });
  }
  handleProxyServerDelete=(row)=>{
    const {id,name} = row;
    confirm({
      title:'确认',
      content:`确认是否删除服务「${name}」`,
      onOk:()=>{
        API.deleteProxyServer({
          id
        }).then((response)=>{
          const {success,message} = response;
          if(success){
            Message.success(`代理服务删除成功`);
            this.loadMainData();
          }else{
            Message.error(message);
          }
        });
      }
    })
  }
  /**
   * 代理规则
   */
  handleProxyRuleEdit=(row)=>{
    this.setState({
      currentProxyRule:row,
      proxyRuleModalVisible:true
    });
  }
  handleProxyRuleDelete=(row,mainTableRow)=>{
    const {name} = mainTableRow;
    const {ip} = row;
    API.deleteProxyRule({
      id:row.id
    }).then((response)=>{
      const {success,message} = response;
      if(success){
        Message.success(`代理服务「${name}」下的代理规则「${ip}」删除成功`);
        this.loadSubTableData(mainTableRow);
      }else{
        Message.error(message);
      }
    });
  }
  handleProxyRuleModalOk=(proxyRule)=>{
    let apiFunName,actionType;
    const {maintTableList,expandedRowKeys} = this.state;
    const currentProxyServer = maintTableList.find((row)=>row.id===expandedRowKeys[0]);
    proxyRule['proxy_server_id'] = currentProxyServer.id;
    this.setState({
      proxyRuleModalConfirmLoading:true
    });
    if(proxyRule.id){
      apiFunName='updateProxyRule';
      actionType='编辑';    
    }else{
      apiFunName='addProxyRule';
      actionType='新增';
    }
    API[apiFunName](proxyRule).then((response)=>{
      const {success,message} = response;
      if(success){
        Message.success(`${actionType}代理规则成功`);
        this.loadSubTableData(currentProxyServer);
        this.handleProxyRuleModalCancel();
      }else{
        Message.error(message);
        this.setState({
          proxyRuleModalConfirmLoading:false
        });
      }
    });
  }
  handleProxyRuleModalCancel=()=>{
    this.ProxyRuleModal.resetFields();
    this.setState({
      currentProxyRule:{},
      proxyRuleModalConfirmLoading:false,
      proxyRuleModalVisible:false
    });
  }
  handleTableChange=(pagination)=>{
    const {current,size} = pagination;
    const {mainTableParams} = this.state;
    this.setState({
      mainTableParams:Object.assign({},mainTableParams,{
        pageNo:current,
        pageSize:size
      })
    },()=>{
      this.loadMainData();
    });
  }
  handleTableExpandChange=(expanded, record)=>{
    if(expanded){
      this.setState({
        expandedRowKeys:[record.id]
      });
      this.loadSubTableData(record);
    }else{
      this.setState({
        expandedRowKeys:[]
      });
    }
  }
  tableExpandedRowRender=(mainTableRow)=>{
    const {subTableLoading,subTableData} = this.state;
    const columns = [{
      title:'序号',
      key:'index',
      render:(value,row,index)=>index+1
    },{
      title:'IP',
      key:'ip',
      dataIndex:'ip'
    },{
      title:'目标代理服务地址',
      key:'target',
      dataIndex:'target',
      width:'30%'
    },{
      title:'备注',
      key:'remark',
      width:'30%',
      dataIndex:'remark'
    },{
      title:'操作',
      key:'action',
      render:(value,row,index)=>{
        return (<React.Fragment>
          <a href="javascript:void(0);" onClick={this.handleProxyRuleEdit.bind(this,row)}>编辑</a>
          <Divider type="vertical" />
          <Popconfirm placement="right" title="确认是否删除该代理规则" onConfirm={this.handleProxyRuleDelete.bind(this,row,mainTableRow)}>
            <a href="javascript:void(0);">删除</a>
          </Popconfirm>
        </React.Fragment>)
      }
    }]
    return <div style={{padding:'0 10px'}}>
      <div className="text-right"><Button icon="plus-circle" onClick={()=>{this.setState({proxyRuleModalVisible:true})}}>添加代理规则</Button></div>
      <Table
        size="small"
        rowKey={(row)=>row.id}
        style={{marginTop:10}}
        loading={subTableLoading}
        columns={columns}
        dataSource={subTableData}
        pagination={false}/>
    </div>
  }
  componentDidMount(){
    this.loadMainData();
  }
  render(){
    const {
      maintTableList,
      mainTableParams,
      maintTableTotal,
      mainTableLoading,
      expandedRowKeys,
      currentProxyServer,
      proxyServerModalVisible,
      proxyServerModalConfirmLoading,
      currentProxyRule,
      proxyRuleModalVisible,
      proxyRuleModalConfirmLoading
    } = this.state;
    const columns = [{
      title:'序号',
      key:'index',
      render:(value,row,index)=>index+1
    },{
      title:'名称',
      key:'name',
      dataIndex:'name'
    },{
      title:'代理服务地址',
      key:'proxy_server_address',
      dataIndex:'proxy_server_address'
    },{
      title:'默认代理目标',
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
          <a href="javascript:void(0);" onClick={this.handleProxyServerEdit.bind(this,row)}>编辑</a>
          <Divider type="vertical" />
          <a href="javascript:void(0);" onClick={this.handleProxyServerDelete.bind(this,row)}>删除</a>
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
      <Table
        rowKey={(row)=>row.id}
        style={{marginTop:10}}
        size="small"
        loading={mainTableLoading}
        columns={columns}
        dataSource={maintTableList}
        expandedRowKeys={expandedRowKeys}
        expandedRowRender={this.tableExpandedRowRender}
        onExpand={this.handleTableExpandChange}
        onChange={this.handleTableChange}
        pagination={{
          total:maintTableTotal,
          current:mainTableParams.pageNo,
          size:mainTableParams.pageSize
        }}/>

      <ProxyServerModal
        ref={(modal)=>this.ProxyServerModal=modal}
        editable={JSON.stringify(currentProxyServer)!=='{}'}
        proxyServer={currentProxyServer}
        confirmLoading={proxyServerModalConfirmLoading}
        visible={proxyServerModalVisible}
        onOk={this.handleProxyServerModalOk}
        onCancel={this.handleProxyServerModalCancel}/>
      <ProxyRuleModal
        ref={(modal)=>this.ProxyRuleModal=modal}
        editable={JSON.stringify(currentProxyRule)!=='{}'}
        proxyServer={currentProxyRule}
        confirmLoading={proxyRuleModalConfirmLoading}
        visible={proxyRuleModalVisible}
        onOk={this.handleProxyRuleModalOk}
        onCancel={this.handleProxyRuleModalCancel}/>
    </div>)
  }
}