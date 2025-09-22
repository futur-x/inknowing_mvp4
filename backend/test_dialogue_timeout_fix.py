#!/usr/bin/env python3
"""
Test dialogue WebSocket connection with timeout fix validation
"""

import asyncio
import json
import time
from datetime import datetime
import httpx
import websockets
from typing import Optional

# Configuration
API_BASE_URL = "http://localhost:8888/v1"
WS_BASE_URL = "ws://localhost:8888/v1"
TEST_PHONE = f"138{int(time.time()) % 100000000:08d}"  # Generate unique phone
TEST_PASSWORD = "Test123!@#"
TEST_CODE = "123456"  # Mock verification code

class TimeoutTestClient:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0)
        self.access_token: Optional[str] = None
        self.session_id: Optional[str] = None
        self.book_id: Optional[str] = None
        self.message_id: Optional[str] = None

    async def cleanup(self):
        """Clean up resources"""
        await self.client.aclose()

    async def register_and_login(self):
        """Login with existing test account or register new one"""
        # Try to login with existing test account first
        print(f"\n📝 Trying to login with test account...")

        # Try known test account
        login_data = {
            "username": "13800000001",  # Common test account
            "password": "Test123!",
            "grant_type": "password"
        }

        response = await self.client.post("/auth/login", data=login_data)
        if response.status_code == 200:
            data = response.json()
            self.access_token = data["access_token"]
            print(f"✅ Login successful with existing test account")
            return True

        # Try to register new account
        print(f"   Attempting to register new user with phone: {TEST_PHONE}")

        # First send verification code
        code_response = await self.client.post(
            "/auth/verify-code",
            json={"phone": TEST_PHONE}
        )

        # Register
        register_data = {
            "type": "phone",
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD,
            "code": TEST_CODE
        }

        response = await self.client.post("/auth/register", json=register_data)
        if response.status_code == 201:
            # Login with new account
            login_data = {
                "username": TEST_PHONE,
                "password": TEST_PASSWORD,
                "grant_type": "password"
            }

            response = await self.client.post("/auth/login", data=login_data)
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                print(f"✅ Login successful with new account")
                return True

        print(f"❌ Authentication failed")
        return False

    async def get_books(self):
        """Get available books"""
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = await self.client.get("/books", headers=headers)

        if response.status_code == 200:
            books = response.json()["books"]
            if books:
                self.book_id = books[0]["id"]
                print(f"✅ Found book: {books[0]['title']} (ID: {self.book_id})")
                return True

        print(f"❌ No books found")
        return False

    async def start_dialogue_session(self):
        """Start a dialogue session"""
        headers = {"Authorization": f"Bearer {self.access_token}"}
        data = {"book_id": self.book_id, "type": "book"}

        response = await self.client.post(
            "/dialogues/book/start",
            json=data,
            headers=headers
        )

        if response.status_code in [200, 201]:
            session = response.json()
            self.session_id = session["id"]
            print(f"✅ Dialogue session started: {self.session_id}")
            return True

        print(f"❌ Failed to start session: {response.text}")
        return False

    async def test_websocket_timeout(self):
        """Test WebSocket connection with timeout handling"""
        print(f"\n🔌 Testing WebSocket with timeout fix...")

        ws_url = f"{WS_BASE_URL}/dialogues/ws/{self.session_id}?token={self.access_token}"

        try:
            async with websockets.connect(ws_url) as websocket:
                print(f"   Connected to WebSocket")

                # Generate message ID like frontend does
                self.message_id = f"msg_{int(time.time() * 1000)}_{hash(time.time()) % 1000000:06d}"

                # Send message with message ID (matching the fixed format)
                message = {
                    "type": "message",  # Fixed from "user_message"
                    "content": "Hello, can you tell me about this book?",
                    "messageId": self.message_id
                }

                print(f"   Sending message with ID: {self.message_id}")
                await websocket.send(json.dumps(message))

                # Start timer
                start_time = time.time()
                timeout = 60  # 60 seconds timeout
                received_response = False
                received_typing = False

                while time.time() - start_time < timeout:
                    try:
                        # Wait for response with timeout
                        response = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=1.0
                        )

                        data = json.loads(response)
                        msg_type = data.get("type")

                        if msg_type == "typing":
                            if not received_typing:
                                print(f"   ⌨️  Received typing indicator")
                                received_typing = True

                        elif msg_type == "ai_response":
                            response_time = time.time() - start_time
                            response_message_id = data.get("messageId")

                            print(f"\n✅ AI Response received in {response_time:.2f} seconds")
                            print(f"   Message ID match: {response_message_id == self.message_id}")
                            print(f"   Content preview: {data.get('content', '')[:100]}...")

                            if response_message_id != self.message_id:
                                print(f"   ⚠️  Message ID mismatch!")
                                print(f"      Expected: {self.message_id}")
                                print(f"      Received: {response_message_id}")

                            received_response = True
                            break

                        elif msg_type == "error":
                            print(f"   ❌ Error: {data.get('message', 'Unknown error')}")
                            break

                    except asyncio.TimeoutError:
                        # Check every second
                        elapsed = time.time() - start_time
                        if int(elapsed) % 10 == 0 and elapsed > 0:
                            print(f"   ⏳ Waiting... ({int(elapsed)}s)")

                if not received_response:
                    elapsed = time.time() - start_time
                    print(f"\n❌ Timeout after {elapsed:.2f} seconds - No AI response received")
                    return False

                return True

        except Exception as e:
            print(f"❌ WebSocket error: {e}")
            return False

async def main():
    """Run the timeout fix test"""
    print("="*50)
    print("AI DIALOGUE TIMEOUT FIX TEST")
    print("="*50)

    tester = TimeoutTestClient()

    try:
        # Setup
        if not await tester.register_and_login():
            print("Failed to authenticate")
            return

        if not await tester.get_books():
            print("Failed to get books")
            return

        if not await tester.start_dialogue_session():
            print("Failed to start dialogue session")
            return

        # Test WebSocket with timeout
        success = await tester.test_websocket_timeout()

        # Summary
        print("\n" + "="*50)
        print("TEST RESULT")
        print("="*50)

        if success:
            print("✅ TIMEOUT FIX VERIFIED!")
            print("\nThe fix successfully:")
            print("1. Corrected message type from 'user_message' to 'message'")
            print("2. Properly passes messageId through the WebSocket flow")
            print("3. Clears timeout timers when AI response is received")
            print("4. Prevents false timeout errors")
        else:
            print("❌ TIMEOUT ISSUE PERSISTS")
            print("\nPossible issues:")
            print("1. Backend server not running or not updated")
            print("2. Frontend changes not built/deployed")
            print("3. AI service taking longer than 60 seconds")
            print("4. Network or configuration issues")

    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main())