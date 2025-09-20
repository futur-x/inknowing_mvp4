"""
测试WebSocket认证流程
"""
import requests
import json
import asyncio
import websockets
import sys

# API基础URL
BASE_URL = "http://localhost:8888/v1"

# 测试账户
TEST_PHONE = "13900000002"
TEST_PASSWORD = "Test@123456"

def test_login():
    """测试登录并获取ws_token"""
    print("\n1. 测试登录流程...")

    login_url = f"{BASE_URL}/auth/login"
    login_data = {
        "phone": TEST_PHONE,
        "password": TEST_PASSWORD
    }

    print(f"   登录URL: {login_url}")
    print(f"   登录数据: {login_data}")

    try:
        response = requests.post(login_url, json=login_data)
        print(f"   响应状态码: {response.status_code}")
        print(f"   响应头: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print(f"   响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")

            # 检查ws_token
            if 'ws_token' in data:
                print(f"   ✓ ws_token已返回: {data['ws_token'][:20]}...")
                return data
            else:
                print(f"   ✗ 响应中没有ws_token字段")
                print(f"   可用字段: {list(data.keys())}")
                return data
        else:
            print(f"   ✗ 登录失败: {response.text}")
            return None
    except Exception as e:
        print(f"   ✗ 请求异常: {e}")
        return None

def test_create_dialogue(token):
    """测试创建对话会话"""
    print("\n2. 测试创建对话会话...")

    dialogue_url = f"{BASE_URL}/dialogue/sessions"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    dialogue_data = {
        "name": "测试对话"
    }

    print(f"   创建对话URL: {dialogue_url}")
    print(f"   请求头: {headers}")
    print(f"   请求数据: {dialogue_data}")

    try:
        response = requests.post(dialogue_url, json=dialogue_data, headers=headers)
        print(f"   响应状态码: {response.status_code}")

        if response.status_code in [200, 201]:
            data = response.json()
            print(f"   响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
            return data.get('id') or data.get('session_id')
        else:
            print(f"   ✗ 创建对话失败: {response.text}")
            return None
    except Exception as e:
        print(f"   ✗ 请求异常: {e}")
        return None

async def test_websocket_connection(ws_token, session_id):
    """测试WebSocket连接"""
    print("\n3. 测试WebSocket连接...")

    # 构建WebSocket URL
    ws_url = f"ws://localhost:8888/ws/dialogue?token={ws_token}&session_id={session_id}"
    print(f"   WebSocket URL: {ws_url}")

    try:
        async with websockets.connect(ws_url) as websocket:
            print(f"   ✓ WebSocket连接成功!")

            # 发送测试消息
            test_message = {
                "type": "message",
                "content": "你好，这是测试消息",
                "session_id": session_id
            }

            print(f"\n4. 发送测试消息...")
            print(f"   消息内容: {json.dumps(test_message, ensure_ascii=False)}")

            await websocket.send(json.dumps(test_message))
            print(f"   ✓ 消息发送成功")

            # 接收响应
            print(f"\n5. 等待AI响应...")
            response = await websocket.recv()
            print(f"   收到响应: {response}")

            # 关闭连接
            await websocket.close()
            print(f"   ✓ 连接关闭")

    except websockets.exceptions.WebSocketException as e:
        print(f"   ✗ WebSocket连接失败: {e}")
    except Exception as e:
        print(f"   ✗ 异常: {e}")

def main():
    """主测试流程"""
    print("=" * 60)
    print("WebSocket认证流程测试")
    print("=" * 60)

    # 1. 登录获取token
    login_result = test_login()
    if not login_result:
        print("\n✗ 登录失败，测试中止")
        return

    # 获取token（可能是ws_token或access_token）
    ws_token = login_result.get('ws_token') or login_result.get('access_token') or login_result.get('token')
    if not ws_token:
        print(f"\n✗ 无法获取认证token，可用字段: {list(login_result.keys())}")
        return

    print(f"\n使用token: {ws_token[:20]}...")

    # 2. 创建对话会话
    session_id = test_create_dialogue(ws_token)
    if not session_id:
        print("\n✗ 创建对话会话失败，测试中止")
        return

    print(f"\n使用会话ID: {session_id}")

    # 3. 测试WebSocket连接
    asyncio.run(test_websocket_connection(ws_token, session_id))

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    main()