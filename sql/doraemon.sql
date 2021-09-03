/*
 Navicat MySQL Data Transfer

 Source Server         : doraemon
 Source Server Type    : MySQL
 Source Server Version : 80019
 Source Host           : 172.16.100.225:3306
 Source Schema         : doraemon

 Target Server Type    : MySQL
 Target Server Version : 80019
 File Encoding         : 65001

 Date: 01/06/2021 15:45:35
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for app_centers
-- ----------------------------
DROP TABLE IF EXISTS `app_centers`;
CREATE TABLE `app_centers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `appName` varchar(100) DEFAULT NULL,
  `appTags` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL COMMENT '应用标签',
  `appType` tinyint NOT NULL DEFAULT '1' COMMENT '应用类型 - 内置0, 外置1',
  `logoUrl` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL COMMENT '应用logo',
  `appDesc` varchar(255) DEFAULT NULL,
  `appUrl` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` int DEFAULT '1',
  `clickCount` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for article_subscription
-- ----------------------------
DROP TABLE IF EXISTS `article_subscription`;
CREATE TABLE `article_subscription` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `groupName` varchar(64) NOT NULL COMMENT '群名称',
  `webHook` varchar(500) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '钉钉机器人 webHook',
  `remark` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL COMMENT '备注',
  `topicIds` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '订阅主题的 id 集合',
  `sendType` tinyint NOT NULL DEFAULT 1 COMMENT '推送时间 1-周一至周五 2-每天',
  `sendCron` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '定时规则',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '订阅状态 1-开启 2-关闭',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  `is_delete` int DEFAULT 0 COMMENT '是否删除 1-已删除 0-未删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ----------------------------
-- Table structure for article_subscription_topic
-- ----------------------------
DROP TABLE IF EXISTS `article_subscription_topic`;
CREATE TABLE `article_subscription_topic` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `siteName` varchar(64) NOT NULL COMMENT '网站名称',
  `topicName` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '订阅主题名称',
  `topicUrl` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '订阅主题路径',
  `sort` int COMMENT '序号',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  `is_delete` int DEFAULT 0 COMMENT '是否删除 1-已删除 0-未删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

INSERT INTO article_subscription_topic (site_name, topic_name, topic_url, sort) VALUES ('掘金', '前端', 'front', 1);

-- ----------------------------
-- Table structure for config_management
-- ----------------------------
DROP TABLE IF EXISTS `config_management`;
CREATE TABLE `config_management` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `file_path` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `host_id` int NOT NULL,
  `tag_ids` varchar(1000) COLLATE utf8_bin NOT NULL DEFAULT '1',
  `remark` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `update_shell` text CHARACTER SET utf8 COLLATE utf8_bin,
  `status` tinyint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `findHostId` (`host_id`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ----------------------------
-- Table structure for config_notice_url
-- ----------------------------
DROP TABLE IF EXISTS `config_notice_url`;
CREATE TABLE `config_notice_url` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int NOT NULL,
  `accept_group` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `type` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `webHook` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `is_delete` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ----------------------------
-- Table structure for config_tag_rel
-- ----------------------------
DROP TABLE IF EXISTS `config_tag_rel`;
CREATE TABLE `config_tag_rel` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `config_id` int NOT NULL,
  `tag_id` int NOT NULL,
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '修改时间',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除,1删除，0未删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for host_management
-- ----------------------------
DROP TABLE IF EXISTS `host_management`;
CREATE TABLE `host_management` (
  `id` int NOT NULL AUTO_INCREMENT,
  `host_ip` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `host_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `remark` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `username` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tag_ids` varchar(10000) COLLATE utf8_bin NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ----------------------------
-- Table structure for proxy_rule
-- ----------------------------
DROP TABLE IF EXISTS `proxy_rule`;
CREATE TABLE `proxy_rule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `proxy_server_id` int NOT NULL,
  `target` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `is_delete` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '0',
  `remark` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `status` int NOT NULL DEFAULT '1',
  `mode` varchar(255) COLLATE utf8_bin NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1389 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ----------------------------
-- Table structure for proxy_server
-- ----------------------------
DROP TABLE IF EXISTS `proxy_server`;
CREATE TABLE `proxy_server` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '代理服务id',
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '代理服务名称',
  `target` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '目标服务器',
  `api_doc_url` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL COMMENT '接口文档链接地址',
  `proxy_server_address` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '代理服务地址',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '服务是否开启 1-开启 2-关闭',
  `is_delete` tinyint NOT NULL DEFAULT '0' COMMENT '删除状态 1-删除 0-未删除',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ----------------------------
-- Table structure for proxy_server_addrs
-- ----------------------------
DROP TABLE IF EXISTS `proxy_server_addrs`;
CREATE TABLE `proxy_server_addrs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '目标服务地址id',
  `target` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '目标服务地址',
  `remark` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL COMMENT '备注',
  `proxy_server_id` int NOT NULL COMMENT '代理服务id',
  `is_delete` int NOT NULL DEFAULT '0' COMMENT '0 - 未删除, 1 - 已删除',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ----------------------------
-- Table structure for switch_hosts
-- ----------------------------
DROP TABLE IF EXISTS `switch_hosts`;
CREATE TABLE `switch_hosts` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'id',
  `groupName` varchar(64) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '群组名称',
  `groupId` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '群组id',
  `groupApi` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '群组api',
  `groupAddr` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '文件存放路径',
  `groupDesc` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL COMMENT '群组描述',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_push` tinyint NOT NULL DEFAULT '0' COMMENT '是否推送 1推送 0未推送',
  `is_close` tinyint NOT NULL DEFAULT '0' COMMENT '是否关闭 1关闭',
  `is_delete` tinyint NOT NULL DEFAULT '0' COMMENT '是否删除 1删除',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ----------------------------
-- Table structure for tag_management
-- ----------------------------
DROP TABLE IF EXISTS `tag_management`;
CREATE TABLE `tag_management` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tagName` varchar(64) NOT NULL,
  `tagDesc` varchar(255) NOT NULL,
  `tagColor` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  `is_delete` int DEFAULT '0',
  `is_close` int DEFAULT '0',
  `is_admin` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
