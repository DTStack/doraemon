import React, { useState, useEffect, useRef } from 'react';
import { isFunction, isNull } from 'lodash';
import { Modal, Input, Spin, message as Message, Form } from 'antd';
import { API } from '@/api';
const FormItem = Form.Item;


const PasswordForm = (props: any) => {
    const { forwardRef } = props;
    const confirmPasswordValidator = (rule: any, value: any, callback: any) => {
        if (!value) {
            callback([new Error('请再次确认密码')]);
        } else if (forwardRef.current.getFieldValue('password') !== value) {
            callback([new Error('两次密码不一致')]);
        } else {
            callback();
        }
    }
    return (
        <Form ref={forwardRef} labelCol={{ span: 5 }} wrapperCol={{ span: 17 }} >
            <FormItem
                label="新密码"
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
                hasFeedback
            >
                <Input type="password" placeholder="请输入密码" />
            </FormItem>
            <FormItem
                label="确认密码"
                name="confirmPassword"
                rules={[{ validator: confirmPasswordValidator }]}
                hasFeedback
            >
                <Input type="password" placeholder="请再次确认密码" />
            </FormItem>
        </Form>
    )
}

const PasswordFormRef = React.forwardRef((props: any, ref: any) => {
    return <PasswordForm {...props} forwardRef={ref} />
})

const PasswordModal = (props: any) => {
    const { value, visible, onOk, onCancel } = props;
    const [confirmLoading, setConfirmLoading] = useState(false);
    const passwordFormRef: any = useRef(null);
    const { id, hostName } = value;
    const handleModalOk = () => {
        if (!isNull(passwordFormRef.current)) {
            passwordFormRef.current.validateFields()
                .then((values: any) => {
                    setConfirmLoading(true);
                    API.editHost({
                        id,
                        ...values
                    }).then((response: any) => {
                        setConfirmLoading(false);
                        const { success } = response;
                        if (success) {
                            Message.success(`主机「${hostName}」密码修改成功`);
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
        title="修改密码"
        visible={visible}
        confirmLoading={confirmLoading}
        onOk={handleModalOk}
        onCancel={handleModalCancel}>
        <Spin spinning={confirmLoading}>
            {visible && <PasswordFormRef ref={passwordFormRef} />}
        </Spin>
    </Modal>
}
export default PasswordModal;