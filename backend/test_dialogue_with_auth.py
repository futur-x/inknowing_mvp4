#!/usr/bin/env python3
"""
Complete dialogue flow test with authentication
Tests: Register → Login → Browse Books → Start Dialogue → Send Message → Receive AI Response
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

class DialogueFlowTester:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0)
        self.access_token: Optional[str] = None
        self.ws_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.session_id: Optional[str] = None
        self.book_id: Optional[str] = None

    async def cleanup(self):
        """Clean up resources"""
        await self.client.aclose()

    async def register_user(self):
        """Register a new test user"""
        print(f"\n📝 Registering user with phone: {TEST_PHONE}")

        # First send verification code
        code_response = await self.client.post(
            "/auth/verify-code",
            json={"phone": TEST_PHONE}
        )
        print(f"   Verification code sent: {code_response.status_code}")

        # Register with phone
        register_data = {
            "type": "phone",
            "phone": TEST_PHONE,
            "code": TEST_CODE,
            "password": TEST_PASSWORD
        }

        response = await self.client.post("/auth/register", json=register_data)

        if response.status_code == 201:
            auth_data = response.json()
            self.access_token = auth_data["access_token"]
            self.refresh_token = auth_data["refresh_token"]
            self.ws_token = auth_data.get("ws_token", self.access_token)
            self.user_id = auth_data["user"]["id"]

            # Set authorization header for future requests
            self.client.headers["Authorization"] = f"Bearer {self.access_token}"

            print(f"   ✅ Registration successful!")
            print(f"   User ID: {self.user_id}")
            print(f"   Has ws_token: {'Yes' if 'ws_token' in auth_data else 'No'}")
            return True
        else:
            print(f"   ❌ Registration failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False

    async def login_user(self):
        """Login with existing user"""
        print(f"\n🔐 Logging in with phone: {TEST_PHONE}")

        login_data = {
            "type": "phone",
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        }

        response = await self.client.post("/auth/login", json=login_data)

        if response.status_code == 200:
            auth_data = response.json()
            self.access_token = auth_data["access_token"]
            self.refresh_token = auth_data["refresh_token"]
            self.ws_token = auth_data.get("ws_token", self.access_token)
            self.user_id = auth_data["user"]["id"]

            # Set authorization header
            self.client.headers["Authorization"] = f"Bearer {self.access_token}"

            print(f"   ✅ Login successful!")
            print(f"   User ID: {self.user_id}")
            print(f"   Has ws_token: {'Yes' if 'ws_token' in auth_data else 'No'}")
            return True
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False

    async def browse_books(self):
        """Browse available books"""
        print("\n📚 Browsing books...")

        response = await self.client.get("/books?limit=5")

        if response.status_code == 200:
            data = response.json()
            books = data.get("books", [])

            if books:
                print(f"   Found {len(books)} books:")
                for book in books[:3]:
                    print(f"   - {book['title']} by {book['author']}")
                    if not self.book_id:
                        self.book_id = book['id']
                return True
            else:
                print("   ❌ No books found")
                return False
        else:
            print(f"   ❌ Failed to fetch books: {response.status_code}")
            return False

    async def start_dialogue(self):
        """Start a dialogue session with a book"""
        if not self.book_id:
            print("\n❌ No book selected")
            return False

        print(f"\n💬 Starting dialogue with book ID: {self.book_id}")

        dialogue_data = {
            "book_id": self.book_id,
            "initial_question": "请给我介绍一下这本书的主要内容"
        }

        response = await self.client.post("/dialogues/book/start", json=dialogue_data)

        if response.status_code == 201:
            session_data = response.json()
            self.session_id = session_data["id"]
            print(f"   ✅ Dialogue session created!")
            print(f"   Session ID: {self.session_id}")
            print(f"   Book: {session_data.get('book_title', 'Unknown')}")
            return True
        else:
            print(f"   ❌ Failed to start dialogue: {response.status_code}")
            print(f"   Error: {response.text}")
            return False

    async def test_websocket(self):
        """Test WebSocket connection and messaging"""
        if not self.session_id or not self.ws_token:
            print("\n❌ Missing session ID or token")
            return False

        print(f"\n🔌 Testing WebSocket connection...")
        print(f"   Session ID: {self.session_id}")
        print(f"   Has token: {'Yes' if self.ws_token else 'No'}")

        ws_url = f"{WS_BASE_URL}/dialogues/ws/{self.session_id}?token={self.ws_token}"

        try:
            async with websockets.connect(ws_url) as websocket:
                print("   ✅ WebSocket connected!")

                # Send a test message
                test_message = {
                    "type": "message",
                    "content": "这本书的核心思想是什么？"
                }

                print(f"\n📤 Sending message: {test_message['content']}")
                await websocket.send(json.dumps(test_message))

                # Wait for responses
                response_count = 0
                full_response = ""

                print("\n📥 Receiving responses:")

                while response_count < 10:  # Limit iterations
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                        data = json.loads(message)

                        if data.get("type") == "typing":
                            if data.get("isTyping"):
                                print("   ⌨️  AI is typing...")
                            else:
                                print("   ✓  AI finished typing")
                        elif data.get("type") == "response":
                            content = data.get("content", "")
                            full_response += content
                            print(f"   📝 Response chunk: {content[:100]}...")
                        elif data.get("type") == "error":
                            print(f"   ❌ Error: {data.get('message', 'Unknown error')}")
                            break

                        response_count += 1

                        # Check if we got a complete response
                        if full_response and data.get("type") == "response" and not data.get("isTyping"):
                            break

                    except asyncio.TimeoutError:
                        print("   ⏰ Timeout waiting for response")
                        break

                if full_response:
                    print(f"\n   ✅ Complete AI response received!")
                    print(f"   Response length: {len(full_response)} characters")
                    print(f"   Response preview: {full_response[:200]}...")
                    return True
                else:
                    print("\n   ❌ No AI response received")
                    return False

        except websockets.exceptions.WebSocketException as e:
            print(f"   ❌ WebSocket error: {e}")
            return False
        except Exception as e:
            print(f"   ❌ Unexpected error: {e}")
            return False

    async def send_api_message(self):
        """Send message via REST API (fallback)"""
        if not self.session_id:
            print("\n❌ No session ID")
            return False

        print(f"\n📮 Sending message via REST API...")

        message_data = {
            "message": "这本书适合什么样的读者？"
        }

        response = await self.client.post(
            f"/dialogues/{self.session_id}/messages",
            json=message_data
        )

        if response.status_code == 200:
            message_response = response.json()
            print(f"   ✅ Message sent and response received!")
            print(f"   AI Response: {message_response.get('content', '')[:200]}...")
            return True
        else:
            print(f"   ❌ Failed to send message: {response.status_code}")
            print(f"   Error: {response.text}")
            return False

    async def run_complete_flow(self):
        """Run the complete dialogue flow test"""
        print("=" * 60)
        print("🚀 COMPLETE DIALOGUE FLOW TEST WITH AUTHENTICATION")
        print("=" * 60)

        results = {}

        try:
            # Step 1: Register/Login
            if not await self.register_user():
                print("   Trying login instead...")
                if not await self.login_user():
                    print("\n❌ Authentication failed")
                    return results

            results["authentication"] = "✅ PASSED"

            # Step 2: Browse books
            if await self.browse_books():
                results["browse_books"] = "✅ PASSED"
            else:
                results["browse_books"] = "❌ FAILED"
                return results

            # Step 3: Start dialogue
            if await self.start_dialogue():
                results["start_dialogue"] = "✅ PASSED"
            else:
                results["start_dialogue"] = "❌ FAILED"
                return results

            # Step 4: Test WebSocket
            if await self.test_websocket():
                results["websocket"] = "✅ PASSED"
            else:
                results["websocket"] = "⚠️  FAILED (trying API)"
                # Fallback to REST API
                if await self.send_api_message():
                    results["api_message"] = "✅ PASSED"
                else:
                    results["api_message"] = "❌ FAILED"

        finally:
            await self.cleanup()

        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        for step, result in results.items():
            print(f"   {step}: {result}")

        all_passed = all("✅" in r for r in results.values())
        if all_passed:
            print("\n🎉 ALL TESTS PASSED! The dialogue flow is working!")
        else:
            print("\n⚠️  Some tests failed. Check the details above.")

        return results

async def main():
    """Main test runner"""
    tester = DialogueFlowTester()
    results = await tester.run_complete_flow()

    # Save results to file
    report_path = "/Users/dajoe/joe_ai_lab/inmvp3/inknowing_mvp_ver4/backend/dialogue_test_results.json"
    with open(report_path, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "results": results,
            "test_phone": TEST_PHONE
        }, f, indent=2)

    print(f"\n📄 Test results saved to: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())