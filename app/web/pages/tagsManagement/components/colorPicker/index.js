import React from 'react';
import { SketchPicker } from 'react-color';
import { Tag } from 'antd';
import './style.scss';

const ColorPicker = (props) => {
  const {value,onChange} = props;
  const handleChangeComplete = (color) => {
    onChange(color.hex)
  }
  return (<span className="colorPicker">
      <Tag color={value}>{value}</Tag>
      <SketchPicker
      className="sketchPicker"
      color={ value }
      onChangeComplete={ handleChangeComplete }/>
  </span>)
}
export default ColorPicker;