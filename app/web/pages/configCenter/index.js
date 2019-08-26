import React,{Fragment,useState,useEffect} from 'react';
import {Button,Divider,Table,message as Message,Popconfirm} from 'antd';
import {isEmpty} from 'lodash';
import {API} from '@/api';
import ConfigFileModal from './components/configFileModal';
import './style.scss';
const ConfigCenter = ()=>{
  const [configList,setConfigList] = useState([]);
  const [currentConfigFile,setCurrentConfigFile] = useState({});
  const [configFileModalVisible,setConfigFileModalVisible] = useState(false);
  const [tablePagination,setTablePagination] = useState({current:1,size:20,total:0});
  const getTableColumns = ()=>{
    return [{
      title:'文件名',
      key:'filename',
      dataIndex:'filename',
      width:200
    },{
      title:'路径',
      key:'filePath',
      dataIndex:'filePath',
      width:320
    },{
      title:'主机',
      key:'hostIp',
      dataIndex:'hostIp',
      width:180
    },{
      title:'备注',
      key:'remark',
      dataIndex:'remark'
    },{
      title:'操作',
      key:'operation',
      width:140,
      render:(value,row)=>{
        return <Fragment>
          <a target="_blank" href={`/page/config-detail/${row.id}`}>查看</a>
          <Divider type="vertical"/>
          <a href="javascript:void(0);" onClick={handleConfigFileEdit.bind(this,row)}>编辑</a>
          <Divider type="vertical"/>
          <Popconfirm title={`确认是否删除「${row.filename}」？`} onConfirm={handleConfigFileDelete.bind(this,row)}>
            <a href="javascript:void(0);" >删除</a>
          </Popconfirm>
        </Fragment>
      }
    }]
  }
  const handleConfigFileEdit = (row)=>{
    setCurrentConfigFile(row);
    setConfigFileModalVisible(true)
  }
  const handleConfigFileDelete = (row)=>{
    const {id,filename} = row;
    API.deleteConfig({
      id
    }).then((response)=>{
      const {success,message} = response;
      if(success){
        Message.success(`文件「${filename}」删除成功`);
        loadMainData();
      }else{
        Message.error(message);
      }
    });
  }
  const handleConfigFileAdd = ()=>{
    setConfigFileModalVisible(true);
    setCurrentConfigFile({});
  }
  const handleTableChange = (pagination,filters,sorter)=>{
    const {current} = pagination;
    setTablePagination({
      ...tablePagination,
      current
    });
  }
  const loadMainData=()=>{
    const {current,size} = tablePagination;
    API.getConfigList({
      current,
      size
    }).then((response)=>{
      const {success,data,message} = response;
      if(success){
        setConfigList(data.data);
        setTablePagination({
          ...tablePagination,
          total:data.total
        })
      }else{
        Message.error(message);
      }
    });
  }
  const handleConfigFileModalAction = (type)=>{
    setConfigFileModalVisible(false)
    if(type==='ok'){
      const isAdd = isEmpty(currentConfigFile);
      if(isAdd){
        if(tablePagination.current===1){
          loadMainData();
        }
        setTablePagination({
          ...tablePagination,
          current:1
        });
      }else{
        loadMainData();
      }
    }
  }
  useEffect(()=>{
    loadMainData();
  },[tablePagination.current])
  return <div className="page-config-center">
    <div style={{textAlign:'right'}}><Button icon="plus-circle" type="primary" onClick={handleConfigFileAdd}>新增配置</Button></div>
    <div style={{marginTop:20}}>
      <Table
        size="small"
        rowKey="id"
        columns={getTableColumns()}
        dataSource={configList}
        pagination={{
          ...tablePagination
        }}
        onChange={handleTableChange}/>
    </div>
    <ConfigFileModal
       value={currentConfigFile}
       visible={configFileModalVisible}
       onOk={handleConfigFileModalAction.bind(this,'ok')}
       onCancel={handleConfigFileModalAction.bind(this,'cancel')}/>
  </div>
}
export default ConfigCenter;