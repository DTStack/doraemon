import React,{useState,useEffect} from 'react';
import {Table,Popconfirm,Divider,Typography,Button,Row,Col,message as Message} from 'antd';
import {replace} from 'lodash';
import {API} from '@/api';
import HostModal from './components/hostModal';
import PasswordModal from './components/passwordModal';
import './style.scss';
const {Paragraph} = Typography;
export default (props)=>{
  const [tableLoading,setTableLoading] = useState(false);
  const [hostList,setHostList] = useState([]);
  const [hostModalVisible,setHostModalVisible] = useState(false);
  const [passwordModalVisible,setPasswordModalVisible] = useState(false);
  const [currentHostModal,setCurrentHostModal] = useState({});
  const getColumns = ()=>{
    const columns = [{
      title:'主机IP',
      key:'hostIp',
      dataIndex:'hostIp'
    },{
      title:'主机名',
      key:'hostName',
      dataIndex:'hostName'
    },{
      title:'备注',
      key:'remark',
      dataIndex:'remark'
    },{
      title:'操作',
      key:'operation',
      render:(value,row)=>{
        return <span>
          <a href="javascript:void(0);" onClick={handleTableRowEdit.bind(this,row)}>编辑</a>
          <Divider type="vertical"/>
          <Popconfirm title={`确认是否删除该主机「${row.hostName}」?`} onConfirm={handleTableRowDelete.bind(this,row)}>
            <a href="javascript:void(0);">删除</a>
          </Popconfirm>
        </span>
      }
    }];
    return columns;
  }
  const expandedRowRender =(row)=>{
    const {username,hostIp,password} = row;
    const sshText = `ssh ${username}@${hostIp}`;
    return <div>
      <Row gutter={16}><Col style={{textAlign:'right'}} span={2}>用户名：</Col><Col span={12}><Paragraph editable={{onChange: handleTextChange.bind(this,row,'username')}} copyable={{text:username}}>{username}</Paragraph></Col></Row>
      <Row gutter={16} style={{marginTop:14}}><Col style={{textAlign:'right'}} span={2}>密码：</Col><Col span={12}><Paragraph editable={{editing:false,onStart: handlePasswordEdit.bind(this,row)}} copyable={{text:password}}>{replace(password,/./g,'*')}</Paragraph></Col></Row>
      <Row gutter={16} style={{marginTop:14}}><Col style={{textAlign:'right'}} span={2}>SSH链接：</Col><Col span={12}><Paragraph copyable={{text:sshText}}>{sshText}</Paragraph></Col></Row>
    </div>
  }
  const handleTextChange = (row,fieldName,value)=>{
    const {id,hostName} = row;
    API.editHost({
      id,
      [fieldName]:value
    }).then((response)=>{
      const {success,message} = response;
      if(success){
        Message.success(`主机「${hostName}」用户名修改成功`);
        loadTableData();
      }else{
        Message.error(message);
      }
    })
  }
  const handleHostModalAction = (type)=>{
    if(type==='ok'){
      loadTableData();
    }
    setHostModalVisible(false);
  }
  //新增主机
  const handleHostAdd = ()=>{
    setCurrentHostModal({});
    setHostModalVisible(true);
    loadTableData();
  }
  //编辑主机
  const handleTableRowEdit = (row)=>{
    setCurrentHostModal(row);
    setHostModalVisible(true);
    loadTableData();
  }
  //删除主机
  const handleTableRowDelete = (row)=>{
    const {id} = row;
    API.deleteHost({
      id
    }).then((response)=>{
      const {success,message} = response;
      if(success){
        Message.success('主机删除成功');
        loadTableData();
      }else{
        Message.error(message);
      }
    });
  }
  const handlePasswordEdit = (row)=>{
    setCurrentHostModal(row);
    setPasswordModalVisible(true);
  }
  const handlePasswordModalAction = (type)=>{
    if(type==='ok'){
      loadTableData();
    }
    setPasswordModalVisible(false);
  }
  const loadTableData = ()=>{
    setTableLoading(true);
    API.getHostList().then((response)=>{
      const {success,data,message} = response;
      if(success){
        setHostList(data);
      }else{
        Message.error(message);
      }
      setTableLoading(false);
    });
  }
  useEffect(()=>{
    loadTableData()
  },[])
  return <div className="page-host-management">
    <div style={{textAlign:'right'}}><Button type="primary" icon="plus-circle" onClick={handleHostAdd}>新增主机</Button></div>
    <Table
      size="small"
      rowKey="id"
      columns={getColumns()}
      loading={tableLoading}
      dataSource={hostList}
      pagination={false}
      expandedRowRender={expandedRowRender}/>
    <HostModal
      value={currentHostModal}
      visible={hostModalVisible}
      onOk={handleHostModalAction.bind(this,'ok')}
      onCancel={handleHostModalAction.bind(this,'cancel')}/>
    <PasswordModal
     value={currentHostModal}
     visible={passwordModalVisible}
     onOk={handlePasswordModalAction.bind(this,'ok')}
     onCancel={handlePasswordModalAction.bind(this,'cancel')}/>
  </div>
}