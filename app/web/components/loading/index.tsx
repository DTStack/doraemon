import * as React from 'react';
import './style.scss';

export default React.memo((props: any)=>{
  const {loading,children} = props;
  return loading?<div className="comp-loading">
    <div className="item-1"></div>
    <div className="item-2"></div>
    <div className="item-3"></div>
    <div className="item-4"></div>
    <div className="item-5"></div>
  </div>:children
})
