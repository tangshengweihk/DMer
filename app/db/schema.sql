CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('super_admin', 'admin', 'user'))
);

-- 插入初始用户数据
INSERT OR IGNORE INTO users (username, password, user_type) VALUES 
    ('Kid', 'tsw', 'super_admin'),
    ('TH', 'tsw', 'super_admin'),
    ('admin', 'admin001', 'admin'),
    ('user', 'user001', 'user'); 

-- 一级标签表
CREATE TABLE IF NOT EXISTS primary_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- 插入初始一级标签
INSERT OR IGNORE INTO primary_tags (name) VALUES 
    ('视频'),
    ('音频'),
    ('网络');

-- 二级标签表
CREATE TABLE IF NOT EXISTS secondary_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    primary_tag_id INTEGER NOT NULL,
    FOREIGN KEY (primary_tag_id) REFERENCES primary_tags(id),
    UNIQUE(name, primary_tag_id)
);

-- 设备表
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    primary_tag_id INTEGER NOT NULL,
    secondary_tag_id INTEGER NOT NULL,
    FOREIGN KEY (primary_tag_id) REFERENCES primary_tags(id),
    FOREIGN KEY (secondary_tag_id) REFERENCES secondary_tags(id)
);

-- 设备数量统计表
CREATE TABLE IF NOT EXISTS device_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_name TEXT NOT NULL,
    location TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(device_name, location)
); 