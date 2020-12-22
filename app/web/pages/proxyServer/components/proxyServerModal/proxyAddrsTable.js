import React, { useState } from 'react';
import { Button, Icon, Input, message, Table } from 'antd';

const ProxyAddrsTable = (props) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([0]);
  const { value, onChange } = props;
  const initRow = {
    rowId: 0,
    target: '',
    remark: ''
  }
  const columns = [
    {
      title: '服务地址',
      dataIndex: 'target',
      key: 'target',
      render: (text, record, index) => (
        <Input
          value={text}
          placeholder="请输入服务地址"
          onChange={(e) => onDataChange(e.target.value, 'target', index)}
        />
      )
    }, {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      render: (text, record, index) => (
        <Input
          value={text}
          placeholder="请输入备注"
          onChange={(e) => onDataChange(e.target.value, 'remark', index)}
        />
      )
    }, {
      title: '操作',
      dataIndex: 'actions',
      key: 'actions',
      render: (text, record, index) => (
        <a onClick={() => handleDeleteRow(index)}>删除</a>
      )
    }
  ];
  const rowSelection = {
    type: 'radio',
    selectedRowKeys,
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedRowKeys(selectedRowKeys);
      props.onRowSelect(selectedRows[0]);
    }
  };

    // 触发onChange
  const onDataSourceChange = (dataSource, index) => {
    onChange(dataSource);
    // 默认目标地址同步或重置
    if (index !== undefined) {
      const addr = dataSource[index] || {};
      if (addr.rowId === selectedRowKeys[0]) {
        props.onRowSelect(addr);
      } else {
        const firstAddr = dataSource[0]
        setSelectedRowKeys([firstAddr.rowId]);
        props.onRowSelect(firstAddr);
      }
    }
  }

  // 表格数据变更
  const onDataChange = (val, type, index) => {
    const rowItem = {
      ...value[index],
      [type]: val
    };
    const newDataSource = [].concat(value);
    newDataSource.splice(index, 1, rowItem);
    onDataSourceChange(newDataSource, index);
  }

  // 添加行
  const handleAddRow = () => {
    const lastRow = value[value.length - 1];
    const newDataSource = [].concat(value);
    const newRow = {
      ...initRow,
      rowId: lastRow.rowId + 1
    };
    newDataSource.push(newRow);
    onDataSourceChange(newDataSource)
  }

  // 删除表格行
  const handleDeleteRow = index => {
    const len = value.length;
    if (len === 1) {
      message.warning('至少创建一条目标服务地址！');
      return;
    }
    const newDataSource = [].concat(value);
    newDataSource.splice(index, 1);
    onDataSourceChange(newDataSource, index);
  }

  return (
    <div>
      <Table
        rowKey="rowId"
        size="middle"
        className="dt-pagination-lower dt-table-border dt-table-last-row-noborder"
        columns={columns}
        dataSource={value}
        rowSelection={rowSelection}
        pagination={false}
      />
      <Button className="mt-10" onClick={handleAddRow}>
        <Icon type="plus" />添加
      </Button>
    </div>
  )
}

export default ProxyAddrsTable;