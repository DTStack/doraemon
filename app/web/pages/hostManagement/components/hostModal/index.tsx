import React, { useState, useEffect, useRef, Fragment } from 'react';
import { isEmpty, isFunction, isNull } from 'lodash';
import { Modal, Input, Spin, message as Message, Select, Form } from 'antd';
import { API } from '@/api';
const FormItem = Form.Item;
const { TextArea } = Input;
const { Option } = Select

const HostForm = (props: any) => {
    const { value, tagList = [], forwardRef } = props;
    const { hostIp, hostName, username, password, remark, tags = [] } = value;
    const tagIds = tags.map((item: any) => Number(item.id));
    const isAdd = isEmpty(value);
    return (
        <Form
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 17 }}
            ref={forwardRef}
            initialValues={{
                hostName: hostName,
                hostIp: hostIp,
                username: username,
                password: password,
                tagIds: tagIds,
                remark: remark
            }}
        >
            <FormItem
                label="主机名"
                name="hostName"
                rules={[{ required: true, message: '请输入主机名' }]}
                hasFeedback
            >
                <Input placeholder="请输入主机名" />
            </FormItem>
            <FormItem
                label="主机IP"
                name="hostIp"
                rules={[{ required: true, message: '请输入主机IP' }]}
                hasFeedback
            >
                <Input placeholder="请输入主机IP" />
            </FormItem>
            {isAdd && <Fragment>
                <FormItem
                    label="用户名"
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                    hasFeedback
                >
                    <Input placeholder="请输入用户名" />
                </FormItem>
                <FormItem
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                    hasFeedback
                >
                    <Input type="password" placeholder="请输入密码" />
                </FormItem>
            </Fragment>}
            <FormItem
                label="标签"
                name="tagIds"
                rules={[{
                    type: 'array',
                    required: true, message: '请选择标签'
                }]}
                hasFeedback
            >
                <Select mode="multiple" placeholder="请选择标签">
                    {
                        tagList.map((item: any) => <Option key={item.id} value={item.id}>{item.tagName}</Option>)
                    }
                </Select>
            </FormItem>
            <FormItem
                label="备注"
                name="remark"
                hasFeedback
            >
                <TextArea placeholder="请输入备注" rows={4} />
            </FormItem>
        </Form>
    )
};

const HostFormRef = React.forwardRef((props: any, ref: any) => {
    return <HostForm {...props} forwardRef={ref} />
})

const HostModal = (props: any) => {
    const { value, visible, onOk, onCancel, tagList } = props;
    const [confirmLoading, setConfirmLoading] = useState(false);
    const hostFormRef: any = useRef(null);
    const isAdd = isEmpty(value);
    const { id, hostName } = value;
    const handleModalOk = () => {
        if (!isNull(hostFormRef.current)) {
            hostFormRef.current.validateFields()
                .then((values: any) => {
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
            {visible && <HostFormRef tagList={tagList} value={value} ref={hostFormRef} />}
        </Spin>
    </Modal>
}
export default HostModal;