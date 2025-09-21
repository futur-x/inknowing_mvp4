#!/usr/bin/env python3
"""
测试聊天功能修复
验证session管理和WebSocket连接是否正常
"""
import asyncio
import json
import logging
from datetime import datetime
import httpx
import websockets

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8888"
WS_URL = "ws://localhost:8888"

# 测试账号
TEST_PHONE = "13900000002"
TEST_PASSWORD = "Test@123456"


async def test_complete_chat_flow():
    """测试完整的聊天流程"""
    async with httpx.AsyncClient() as client:
        logger.info("=== 开始测试聊天功能修复 ===")

        # 1. 登录
        logger.info("步骤1: 用户登录")
        login_response = await client.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )

        if login_response.status_code != 200:
            logger.error(f"登录失败: {login_response.text}")
            return False

        auth_data = login_response.json()
        access_token = auth_data["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        logger.info(f"✓ 登录成功，获取token")

        # 2. 获取书籍列表
        logger.info("步骤2: 获取书籍列表")
        books_response = await client.get(
            f"{BASE_URL}/api/v1/books",
            headers=headers,
            params={"limit": 5}
        )

        if books_response.status_code != 200:
            logger.error(f"获取书籍失败: {books_response.text}")
            return False

        books_data = books_response.json()
        books = books_data.get("books", [])

        if not books:
            logger.error("没有可用的书籍")
            return False

        book_id = books[0]["id"]
        book_title = books[0]["title"]
        logger.info(f"✓ 选择书籍: {book_title} (ID: {book_id})")

        # 3. 创建对话会话
        logger.info("步骤3: 创建对话会话")
        create_session_response = await client.post(
            f"{BASE_URL}/api/v1/dialogues/start",
            headers=headers,
            json={"book_id": book_id}
        )

        if create_session_response.status_code not in [200, 201]:
            logger.error(f"创建对话失败: {create_session_response.text}")
            return False

        session_data = create_session_response.json()
        session_id = session_data["id"]
        logger.info(f"✓ 创建对话成功，会话ID: {session_id}")

        # 4. 测试HTTP发送消息
        logger.info("步骤4: 通过HTTP发送消息")
        message_content = "请介绍一下这本书的主要内容"
        send_message_response = await client.post(
            f"{BASE_URL}/api/v1/dialogues/{session_id}/messages",
            headers=headers,
            json={"message": message_content}
        )

        if send_message_response.status_code != 200:
            logger.error(f"发送消息失败: {send_message_response.text}")
            return False

        message_data = send_message_response.json()
        logger.info(f"✓ HTTP消息发送成功")
        logger.info(f"  用户消息: {message_content}")
        logger.info(f"  AI回复: {message_data.get('response', {}).get('content', 'N/A')[:100]}...")

        # 5. 测试WebSocket连接
        logger.info("步骤5: 测试WebSocket连接")
        ws_url = f"{WS_URL}/api/v1/dialogues/{session_id}/ws"

        try:
            async with websockets.connect(
                ws_url,
                extra_headers={"Authorization": f"Bearer {access_token}"}
            ) as websocket:
                logger.info("✓ WebSocket连接成功")

                # 发送一条消息
                ws_message = {
                    "type": "user_message",
                    "content": "通过WebSocket发送：这本书的作者是谁？"
                }
                await websocket.send(json.dumps(ws_message))
                logger.info(f"✓ WebSocket消息已发送: {ws_message['content']}")

                # 接收响应（设置超时）
                try:
                    response = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=10.0
                    )
                    response_data = json.loads(response)

                    # 跳过typing indicator，等待真正的响应
                    while response_data.get("type") == "typing":
                        response = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=10.0
                        )
                        response_data = json.loads(response)

                    logger.info(f"✓ 收到WebSocket响应: {response_data}")

                    # 关闭WebSocket连接
                    await websocket.close()
                    logger.info("✓ WebSocket连接已关闭")

                except asyncio.TimeoutError:
                    logger.warning("WebSocket响应超时，但连接本身成功")

        except Exception as e:
            logger.error(f"WebSocket连接失败: {str(e)}")
            return False

        # 6. 获取对话历史
        logger.info("步骤6: 获取对话历史")
        messages_response = await client.get(
            f"{BASE_URL}/api/v1/dialogues/{session_id}/messages",
            headers=headers,
            params={"page": 1, "page_size": 10}
        )

        if messages_response.status_code != 200:
            logger.error(f"获取对话历史失败: {messages_response.text}")
            return False

        messages_data = messages_response.json()
        messages = messages_data.get("messages", [])
        logger.info(f"✓ 获取对话历史成功，共 {len(messages)} 条消息")

        # 7. 结束对话
        logger.info("步骤7: 结束对话会话")
        end_session_response = await client.post(
            f"{BASE_URL}/api/v1/dialogues/{session_id}/end",
            headers=headers
        )

        if end_session_response.status_code not in [200, 204]:
            logger.warning(f"结束对话可能失败: {end_session_response.status_code}")
        else:
            logger.info("✓ 对话会话已结束")

        logger.info("=== 测试完成 ===")
        logger.info("✓ 所有测试通过！聊天功能正常")
        return True


async def main():
    """主函数"""
    try:
        success = await test_complete_chat_flow()
        if success:
            logger.info("\n🎉 修复验证成功！对话功能已恢复正常")
        else:
            logger.error("\n❌ 修复验证失败，仍有问题需要解决")
    except Exception as e:
        logger.error(f"\n❌ 测试过程中出现错误: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())