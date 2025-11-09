# API 使用指南

本指南说明如何在画布中使用 API 功能来调用外部接口。

## 目录

1. [快速开始](#快速开始)
2. [配置 API 输出](#配置-api-输出)
3. [配置 API 输入](#配置-api-输入)
4. [API 请求格式](#api-请求格式)
5. [API 响应处理](#api-响应处理)
6. [测试服务器使用](#测试服务器使用)
7. [常见问题](#常见问题)

## 快速开始

### 1. 启动测试服务器

首先，启动 Python 测试服务器：

```bash
cd /Users/qiufanchuan/code/Yigou-Core
python3 test_api_server.py
```

服务器默认运行在 `http://localhost:5000`（如果端口被占用，会自动切换到 5001）。

### 2. 在画布中配置 API

1. 选择一个节点（Node）
2. 打开属性面板
3. 在输出组中选择"调用api输出"
4. 配置 API 参数：
   - **方法**: GET/POST/PUT/DELETE
   - **URL**: `http://localhost:5000/api/users`
   - **Body**: 对于 POST/PUT 请求，输入 JSON 数据
5. 点击"运行"按钮测试 API 调用

## 配置 API 输出

### 步骤详解

1. **选择输出模式**
   - 在属性面板的"输出组"中，使用下拉菜单选择"调用api输出"
   - 每个输出组可以独立配置自己的 API

2. **配置 API 参数**
   - **方法**: 选择 HTTP 方法（GET/POST/PUT/DELETE）
   - **URL**: 输入完整的 API 地址，例如：
     - `http://localhost:5000/api/users`
     - `http://localhost:5000/api/products`
     - `http://localhost:5000/api/test`
   - **Body**: 仅对 POST/PUT 请求有效，输入 JSON 格式的请求体

3. **测试 API**
   - 点击"运行"按钮
   - 如果成功，会显示"最近运行"时间
   - API 返回的数据会自动存储，可以在工作流中使用

4. **使用 API 结果**
   - API 返回的数据会自动解析
   - 如果返回的是 JSON 对象，系统会自动提取属性名
   - 可以在后续节点中使用这些数据

### 示例：获取用户列表

1. 选择节点，打开属性面板
2. 在"输出组 1"中选择"调用api输出"
3. 配置：
   - 方法: `GET`
   - URL: `http://localhost:5000/api/users`
4. 点击"运行"
5. API 返回的数据会被存储，可以在后续节点中使用

### 示例：创建用户

1. 选择节点，打开属性面板
2. 在"输出组 1"中选择"调用api输出"
3. 配置：
   - 方法: `POST`
   - URL: `http://localhost:5000/api/users`
   - Body:
     ```json
     {
       "name": "新用户",
       "age": 25,
       "email": "newuser@example.com"
     }
     ```
4. 点击"运行"

## 配置 API 输入

### 步骤详解

1. **选择输入模式**
   - 在属性面板的"输入组"中，使用下拉菜单选择"使用API输入"
   - 每个输入组可以独立配置自己的 API

2. **配置 API 参数**
   - 与输出 API 配置相同
   - 方法、URL、Body 的配置方式一致

3. **使用 API 数据**
   - API 返回的数据会存储到 `inputData` 中
   - 可以在节点的处理逻辑中使用这些数据

### 示例：使用 API 获取输入数据

1. 选择节点，打开属性面板
2. 在"输入组 1"中选择"使用API输入"
3. 配置：
   - 方法: `GET`
   - URL: `http://localhost:5000/api/products/1`
4. 点击"运行"
5. 产品数据会被存储到 `inputData` 中

## API 请求格式

### GET 请求

```javascript
fetch('http://localhost:5000/api/users', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### POST 请求

```javascript
fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "新用户",
    age: 25,
    email: "newuser@example.com"
  })
})
```

### PUT 请求

```javascript
fetch('http://localhost:5000/api/users/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "更新后的名字",
    age: 26
  })
})
```

### DELETE 请求

```javascript
fetch('http://localhost:5000/api/users/1', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

## API 响应处理

### 响应格式

API 返回的数据会被自动解析：

1. **JSON 响应**: 自动解析为 JavaScript 对象
2. **文本响应**: 保持为字符串
3. **错误响应**: 存储到 `apiError` 字段

### 数据存储位置

- **输出 API**: 结果存储在 `outputData.apiResult_${groupIndex}` 中
- **输入 API**: 结果存储在 `inputData.apiResult_${groupIndex}` 中

### 使用 API 数据

在工作流执行时：

1. **属性输出模式**: API 返回的数据会被解析，属性名会被自动提取
2. **自定义 JSON 输出模式**: 直接使用 API 返回的完整数据
3. **API 输出模式**: 使用 `parseApiResult` 函数解析 API 响应

## 测试服务器使用

### 可用接口

测试服务器提供了以下接口：

#### 用户接口
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `GET /api/users/<id>` - 获取用户详情
- `PUT /api/users/<id>` - 更新用户
- `DELETE /api/users/<id>` - 删除用户

#### 产品接口
- `GET /api/products` - 获取产品列表
- `POST /api/products` - 创建产品
- `GET /api/products/<id>` - 获取产品详情
- `PUT /api/products/<id>` - 更新产品
- `DELETE /api/products/<id>` - 删除产品

#### 测试接口
- `GET /api/test` - 测试 GET 请求
- `POST /api/test` - 测试 POST 请求
- `PUT /api/test` - 测试 PUT 请求
- `DELETE /api/test` - 测试 DELETE 请求

#### 其他接口
- `POST /api/echo` - 回显请求数据
- `GET /api/data` - 获取所有测试数据
- `GET /api/counter` - 获取计数器值
- `POST /api/counter` - 增加计数器

### 响应示例

#### 成功响应

```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "张三", "age": 25, "email": "zhangsan@example.com"},
    {"id": 2, "name": "李四", "age": 30, "email": "lisi@example.com"}
  ],
  "count": 2,
  "timestamp": "2024-01-01T12:00:00"
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "用户不存在"
}
```

## 常见问题

### 1. API 调用失败

**问题**: 点击"运行"后没有反应或显示错误

**解决方案**:
- 检查 URL 是否正确
- 确认服务器是否正在运行
- 检查网络连接
- 查看浏览器控制台的错误信息

### 2. CORS 错误

**问题**: 浏览器控制台显示 CORS 错误

**解决方案**:
- 测试服务器已启用 CORS，应该不会有此问题
- 如果使用其他服务器，确保服务器支持 CORS

### 3. 端口被占用

**问题**: 启动服务器时提示端口被占用

**解决方案**:
- 服务器会自动切换到其他端口（如 5001）
- 或者手动指定端口：`python3 test_api_server.py 8000`

### 4. API 数据无法使用

**问题**: API 调用成功，但数据无法在工作流中使用

**解决方案**:
- 检查输出模式是否正确设置为"调用api输出"
- 确认 API 返回的数据格式是否正确
- 查看 `outputData.apiResult_${groupIndex}` 中的数据

### 5. 多个输出组

**问题**: 如何为不同的箭头配置不同的 API？

**解决方案**:
- 每个输出组可以独立配置 API
- 输出组 1 对应 order 最小的箭头
- 输出组 2 对应 order 第二小的箭头，以此类推

## 高级用法

### 动态 URL

可以在 URL 中使用变量，例如：
- `http://localhost:5000/api/users/${userId}`
- 变量值可以从 `inputData` 中获取

### 请求体模板

在 Body 中可以使用 JSON 模板：
```json
{
  "name": "${inputData.name}",
  "age": "${inputData.age}"
}
```

### 错误处理

API 调用失败时，错误信息会存储到：
- `outputData.apiError_${groupIndex}` (输出 API)
- `inputData.apiError_${groupIndex}` (输入 API)

可以在后续节点中检查这些错误字段。

## 更多信息

- 测试服务器代码: `test_api_server.py`
- 测试服务器文档: `README_API_SERVER.md`
- 画布执行逻辑: `docs/箭头运行逻辑说明.md`

