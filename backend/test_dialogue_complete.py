#!/usr/bin/env python3
"""
完整的对话流程测试
"""
import asyncio
import json
import requests
import websockets
import time
from typing import Optional, Dict, Any

# 配置
API_BASE = "http://localhost:8888/v1"
WS_BASE = "ws://localhost:8888/v1"

# 测试账号
TEST_PHONE = "13900000002"
TEST_PASSWORD = "Test@123456"

# 颜色输出
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(message: str):
    print(f"\n{Colors.BOLD}{Colors.OKBLUE}► {message}{Colors.ENDC}")

def print_success(message: str):
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")

def print_error(message: str):
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

def print_info(message: str, data: Any = None):
    print(f"  {message}")
    if data:
        if isinstance(data, dict):
            print(f"  {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"  {data}")

class DialogueTestClient:
    def __init__(self):
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.session_id: Optional[str] = None
        self.book_id: Optional[str] = None

    def test_login(self) -> bool:
        """测试登录"""
        print_step("1. 测试登录")

        try:
            response = requests.post(
                f"{API_BASE}/auth/login",
                json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
            )

            if response.status_code == 200:
                data = response.json()
                self.token = data.get('ws_token') or data.get('access_token')
                self.user_id = data.get('user', {}).get('id')

                if self.token:
                    print_success("登录成功")
                    print_info(f"用户ID: {self.user_id}")
                    print_info(f"Token: {self.token[:30]}...")
                    return True
                else:
                    print_error("登录响应中没有token")
                    return False
            else:
                print_error(f"登录失败: {response.status_code}")
                print_info("响应:", response.text)
                return False
        except Exception as e:
            print_error(f"登录异常: {e}")
            return False

    def test_get_books(self) -> bool:
        """获取可用书籍"""
        print_step("2. 获取可用书籍")

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{API_BASE}/books?limit=5",
                headers=headers
            )

            if response.status_code == 200:
                data = response.json()
                books = data.get('books', [])

                if books:
                    self.book_id = books[0]['id']
                    print_success(f"获取到 {len(books)} 本书")
                    print_info(f"选择书籍: {books[0]['title']} (ID: {self.book_id})")
                    return True
                else:
                    print_error("没有可用书籍")
                    return False
            else:
                print_error(f"获取书籍失败: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"获取书籍异常: {e}")
            return False

    def test_create_session(self) -> bool:
        """创建对话会话"""
        print_step("3. 创建对话会话")

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(
                f"{API_BASE}/dialogues/book/start",
                json={
                    "book_id": self.book_id,
                    "type": "book"
                },
                headers=headers
            )

            if response.status_code in [200, 201]:
                data = response.json()
                self.session_id = data.get('id')

                if self.session_id:
                    print_success("创建会话成功")
                    print_info(f"会话ID: {self.session_id}")
                    return True
                else:
                    print_error("响应中没有会话ID")
                    print_info("响应:", data)
                    return False
            else:
                print_error(f"创建会话失败: {response.status_code}")
                print_info("响应:", response.text)
                return False
        except Exception as e:
            print_error(f"创建会话异常: {e}")
            return False

    async def test_websocket(self) -> bool:
        """测试WebSocket连接和对话"""
        print_step("4. 测试WebSocket连接")

        # 构建WebSocket URL
        ws_url = f"{WS_BASE}/dialogues/ws/{self.session_id}?token={self.token}"
        print_info(f"WebSocket URL: {ws_url[:80]}...")

        try:
            async with websockets.connect(ws_url) as websocket:
                print_success("WebSocket连接成功")

                # 监听初始消息
                print_info("等待服务器初始消息...")
                try:
                    initial = await asyncio.wait_for(websocket.recv(), timeout=2)
                    print_info("收到初始消息:", json.loads(initial))
                except asyncio.TimeoutError:
                    print_info("没有初始消息（正常）")

                # 发送测试消息
                print_step("5. 发送测试消息")
                test_message = {
                    "type": "message",
                    "content": "你好，请介绍一下这本书的主要内容"
                }

                print_info("发送消息:", test_message)
                await websocket.send(json.dumps(test_message))

                # 接收响应
                print_info("等待AI响应...")
                response_count = 0
                start_time = time.time()

                while time.time() - start_time < 30:  # 30秒超时
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=5)
                        response_data = json.loads(response)
                        response_count += 1

                        msg_type = response_data.get('type', 'unknown')
                        print_info(f"收到消息 #{response_count} (类型: {msg_type})")

                        if msg_type == 'error':
                            print_error(f"错误消息: {response_data.get('message')}")
                            return False
                        elif msg_type == 'typing':
                            print_info(f"打字指示器: {response_data.get('isTyping')}")
                        elif msg_type == 'assistant':
                            content = response_data.get('content', '')
                            print_success("收到AI响应")
                            print_info(f"内容: {content[:200]}..." if len(content) > 200 else f"内容: {content}")

                            # 发送第二条消息测试连续对话
                            print_step("6. 测试连续对话")
                            follow_up = {
                                "type": "message",
                                "content": "能否更详细地解释一下？"
                            }
                            print_info("发送后续消息:", follow_up)
                            await websocket.send(json.dumps(follow_up))
                        else:
                            print_info(f"未知消息类型: {response_data}")

                    except asyncio.TimeoutError:
                        if response_count > 2:  # 如果已经收到了一些响应
                            print_success("对话测试完成")
                            return True
                        continue
                    except websockets.exceptions.ConnectionClosed as e:
                        print_error(f"连接关闭: {e}")
                        return False
                    except Exception as e:
                        print_error(f"接收消息异常: {e}")
                        return False

                # 正常关闭连接
                await websocket.close()
                print_success("WebSocket连接正常关闭")
                return True

        except websockets.exceptions.WebSocketException as e:
            print_error(f"WebSocket连接失败: {e}")
            return False
        except Exception as e:
            print_error(f"WebSocket异常: {e}")
            return False

    def test_get_messages(self) -> bool:
        """获取对话历史"""
        print_step("7. 验证对话历史")

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{API_BASE}/dialogues/{self.session_id}/messages",
                headers=headers
            )

            if response.status_code == 200:
                data = response.json()
                messages = data.get('items', [])

                if messages:
                    print_success(f"获取到 {len(messages)} 条消息")
                    for i, msg in enumerate(messages[:3]):  # 只显示前3条
                        print_info(f"  消息 {i+1}: [{msg.get('role')}] {msg.get('content', '')[:50]}...")
                    return True
                else:
                    print_info("暂无消息历史")
                    return True
            else:
                print_error(f"获取消息失败: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"获取消息异常: {e}")
            return False

async def main():
    """主测试流程"""
    print(f"{Colors.HEADER}{'='*60}")
    print("InKnowing 对话功能完整测试")
    print(f"{'='*60}{Colors.ENDC}")

    client = DialogueTestClient()

    # 执行测试步骤
    steps = [
        ("登录", client.test_login),
        ("获取书籍", client.test_get_books),
        ("创建会话", client.test_create_session)
    ]

    for step_name, step_func in steps:
        if not step_func():
            print_error(f"\n测试失败: {step_name}")
            return False

    # WebSocket测试（异步）
    if not await client.test_websocket():
        print_error("\n测试失败: WebSocket对话")
        return False

    # 验证消息历史
    if not client.test_get_messages():
        print_error("\n测试失败: 获取消息历史")
        return False

    print(f"\n{Colors.HEADER}{'='*60}")
    print(f"{Colors.OKGREEN}所有测试通过！对话功能正常工作。{Colors.ENDC}")
    print(f"{'='*60}{Colors.ENDC}")
    return True

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
        exit(1)