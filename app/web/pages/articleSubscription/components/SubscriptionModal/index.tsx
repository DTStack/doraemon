import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, message as Message, Form } from 'antd';
import ChooseSendTime from '../ChooseSendTime';
import { SUBSCRIPTIONSENDTYPE } from '../../consts';
import { isFunction } from 'lodash';
import { API } from '@/api';
import './style.scss'

const FormItem = Form.Item
const { TextArea } = Input
const { Option, OptGroup } = Select

const SubscriptionModal = (props: any) => {
    const [form] = Form.useForm()
    const { visible, data, topicList, onOk, onCancel } = props
    const [confirmLoading, setConfirmLoading] = useState(false)
    const [siteNames, setSiteNames] = useState('')

    useEffect(() => {
        visible && form.resetFields()
        if (visible && data) {
            const { groupName = '', webHook = '', remark = '', topicIds = [], siteNames = '', sendType = SUBSCRIPTIONSENDTYPE.WORKDAY, time = '' } = data
            setSiteNames(siteNames)
            form.setFieldsValue({
                groupName,
                webHook,
                remark,
                topicIds,
                sendTime: {
                    sendType,
                    time
                }
            })
            form.validateFields()
        }
    }, [visible])

    const updateSubscription = (params: any) => {
        setConfirmLoading(true)
        API[params.id ? 'updateSubscription' : 'createSubscription'](params).then(({ success, msg }) => {
            if (success) {
                Message.success(params.id ? '编辑成功' : '新增成功')
                isFunction(onOk) && onOk()
            } else {
                Message.error(msg)
            }
        }).finally(() => {
            setConfirmLoading(false)
        })
    }

    const handleModalOk = () => {
        form.validateFields().then((values: any) => {
            const { sendTime, topicIds = [] } = values
            const { sendType, time } = sendTime
            const sendCron = getCron(sendType, time)
            updateSubscription(Object.assign(values, {
                id: data?.id || '',
                topicIds,
                siteNames,
                sendType,
                sendCron,
                status: data?.status,
                time
            }))
        })
    }

    // 转换成 cron 格式
    const getCron = (type, time = '09:00') => {
        let cron = ''
        const hour = time.split(':')[0]
        const minute = time.split(':')[1]
        if (type === SUBSCRIPTIONSENDTYPE.WORKDAY) {
            cron = `0 ${ minute } ${ hour } ? * MON-FRI`
        } else if (type === SUBSCRIPTIONSENDTYPE.EVERYDAY) {
            cron = `0 ${ minute } ${ hour } ? * *`
        }
        return cron
    }

    const handleModalCancel = () => {
        isFunction(onCancel) && onCancel()
    }

    const handleTopicChange = (value, option) => {
        setSiteNames(Array.from(new Set(option.map(item => item.children.split(' - ')[0]))).join('、'))
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
                    rules={[
                        { required: true, message: '请输入钉钉群名称' },
                        { max: 64, message: '长度不超过64个字符' }
                    ]}
                >
                    <Input placeholder="请输入钉钉群名称" />
                </FormItem>
                <FormItem
                    label="webHook"
                    name="webHook"
                    rules={[
                        { required: true, message: '请输入webHook' },
                        { max: 500, message: '长度不超过500个字符' }
                    ]}
                >
                    <Input placeholder="请输入webHook" />
                </FormItem>
                <FormItem
                    label="订阅项"
                    name="topicIds"
                    rules={[
                        { required: true, message: '请选择订阅项，最多三个' },
                        {
                            validator: (rule, value = [], callback) => {
                                if (value?.length > 3) {
                                    callback('最多选择三个订阅项')
                                }
                                callback()
                            }
                        }
                    ]}
                >
                    <Select
                        showSearch
                        mode="multiple"
                        onChange={handleTopicChange}
                        placeholder="请选择订阅项，最多三个"
                    >
                        {
                            topicList.map(site => {
                                return (
                                    <OptGroup key={site.name} label={site.name}>
                                        {
                                            site?.children?.map(item => {
                                                return <Option key={item.id} value={item.id}>{item.name}</Option>
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
                >
                    <ChooseSendTime />
                </FormItem>
                <FormItem
                    label="备注"
                    name="remark"
                >
                    <TextArea placeholder="请输入备注" rows={4} maxLength={255} />
                </FormItem>
            </Form>
        </Modal>)
}
export default SubscriptionModal;
