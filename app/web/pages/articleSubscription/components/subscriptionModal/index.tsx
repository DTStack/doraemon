import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, message as Message, Form, TimePicker } from 'antd';
import moment from 'antd/node_modules/moment';
import { isFunction } from 'lodash';
import { API } from '@/api';
import './style.scss'

const FormItem = Form.Item;
const { TextArea } = Input;
const { Option, OptGroup } = Select;

const SubscriptionModal = (props: any) => {
    const [form] = Form.useForm();
    const { visible, data, topicList, onOk, onCancel } = props;
    const [confirmLoading, setConfirmLoading] = useState(false);

    useEffect(() => {
        if (visible && data) {
            const { groupName = '', webHook = '', remark = '', topicIds = [], sendType = 1, sendCron = '', time = '' } = data
            form.setFieldsValue({
                groupName, webHook, remark, topicIds, time
            })
        }
    }, [visible])

    const updataSubscription = (params: any) => {
        setConfirmLoading(true);
        API[params.id ? 'updataSubscription' : 'createSubscription'](params).then(({ success, msg }) => {
            if (success) {
                Message.success(params.id ? '编辑成功' : '新增成功')
                isFunction(onOk) && onOk()
                restData()
            } else {
                Message.error(msg);
            }
        }).finally(() => {
            setConfirmLoading(false)
        })
    }

    const handleModalOk = () => {
        form.validateFields().then((values: any) => {
            updataSubscription(Object.assign(values, {
                id: data?.id || ''
            }))
        })
    }

    const handleModalCancel = () => {
        isFunction(onCancel) && onCancel()
        restData()
    }

    const restData = () => {
        setConfirmLoading(false)
        form.resetFields()
    }

    const handleTopicChange = (value, option) => {
        console.log(123, value, option)
    }

    const handleTimeChange = (value) => {
        console.log(2222, value)
    }

    return (<Modal
            title={data ? '编辑' : '新增'}
            visible={visible}
            maskClosable={false}
            confirmLoading={confirmLoading}
            onOk={handleModalOk}
            onCancel={handleModalCancel}>
            <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 17 }} initialValues={{ ...data }}>
                <FormItem
                    label="钉钉群名称"
                    name="groupName"
                    rules={[{ required: true, message: '请输入钉钉群名称' }]}
                    hasFeedback
                >
                    <Input placeholder="请输入钉钉群名称" />
                </FormItem>
                <FormItem
                    label="webHook"
                    name="webHook"
                    rules={[{ required: true, message: '请输入webHook' }]}
                    hasFeedback
                >
                    <Input placeholder="请输入webHook" />
                </FormItem>
                <FormItem
                    label="订阅项"
                    name="topicIds"
                    rules={[{ required: true, message: '请选择订阅项，最多三个' }]}
                    hasFeedback
                >
                    <Select
                        showSearch
                        mode="multiple"
                        onChange={handleTopicChange}
                    >
                        {
                            topicList.map(site => {
                                return (
                                    <OptGroup key={site.name} label={site.name}>
                                        {
                                            site?.children?.map(item => {
                                                return <Option key={item.id} value={item.name}>{item.name}</Option>
                                            })
                                        }
                                    </OptGroup>
                                )
                            })
                        }
                    </Select>
                </FormItem>
                <FormItem
                    label="推送时间"
                    name="sendTime"
                    rules={[{ required: true, message: '请选择推送时间' }]}
                    hasFeedback
                >
                    <div className="send-time">
                        <Select style={{ width: 120 }} defaultValue="1" onChange={handleTimeChange}>
                            <Option value="1">周一至周五</Option>
                            <Option value="2">每天</Option>
                        </Select>

                        {/* <TimePicker style={{ width: 200 }} defaultValue={moment('09:20', 'HH:mm')} minuteStep={5} format="HH:mm" disabledHours={() => { return [0, 1, 2, 3, 4, 5, 6] }} /> */}
                        <TimePicker style={{ width: 200 }} defaultValue={moment('09:20', 'HH:mm')} minuteStep={5} format="HH:mm" />
                    </div>
                </FormItem>
                <FormItem
                    label="备注"
                    name="remark"
                    hasFeedback
                >
                    <TextArea placeholder="请输入备注" rows={4} />
                </FormItem>
            </Form>
        </Modal>)
}
export default SubscriptionModal;
