import React, { Component } from 'react';
import { Table, Pagination } from 'antd';

import './style.scss';
export default class DtTable extends Component {
    constructor (props) {
        super(props);
        this.state = {
            pagination: props.pagination,
            filters: [],
            sorter: {},
            extra: {}
        }
    }

    onTableChange = (pagination, filters, sorter, extra) => {
        this.setState({
            filters,
            sorter,
            extra,
            pagination: Object.assign({}, this.state.pagination, {
                current: 1,
                total: 0
            })
        }, this.onChange)
    }
    onPaginationChange = (page, pageSize) => {
        this.setState({
            pagination: Object.assign({}, this.state.pagination, {
                current: page,
                pageSize
            })
        }, this.onChange)
    }
    onShowSizeChange = (current, size) => {
        this.setState({
            pagination: Object.assign({}, this.state.pagination, {
                current: 1,
                pageSize: size
            })
        }, this.onChange)
    }
    onChange = () => {
        const { pagination, filters, sorter, extra } = this.state;
        this.props.onChange(pagination, filters, sorter, extra)
    }
    render () {
        const { props } = this;
        const { emptyText, pagination } = props;
        return (
            <div className="dt-table flexDirection">
                <div className="dt-table-body flexAuto">
                    <Table {...props} pagination={false} onChange={this.onTableChange}/>
                    {
                        emptyText ? <span className="dt-empty">{emptyText}</span> : null
                    }
                </div>
                {
                    pagination && (
                        <div className="dt-table-footer">
                            <Pagination {...pagination} size="small" onChange={this.onPaginationChange} onShowSizeChange={this.onShowSizeChange}/>
                        </div>
                    )
                }

            </div>
        )
    }
}
