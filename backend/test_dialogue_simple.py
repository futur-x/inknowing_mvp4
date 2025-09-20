#!/usr/bin/env python3
"""
Simple dialogue flow test with known test user
"""

import asyncio
import json
import httpx
import websockets

# Configuration
API_BASE_URL = "http://localhost:8888/v1"
WS_BASE_URL = "ws://localhost:8888/v1"

# Use the known test user
TEST_PHONE = "13812345678"
TEST_PASSWORD = "Test123!@#"

async def test_dialogue_flow():
    """Test the complete dialogue flow"""
    print("=" * 60)
    print("🚀 TESTING DIALOGUE FLOW WITH KNOWN TEST USER")
    print("=" * 60)

    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:

        # Step 1: Login
        print(f"\n🔐 Logging in with phone: {TEST_PHONE}")
        login_response = await client.post("/auth/login", json={
            "type": "phone",
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })

        if login_response.status_code != 200:
            print(f"   ❌ Login failed: {login_response.status_code}")
            print(f"   Error: {login_response.text}")
            return False

        auth_data = login_response.json()
        access_token = auth_data["access_token"]
        ws_token = auth_data.get("ws_token", access_token)
        user_id = auth_data["user"]["id"]

        print(f"   ✅ Login successful!")
        print(f"   User ID: {user_id}")
        print(f"   Has ws_token: {'Yes' if 'ws_token' in auth_data else 'No'}")

        # Set auth header
        client.headers["Authorization"] = f"Bearer {access_token}"

        # Step 2: Get a book
        print("\n📚 Getting first available book...")
        books_response = await client.get("/books?limit=1")

        if books_response.status_code != 200:
            print(f"   ❌ Failed to get books: {books_response.status_code}")
            return False

        books_data = books_response.json()
        if not books_data.get("books"):
            print("   ❌ No books available")
            return False

        book = books_data["books"][0]
        book_id = book["id"]
        print(f"   ✅ Selected book: {book['title']}")

        # Step 3: Start dialogue
        print(f"\n💬 Starting dialogue with book...")
        dialogue_response = await client.post("/dialogues/book/start", json={
            "book_id": book_id,
            "initial_question": "请介绍一下这本书"
        })

        if dialogue_response.status_code != 201:
            print(f"   ❌ Failed to start dialogue: {dialogue_response.status_code}")
            print(f"   Error: {dialogue_response.text}")
            return False

        dialogue_data = dialogue_response.json()
        session_id = dialogue_data["id"]
        print(f"   ✅ Dialogue started!")
        print(f"   Session ID: {session_id}")

        # Step 4: Test WebSocket
        print(f"\n🔌 Connecting to WebSocket...")
        ws_url = f"{WS_BASE_URL}/dialogues/ws/{session_id}?token={ws_token}"

        try:
            async with websockets.connect(ws_url) as websocket:
                print("   ✅ WebSocket connected!")

                # Send message
                message = {
                    "type": "message",
                    "content": "这本书的主题是什么？"
                }

                print(f"\n📤 Sending: {message['content']}")
                await websocket.send(json.dumps(message))

                # Receive response
                print("\n📥 Waiting for AI response...")
                response_received = False
                timeout_count = 0

                while timeout_count < 3:
                    try:
                        msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        data = json.loads(msg)

                        if data.get("type") == "typing":
                            print(f"   ⌨️  AI typing: {data.get('isTyping')}")
                        elif data.get("type") == "response":
                            print(f"   📝 AI response: {data.get('content', '')[:100]}...")
                            response_received = True
                            break
                        elif data.get("type") == "error":
                            print(f"   ❌ Error: {data.get('message')}")
                            break

                    except asyncio.TimeoutError:
                        timeout_count += 1
                        print(f"   ⏰ Timeout #{timeout_count}")

                if response_received:
                    print("\n   ✅ WebSocket dialogue successful!")
                    return True
                else:
                    print("\n   ⚠️  No response via WebSocket, trying REST API...")

        except Exception as e:
            print(f"   ❌ WebSocket error: {e}")
            print("\n   ⚠️  WebSocket failed, trying REST API...")

        # Step 5: Fallback to REST API
        print(f"\n📮 Sending message via REST API...")
        message_response = await client.post(
            f"/dialogues/{session_id}/messages",
            json={"message": "这本书的主题是什么？"}
        )

        if message_response.status_code == 200:
            msg_data = message_response.json()
            print(f"   ✅ API response received!")
            print(f"   Content: {msg_data.get('content', '')[:100]}...")
            return True
        else:
            print(f"   ❌ API message failed: {message_response.status_code}")
            print(f"   Error: {message_response.text}")
            return False

async def main():
    """Main runner"""
    success = await test_dialogue_flow()

    print("\n" + "=" * 60)
    if success:
        print("🎉 DIALOGUE FLOW IS WORKING!")
    else:
        print("❌ DIALOGUE FLOW HAS ISSUES")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())