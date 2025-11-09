#!/usr/bin/env python3
"""
测试API服务器
用于测试画布中的API调用功能
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 存储一些测试数据
test_data = {
    "users": [
        {"id": 1, "name": "张三", "age": 25, "email": "zhangsan@example.com"},
        {"id": 2, "name": "李四", "age": 30, "email": "lisi@example.com"},
        {"id": 3, "name": "王五", "age": 28, "email": "wangwu@example.com"},
    ],
    "products": [
        {"id": 1, "name": "产品A", "price": 99.99, "stock": 100},
        {"id": 2, "name": "产品B", "price": 199.99, "stock": 50},
    ],
    "counter": 0,
}


@app.route('/', methods=['GET'])
def index():
    """首页，返回API文档"""
    return jsonify({
        "message": "测试API服务器",
        "version": "1.0.0",
        "endpoints": {
            "/api/users": "用户列表 (GET, POST)",
            "/api/users/<id>": "用户详情 (GET, PUT, DELETE)",
            "/api/products": "产品列表 (GET, POST)",
            "/api/products/<id>": "产品详情 (GET, PUT, DELETE)",
            "/api/echo": "回显请求数据 (POST, PUT)",
            "/api/test": "测试接口 (GET, POST, PUT, DELETE)",
            "/api/data": "获取测试数据 (GET)",
            "/api/counter": "计数器 (GET, POST)",
        }
    })


@app.route('/api/users', methods=['GET', 'POST'])
def users():
    """用户列表接口"""
    if request.method == 'GET':
        return jsonify({
            "success": True,
            "data": test_data["users"],
            "count": len(test_data["users"]),
            "timestamp": datetime.now().isoformat(),
        })
    
    elif request.method == 'POST':
        try:
            data = request.get_json() or {}
            new_user = {
                "id": len(test_data["users"]) + 1,
                "name": data.get("name", "新用户"),
                "age": data.get("age", 0),
                "email": data.get("email", ""),
            }
            test_data["users"].append(new_user)
            return jsonify({
                "success": True,
                "message": "用户创建成功",
                "data": new_user,
            }), 201
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e),
            }), 400


@app.route('/api/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
def user_detail(user_id):
    """用户详情接口"""
    user = next((u for u in test_data["users"] if u["id"] == user_id), None)
    
    if request.method == 'GET':
        if user:
            return jsonify({
                "success": True,
                "data": user,
            })
        return jsonify({
            "success": False,
            "error": "用户不存在",
        }), 404
    
    elif request.method == 'PUT':
        if not user:
            return jsonify({
                "success": False,
                "error": "用户不存在",
            }), 404
        
        try:
            data = request.get_json() or {}
            user.update({k: v for k, v in data.items() if k != "id"})
            return jsonify({
                "success": True,
                "message": "用户更新成功",
                "data": user,
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e),
            }), 400
    
    elif request.method == 'DELETE':
        if not user:
            return jsonify({
                "success": False,
                "error": "用户不存在",
            }), 404
        
        test_data["users"].remove(user)
        return jsonify({
            "success": True,
            "message": "用户删除成功",
        })


@app.route('/api/products', methods=['GET', 'POST'])
def products():
    """产品列表接口"""
    if request.method == 'GET':
        return jsonify({
            "success": True,
            "data": test_data["products"],
            "count": len(test_data["products"]),
            "timestamp": datetime.now().isoformat(),
        })
    
    elif request.method == 'POST':
        try:
            data = request.get_json() or {}
            new_product = {
                "id": len(test_data["products"]) + 1,
                "name": data.get("name", "新产品"),
                "price": data.get("price", 0.0),
                "stock": data.get("stock", 0),
            }
            test_data["products"].append(new_product)
            return jsonify({
                "success": True,
                "message": "产品创建成功",
                "data": new_product,
            }), 201
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e),
            }), 400


@app.route('/api/products/<int:product_id>', methods=['GET', 'PUT', 'DELETE'])
def product_detail(product_id):
    """产品详情接口"""
    product = next((p for p in test_data["products"] if p["id"] == product_id), None)
    
    if request.method == 'GET':
        if product:
            return jsonify({
                "success": True,
                "data": product,
            })
        return jsonify({
            "success": False,
            "error": "产品不存在",
        }), 404
    
    elif request.method == 'PUT':
        if not product:
            return jsonify({
                "success": False,
                "error": "产品不存在",
            }), 404
        
        try:
            data = request.get_json() or {}
            product.update({k: v for k, v in data.items() if k != "id"})
            return jsonify({
                "success": True,
                "message": "产品更新成功",
                "data": product,
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e),
            }), 400
    
    elif request.method == 'DELETE':
        if not product:
            return jsonify({
                "success": False,
                "error": "产品不存在",
            }), 404
        
        test_data["products"].remove(product)
        return jsonify({
            "success": True,
            "message": "产品删除成功",
        })


@app.route('/api/echo', methods=['POST', 'PUT'])
def echo():
    """回显接口，返回请求的数据"""
    try:
        data = request.get_json() or request.get_data(as_text=True)
        return jsonify({
            "success": True,
            "method": request.method,
            "headers": dict(request.headers),
            "data": data,
            "timestamp": datetime.now().isoformat(),
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
        }), 400


@app.route('/api/test', methods=['GET', 'POST', 'PUT', 'DELETE'])
def test():
    """通用测试接口"""
    method = request.method
    
    if method == 'GET':
        return jsonify({
            "success": True,
            "method": "GET",
            "message": "GET请求成功",
            "query_params": dict(request.args),
            "timestamp": datetime.now().isoformat(),
        })
    
    elif method == 'POST':
        try:
            data = request.get_json() or {}
            return jsonify({
                "success": True,
                "method": "POST",
                "message": "POST请求成功",
                "received_data": data,
                "timestamp": datetime.now().isoformat(),
            }), 201
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e),
            }), 400
    
    elif method == 'PUT':
        try:
            data = request.get_json() or {}
            return jsonify({
                "success": True,
                "method": "PUT",
                "message": "PUT请求成功",
                "received_data": data,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e),
            }), 400
    
    elif method == 'DELETE':
        return jsonify({
            "success": True,
            "method": "DELETE",
            "message": "DELETE请求成功",
            "timestamp": datetime.now().isoformat(),
        })


@app.route('/api/data', methods=['GET'])
def get_data():
    """获取所有测试数据"""
    return jsonify({
        "success": True,
        "data": test_data,
        "timestamp": datetime.now().isoformat(),
    })


@app.route('/api/counter', methods=['GET', 'POST'])
def counter():
    """计数器接口"""
    if request.method == 'GET':
        return jsonify({
            "success": True,
            "counter": test_data["counter"],
            "timestamp": datetime.now().isoformat(),
        })
    
    elif request.method == 'POST':
        try:
            data = request.get_json() or {}
            increment = data.get("increment", 1)
            test_data["counter"] += increment
            return jsonify({
                "success": True,
                "counter": test_data["counter"],
                "increment": increment,
                "timestamp": datetime.now().isoformat(),
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e),
            }), 400


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "接口不存在",
        "path": request.path,
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "服务器内部错误",
        "message": str(error),
    }), 500


if __name__ == '__main__':
    import sys
    
    # 默认端口，如果被占用可以修改
    port = 5000
    
    # 检查命令行参数是否指定了端口
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"警告: 无效的端口号 '{sys.argv[1]}'，使用默认端口 5000")
    
    # 如果端口 5000 被占用，尝试使用 5001
    if port == 5000:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', 5000))
        sock.close()
        if result == 0:
            print("⚠️  端口 5000 已被占用（可能是 macOS 的 AirPlay Receiver）")
            print("   自动切换到端口 5001\n")
            port = 5001
    
    print("=" * 50)
    print("测试API服务器启动中...")
    print("=" * 50)
    print("\n可用接口：")
    print(f"  GET  http://localhost:{port}/              - API文档")
    print(f"  GET  http://localhost:{port}/api/users    - 获取用户列表")
    print(f"  POST http://localhost:{port}/api/users    - 创建用户")
    print(f"  GET  http://localhost:{port}/api/products - 获取产品列表")
    print(f"  POST http://localhost:{port}/api/products  - 创建产品")
    print(f"  POST http://localhost:{port}/api/echo      - 回显请求数据")
    print(f"  GET  http://localhost:{port}/api/test     - 测试GET请求")
    print(f"  POST http://localhost:{port}/api/test     - 测试POST请求")
    print(f"  PUT  http://localhost:{port}/api/test     - 测试PUT请求")
    print(f"  DELETE http://localhost:{port}/api/test   - 测试DELETE请求")
    print("\n" + "=" * 50)
    print(f"服务器运行在: http://localhost:{port}")
    print("按 Ctrl+C 停止服务器")
    print("=" * 50 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=True)

