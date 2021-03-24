import React, { useState, useEffect, useRef } from 'react';
import { isEmpty, isFunction, isNull } from 'lodash';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, Spin, message as Message, Select } from 'antd';
import { API } from '@/api';
const FormItem = Form.Item;
const { TextArea } = Input;
const { Option } = Select

const HostForm = Form.create<any>()(
    (props: any) => {
        const { form, value, tagList = [] } = props;
        const { getFieldDecorator } = form;
        const { hostIp, hostName, username, password, remark, tags = [] } = value;
        const tagIds = tags.map((item: any) => `${item.id}`);
        const isAdd = isEmpty(value);
        return <Form labelCol={{ span: 5 }} wrapperCol={{ span: 17 }} >
            <FormItem label="主机名" hasFeedback>
                {getFieldDecorator('hostName', {
                    initialValue: hostName,
                    rules: [{
                        required: true, message: '请输入主机名'
                    }]
                })(
                    <Input placeholder="请输入主机名" />
                )}
            </FormItem>
            <FormItem label="主机IP" hasFeedback>
                {getFieldDecorator('hostIp', {
                    initialValue: hostIp,
                    rules: [{
                        required: true, message: '请输入主机IP'
                    }]
                })(
                    <Input placeholder="请输入主机IP" />
                )}
            </FormItem>
            {isAdd && <FormItem label="用户名" hasFeedback>
                {getFieldDecorator('username', {
                    initialValue: username,
                    rules: [{
                        required: true, message: '请输入用户名'
                    }]
                })(
                    <Input placeholder="请输入用户名" />
                )}
            </FormItem>}
            {isAdd && <FormItem label="密码" hasFeedback>
                {getFieldDecorator('password', {
                    initialValue: password,
                    rules: [{
                        required: true, message: '请输入密码'
                    }]
                })(
                    <Input type="password" placeholder="请输入密码" />
                )}
            </FormItem>}
            <FormItem label="标签" hasFeedback>
                {getFieldDecorator('tagIds', {
                    initialValue: tagIds,
                    rules: [{
                        type: 'array',
                        required: true, message: '请选择标签'
                    }]
                })(
                    <Select mode="multiple" placeholder="请选择标签">
                        {
                            tagList.map((item: any) => <Option key={item.id}>{item.tagName}</Option>)
                        }
                    </Select>
                )}
            </FormItem>
            <FormItem label="备注" hasFeedback>
                {getFieldDecorator('remark', {
                    initialValue: remark
                })(
                    <TextArea placeholder="请输入备注" rows={4} />
                )}
            </FormItem>
        </Form>
    }
)
const HostModal = (props: any) => {
    const { value, visible, onOk, onCancel, tagList } = props;
    const [confirmLoading, setConfirmLoading] = useState(false);
    const hostFormRef: any = useRef(null);
    const isAdd = isEmpty(value);
    const { id, hostName } = value;
    const handleModalOk = () => {
        if (!isNull(hostFormRef.current)) {
            hostFormRef.current.validateFields((err: any, values: any) => {
                if (!err) {
                    setConfirmLoading(true);
                    API[isAdd ? 'addHost' : 'editHost']({
                        id: isAdd ? undefined : id,
                        ...values
                    }).then((response: any) => {
                        setConfirmLoading(false);
                        const { success } = response;
                        if (success) {
                            Message.success(isAdd ? '主机新增成功' : `主机「${hostName}」编辑成功`);
                            isFunction(onOk) && onOk(values);
                        }
                    })
                }
            })
        }
    }
    const handleModalCancel = () => {
        isFunction(onCancel) && onCancel();
    }
    useEffect(() => {
        if (!visible) {
            setConfirmLoading(false);
        }
    }, [props.visible])
    return <Modal
        title={isAdd ? '新增主机' : '编辑主机'}
        visible={visible}
        maskClosable={false}
        confirmLoading={confirmLoading}
        onOk={handleModalOk}
        onCancel={handleModalCancel}>
        <Spin spinning={confirmLoading}>
            {visible && <HostForm tagList={tagList} value={value} ref={hostFormRef} />}
        </Spin>
    </Modal>
}
export default HostModal;