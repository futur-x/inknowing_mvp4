#!/usr/bin/env python3
"""
Test complete dialogue flow with LiteLLM integration
"""
import asyncio
import json
import httpx
from datetime import datetime


class DialogueFlowTester:
    def __init__(self):
        self.base_url = "http://localhost:8888/v1"
        self.client = httpx.AsyncClient(timeout=30.0)
        self.token = None
        self.user = None
        self.session_id = None

    async def login(self):
        """Login and get access token"""
        print("\n1. Testing login...")
        response = await self.client.post(
            f"{self.base_url}/auth/login",
            json={
                "type": "phone",
                "phone": "13900000001",
                "password": "TestPassword123!"
            }
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.user = data["user"]
            print(f"✓ Login successful. User: {self.user['nickname']}")
            return True
        else:
            print(f"✗ Login failed: {response.text}")
            return False

    async def search_books(self, query: str):
        """Search for books by question"""
        print(f"\n2. Searching books for: '{query}'")
        response = await self.client.get(
            f"{self.base_url}/search",
            params={"q": query, "type": "question"},
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            print(f"✓ Found {len(results)} books")
            for i, result in enumerate(results[:3], 1):
                book = result["book"]
                print(f"  {i}. {book['title']} by {book['author']}")
            return results
        else:
            print(f"✗ Search failed: {response.text}")
            return []

    async def get_popular_books(self):
        """Get popular books"""
        print("\n3. Getting popular books...")
        response = await self.client.get(
            f"{self.base_url}/books/popular",
            params={"period": "week", "limit": 5}
        )
        if response.status_code == 200:
            data = response.json()
            books = data.get("books", [])
            print(f"✓ Found {len(books)} popular books")
            for i, book in enumerate(books, 1):
                print(f"  {i}. {book['title']} (ID: {book['id']})")
            return books
        else:
            print(f"✗ Failed to get popular books: {response.text}")
            return []

    async def start_dialogue(self, book_id: str, initial_question: str = None):
        """Start a dialogue session with a book"""
        print(f"\n4. Starting dialogue with book ID: {book_id}")

        if not self.token:
            print("✗ No auth token available. Please login first.")
            return None

        response = await self.client.post(
            f"{self.base_url}/dialogues/book/start",
            json={
                "book_id": book_id,
                "initial_question": initial_question
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )

        if response.status_code == 201:
            data = response.json()
            self.session_id = data["id"]
            print(f"✓ Dialogue session started: {self.session_id}")
            print(f"  Book: {data['book_title']}")
            print(f"  Type: {data['type']}")
            return data
        else:
            print(f"✗ Failed to start dialogue: {response.text}")
            return None

    async def send_message(self, message: str):
        """Send a message in the dialogue session"""
        print(f"\n5. Sending message: '{message}'")

        if not self.session_id:
            print("✗ No session ID. Please start a dialogue first.")
            return None

        response = await self.client.post(
            f"{self.base_url}/dialogues/{self.session_id}/messages",
            json={"message": message},
            headers={"Authorization": f"Bearer {self.token}"}
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Response received:")
            print(f"  Role: {data['role']}")
            print(f"  Content: {data['content'][:200]}...")
            if data.get('references'):
                print(f"  References: {len(data['references'])} found")
            print(f"  Model: {data.get('model_used', 'unknown')}")
            print(f"  Tokens: {data.get('tokens_used', 0)}")
            return data
        else:
            print(f"✗ Failed to send message: {response.text}")
            return None

    async def get_dialogue_history(self):
        """Get dialogue history for current user"""
        print("\n6. Getting dialogue history...")

        response = await self.client.get(
            f"{self.base_url}/dialogues/history",
            headers={"Authorization": f"Bearer {self.token}"}
        )

        if response.status_code == 200:
            data = response.json()
            sessions = data.get("sessions", [])
            print(f"✓ Found {len(sessions)} dialogue sessions")
            for i, session in enumerate(sessions[:3], 1):
                print(f"  {i}. {session['book_title']} - {session['message_count']} messages")
            return sessions
        else:
            print(f"✗ Failed to get history: {response.text}")
            return []

    async def test_ai_connection(self):
        """Test AI service connection"""
        print("\n7. Testing AI service connection...")

        # Import and test the AI service directly
        try:
            from services.ai_litellm import ai_service
            result = await ai_service.test_connection()
            if result["status"] == "connected":
                print(f"✓ AI service connected via {result.get('provider', 'unknown')}")
                if "details" in result:
                    print(f"  Details: {result['details']}")
            else:
                print(f"✗ AI service connection failed: {result.get('error', 'Unknown error')}")
            return result
        except Exception as e:
            print(f"✗ Failed to test AI service: {e}")
            return {"status": "error", "error": str(e)}

    async def run_complete_flow(self):
        """Run the complete user journey"""
        print("=" * 60)
        print("TESTING COMPLETE USER JOURNEY: 提问→发现→对话→学习")
        print("=" * 60)

        try:
            # Step 1: Login
            if not await self.login():
                return

            # Step 2: Search books (提问→发现)
            question = "How to become a better leader?"
            results = await self.search_books(question)

            # Step 3: Use test books instead of popular books
            test_book_id = "test-leadership-101"  # Use our test book
            print(f"\n3. Using test book: {test_book_id}")

            # Step 4: Start dialogue (发现→对话)
            session = await self.start_dialogue(
                book_id=test_book_id,
                initial_question=question
            )

            if session:
                # Step 5: Send messages (对话→学习)
                await self.send_message("What are the key principles?")
                await asyncio.sleep(2)  # Wait a bit
                await self.send_message("Can you give me an example?")

            # Step 6: Check dialogue history
            await self.get_dialogue_history()

            # Step 7: Test AI connection
            await self.test_ai_connection()

            print("\n" + "=" * 60)
            print("✓ COMPLETE USER JOURNEY TEST FINISHED")
            print("=" * 60)

        except Exception as e:
            print(f"\n✗ Test failed with error: {e}")

        finally:
            await self.client.aclose()


async def main():
    tester = DialogueFlowTester()
    await tester.run_complete_flow()


if __name__ == "__main__":
    asyncio.run(main())