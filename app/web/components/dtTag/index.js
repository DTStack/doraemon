import React from 'react';
import { Tag } from 'antd';
import './style.scss';

const DtTag = (props) => {
  const { color, children, ...rest } = props;
  const style = {
    color,
    background: `${color}1c`
  }
  return (
    <Tag className="doraemon-label__ant-tag" style={style} {...rest}>
      {children}
    </Tag>
  )
}
export default DtTag;