import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Input, message, Table } from 'antd';

const ProxyAddrsTable = (props) => {
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

  // 触发onChange
  const onDataSourceChange = (dataSource) => {
    onChange(dataSource);
  }

  // 表格数据变更
  const onDataChange = (val, type, index) => {
    const rowItem = {
      ...value[index],
      [type]: val
    };
    const newDataSource = [].concat(value);
    newDataSource.splice(index, 1, rowItem);
    onDataSourceChange(newDataSource);
    handleRowSelect(rowItem, 'sync');
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
    const rowItem = value[index];
    const newDataSource = [].concat(value);
    newDataSource.splice(index, 1);
    onDataSourceChange(newDataSource, index);
    handleRowSelect(rowItem, 'delete');
    handleRowDelete(rowItem.rowId);
  }

  // 可选择，并且同步目标地址
  const handleRowSelect = (rowItem, type) => {
    if (props.rowSelection) {
      const { selectedRowKeys } = props.rowSelection;
      const onRowSelect = props.rowSelection.onChange;
      const rowId = rowItem.rowId;
      if (rowId === selectedRowKeys[0]) {
        // 默认地址同步
        if (type === 'sync') {
          onRowSelect([rowId], [rowItem]);
        }
        // 默认目标地址重置
        if (type === 'delete') {
          const firstAddr = value[0]
          onRowSelect([firstAddr.rowId], [firstAddr]);
        }
      }
    }
  }

  // 编辑时保存删除的id
  const handleRowDelete = rowId => {
    if (props.rowDelete) {
      const { deleteRowKeys } = props.rowDelete;
      const keys = [...deleteRowKeys, rowId];
      props.rowDelete.onChange(keys);
    }
  }

  return (
    <div>
      <Table
        rowKey="rowId"
        size="middle"
        className="dt-pagination-lower dt-table-border dt-table-last-row-noborder"
        columns={columns}
        dataSource={value}
        rowSelection={props.rowSelection}
        pagination={false}
      />
      <Button className="mt-10" type="dashed" block onClick={handleAddRow}>
        <PlusOutlined />添加
      </Button>
    </div>
  );
}

export default ProxyAddrsTable;