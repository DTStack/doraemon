import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Modal, Input, Table, Popconfirm, Form, Switch, message } from 'antd'

import { API } from '@/api';
import './style.scss'

const { Item } = Form

const formItemLayout: any = {
  labelCol: {
      span: 6
  },
  wrapperCol: {
      span: 16
  }
};

interface Props  {
  className?: string,
  showSwitch?: boolean,
  id: number,
  type: string
}

function DTDingConfig(props: Props) {
  const { 
    id,
    type,
    className,
    showSwitch
  } = props

  const [form] = Form.useForm();
  const [dingTalkList, setDingtalkList] = useState<any[]>([])
  const [visible, setVisible] = useState<boolean>(false)

  const loadDingTalkList = useCallback(() => {
    API.getConfigNoticeUrlList({id, type})
      .then((res: any)=>{
        const { success, data } = res;
        if(success){
          setDingtalkList(data)
        }
      })
    }, [id, type],
  ) 

  const handleDelDing = (id: number) => {
    return API.delNoticeUrl({id, type})
      .then((res: any)=>{
        const { success } = res;
        if(success){
          message.success('删除成功！')
          loadDingTalkList()
        }
      })
  } 

  const addDingTalk = (webHook: string, accept_group: string) => {
    API.addConfigNoticeUrl({ id, webHook, type, accept_group })
      .then((response)=>{
        const { success } = response;
        if(success){
          message.success('添加成功！')
          handleModalCancel()
          loadDingTalkList()
        }
      })
  }    

  useEffect(() => {
    loadDingTalkList()
  }, [loadDingTalkList])

  const handleModalCancel = () => {
    const { resetFields } = form

    setVisible(false)
    resetFields()
  }

  const handleModalOk = () => {
    const { validateFields } = form

    validateFields().then(value => {
      const { accept_group, webHook } = value
      addDingTalk(webHook, accept_group)
      })
  }

  const checkFormat = (rule: any, value: string, callback: Function) => {
    if (!value.includes('https://oapi.dingtalk.com/robot/send?access_token=')) {
      callback(new Error('地址格式异常'))
    } else{
      callback()
    }
  }

  const checkReapt = (rule: any, value: string, callback: Function) => {
      dingTalkList.some(({accept_group}) => {
        if(accept_group === value) {
          callback(new Error('已存在该接收群组'))
        }
      })
      callback()
  }

  const columns = [
      {
        title: '接收群组',
        key: 'accept_group',
        dataIndex: 'accept_group',
        width: '70%',
        ellipsis: true
      },
      {
        title: '操作',
        key: 'operation',
        dataIndex: 'operation',
        width: '30',
        render: (text: string, record: any) => {
          const { id } = record
          return (
            <Popconfirm title='确认是否删除？' onConfirm={() => handleDelDing(id)}>
              <a >删除</a>
            </Popconfirm>
          )
        }
      }
    ]

  return (
    <Card 
      title="钉钉通知配置" 
      className={`dt-ding-config ${className}`}
      extra={showSwitch && <Switch checkedChildren="开" unCheckedChildren="关" defaultChecked/>}
      >
        <Button onClick={() => setVisible(true)} ghost>
          添加配置
        </Button>
        <Table 
          rowKey='id'
          columns={columns} 
          dataSource={dingTalkList} 
          className='dt-table-border dt-table-last-row-noborder'
          scroll={{y: 285}}
          pagination={false}
          />
        <Modal
            visible={visible}
            title="添加钉钉通知"
            onCancel={handleModalCancel}
            onOk={handleModalOk}
        >
            <Form form={form} {...formItemLayout} requiredMark={false} autoComplete="off">
              <Item 
                label="接收群组" 
                name="accept_group"
                validateFirst={true}
                rules={[{required: true, message: '请输入接收群组'}, {validator: checkReapt}]}
              >
                <Input placeholder='请输入接收群组' maxLength={255}/>
              </Item>
              <Item 
                label="webHook"
                name="webHook"
                validateFirst={true}
                rules={[{required: true, message: '请输入webhook'}, {validator: checkFormat}]}
              >
                <Input placeholder='请输入webhook' maxLength={255}/>
              </Item>
            </Form>
        </Modal>
    </Card>
  )
}

export default DTDingConfig