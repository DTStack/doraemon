#!/bin/bash

# 从 env.json 中读取 mcpDeployDir 配置
MCP_DEPLOY_DIR=$(node -pe "require('./env.json').mcpDeployDir")

# 检查并创建 mcpDeployDir 目录
if [ ! -d "$MCP_DEPLOY_DIR" ]; then
    echo "检测到 MCP 部署目录不存在: $MCP_DEPLOY_DIR"
    echo "正在创建目录并设置权限..."
    
    # 使用 sudo 创建目录
    sudo mkdir -p "$MCP_DEPLOY_DIR"
    
    # 将目录所有权授予当前用户
    sudo chown -R $(whoami):$(id -gn) "$MCP_DEPLOY_DIR"
    
    # 设置目录权限为 755 (所有者可读写执行，组和其他用户只读执行)
    sudo chmod -R 755 "$MCP_DEPLOY_DIR"
    
    echo "目录创建完成: $MCP_DEPLOY_DIR"
else    
    # 检查当前用户是否有写权限
    if [ ! -w "$MCP_DEPLOY_DIR" ]; then
        echo "当前用户没有写权限，正在修复权限..."
        sudo chown -R $(whoami):$(id -gn) "$MCP_DEPLOY_DIR"
        sudo chmod -R 755 "$MCP_DEPLOY_DIR"
        echo "权限修复完成"
    fi
fi

export NODE_OPTIONS=--openssl-legacy-provider
yarn
yarn build
if [[ "$#" > 0 ]]; then
    yarn server:test
else 
    yarn stop
    yarn server
    yarn dingBot
fi
