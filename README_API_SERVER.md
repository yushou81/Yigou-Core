# 测试API服务器

这是一个用于测试画布API调用功能的Python Flask服务器。

## 安装依赖

```bash
pip install -r requirements.txt
```

或者直接安装：

```bash
pip install Flask flask-cors
```

## 启动服务器

```bash
python test_api_server.py
```

服务器将在 `http://localhost:5000` 启动。

## API接口列表

### 1. 首页（API文档）
- **URL**: `http://localhost:5000/`
- **方法**: GET
- **说明**: 返回所有可用接口的文档

### 2. 用户接口

#### 获取用户列表
- **URL**: `http://localhost:5000/api/users`
- **方法**: GET
- **响应示例**:
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

#### 创建用户
- **URL**: `http://localhost:5000/api/users`
- **方法**: POST
- **请求体**:
```json
{
  "name": "新用户",
  "age": 25,
  "email": "newuser@example.com"
}
```

#### 获取用户详情
- **URL**: `http://localhost:5000/api/users/<id>`
- **方法**: GET
- **示例**: `http://localhost:5000/api/users/1`

#### 更新用户
- **URL**: `http://localhost:5000/api/users/<id>`
- **方法**: PUT
- **请求体**:
```json
{
  "name": "更新后的名字",
  "age": 26
}
```

#### 删除用户
- **URL**: `http://localhost:5000/api/users/<id>`
- **方法**: DELETE

### 3. 产品接口

#### 获取产品列表
- **URL**: `http://localhost:5000/api/products`
- **方法**: GET

#### 创建产品
- **URL**: `http://localhost:5000/api/products`
- **方法**: POST
- **请求体**:
```json
{
  "name": "新产品",
  "price": 99.99,
  "stock": 100
}
```

#### 获取产品详情
- **URL**: `http://localhost:5000/api/products/<id>`
- **方法**: GET

#### 更新产品
- **URL**: `http://localhost:5000/api/products/<id>`
- **方法**: PUT

#### 删除产品
- **URL**: `http://localhost:5000/api/products/<id>`
- **方法**: DELETE

### 4. 回显接口
- **URL**: `http://localhost:5000/api/echo`
- **方法**: POST, PUT
- **说明**: 返回请求的所有数据，包括请求头、请求体等

### 5. 测试接口
- **URL**: `http://localhost:5000/api/test`
- **方法**: GET, POST, PUT, DELETE
- **说明**: 支持所有HTTP方法的通用测试接口

### 6. 获取所有数据
- **URL**: `http://localhost:5000/api/data`
- **方法**: GET
- **说明**: 返回所有测试数据

### 7. 计数器接口
- **URL**: `http://localhost:5000/api/counter`
- **方法**: GET - 获取当前计数值
- **方法**: POST - 增加计数器
- **请求体**:
```json
{
  "increment": 5
}
```

## 在画布中使用

1. 在节点的输出组中选择"调用api输出"
2. 配置API：
   - **方法**: GET/POST/PUT/DELETE
   - **URL**: `http://localhost:5000/api/users` (或其他接口)
   - **Body**: 对于POST/PUT请求，可以输入JSON数据，例如：
     ```json
     {
       "name": "测试用户",
       "age": 25,
       "email": "test@example.com"
     }
     ```
3. 点击"运行"按钮测试API调用
4. API返回的结果会自动存储，可以在工作流中使用

## 注意事项

- 服务器默认运行在 `http://localhost:5000`
- 如果端口被占用，可以修改 `app.run()` 中的 `port` 参数
- 服务器支持CORS，可以从前端直接调用
- 数据存储在内存中，重启服务器后数据会重置

