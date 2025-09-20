"""
Test script for LiteLLM integration
Run this to verify the AI service is working correctly
"""
import asyncio
import os
from services.litellm_service import get_litellm_service

# Set environment variables for testing
os.environ["AI_BASE_URL"] = "https://litellm.futurx.cc"
os.environ["AI_API_KEY"] = "sk-tptTrlFHR14EDpg"
os.environ["AI_CHAT_MODEL"] = "anthropic/claude-3-5-haiku-20241022"
os.environ["AI_EMBEDDING_MODEL"] = "azure/text-embedding-3-large"


async def test_litellm():
    """Test LiteLLM service connection and functionality"""
    print("Testing LiteLLM Integration...")
    print("-" * 50)

    # Get service instance
    service = get_litellm_service()

    # Test connection
    print("\n1. Testing Connection...")
    result = await service.test_connection()

    print(f"   Status: {result['status']}")
    print(f"   Base URL: {result['base_url']}")
    print(f"   Chat Model: {result.get('chat_model', 'N/A')}")

    if result['status'] == 'connected':
        print(f"   Chat Response: {result.get('chat_response', 'N/A')}")
        print(f"   Embedding Status: {result.get('embedding_status', 'N/A')}")
        print("\n✅ LiteLLM connection successful!")

        # Test actual dialogue
        print("\n2. Testing Dialogue Response...")
        messages = [
            {"role": "system", "content": "You are a helpful assistant discussing books."},
            {"role": "user", "content": "What makes a good book?"}
        ]

        response = await service.chat_completion(messages, max_tokens=100)
        content = response.choices[0].message.content

        print(f"   AI Response: {content[:200]}...")
        print(f"   Model Used: {response.model}")

        if response.usage:
            print(f"   Tokens Used - Input: {response.usage.prompt_tokens}, Output: {response.usage.completion_tokens}")

        # Test streaming
        print("\n3. Testing Streaming Response...")
        print("   Streaming: ", end="", flush=True)

        stream = await service.chat_completion(messages, stream=True, max_tokens=50)
        chars_count = 0
        async for chunk in stream:
            if chunk.get("type") == "content":
                chars_count += len(chunk["content"])
                print(".", end="", flush=True)

        print(f"\n   Streamed {chars_count} characters successfully!")

        print("\n✅ All tests passed! LiteLLM integration is working correctly.")
        return True

    else:
        print(f"\n❌ Connection failed: {result.get('error', 'Unknown error')}")
        return False


if __name__ == "__main__":
    # Run the test
    success = asyncio.run(test_litellm())
    exit(0 if success else 1)