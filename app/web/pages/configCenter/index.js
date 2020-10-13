import React,{Fragment,useState,useEffect} from 'react';
import {Button,Divider,Table,message as Message,Popconfirm} from 'antd';
import {isEmpty} from 'lodash';
import { Link } from 'react-router-dom';
import ConfigFileModal from './components/configFileModal';
import {API} from '@/api';
import moment from 'moment';
import './style.scss';
const ConfigCenter = ()=>{
  const [configList,setConfigList] = useState([]);
  const [currentConfigFile,setCurrentConfigFile] = useState({});
  const [configFileModalVisible,setConfigFileModalVisible] = useState(false);
  const [tablePagination,setTablePagination] = useState({current:1,pageSize:20,total:0,hideOnSinglePage:true});
  const getTableColumns = ()=>{
    return [{
      title:'文件名',
      key:'filename',
      dataIndex:'filename',
      width:200,
      render:(value,row)=>  <Link to={`/page/config-detail/${row.id}`}>{value}</Link>
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
      title:'更新时间',
      key:'updated_at',
      dataIndex:'updated_at',
      render:(date)=>date ? moment(date).format('YYYY-MM-DD HH:mm:ss'):'',
      width:180
    },{
      title:'操作',
      key:'operation',
      width:140,
      render:(value,row)=>{
        return <Fragment>
          <a onClick={handleConfigFileEdit.bind(this,row)}>编辑</a>
          <Divider type="vertical"/>
          <Popconfirm title={`确认是否删除「${row.filename}」？`} onConfirm={handleConfigFileDelete.bind(this,row)}>
            <a >删除</a>
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
      const {success} = response;
      if(success){
        Message.success(`文件「${filename}」删除成功`);
        loadMainData();
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
    const {current,pageSize} = tablePagination;
    API.getConfigList({
      current,
      size:pageSize
    }).then((response)=>{
      const {success,data} = response;
      if(success){
        setConfigList(data.data);
        setTablePagination({
          ...tablePagination,
          total:data.total
        })
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
    <div className="header_title">
          <span className="title"></span>
          <Button icon="plus-circle" type="primary" onClick={handleConfigFileAdd}>新增配置</Button>
    </div>
    <div>
      <Table
        size="small"
        rowKey="id"
        scroll={{y: 'calc(100vh - 200px)'}}
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