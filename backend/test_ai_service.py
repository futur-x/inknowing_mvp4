#!/usr/bin/env python3
"""
Test AI service connectivity and configuration
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_litellm_connection():
    """Test LiteLLM service connection"""
    print("\n=== Testing LiteLLM Service ===")

    from services.litellm_service import LiteLLMService

    service = LiteLLMService()

    # Print configuration
    print(f"\nConfiguration:")
    print(f"  Base URL: {service.base_url}")
    print(f"  API Key: {service.api_key[:10]}..." if service.api_key else "  API Key: None")
    print(f"  Chat Model: {service.chat_model}")
    print(f"  Embedding Model: {service.embedding_model}")
    print(f"  Temperature: {service.temperature}")
    print(f"  Max Tokens: {service.max_tokens}")

    # Test connection
    print(f"\nTesting connection...")
    result = await service.test_connection()

    if result["status"] == "connected":
        print(f"✅ Connection successful!")
        print(f"  Chat Response: {result.get('chat_response', 'N/A')}")
        print(f"  Embedding Status: {result.get('embedding_status', 'N/A')}")
    else:
        print(f"❌ Connection failed!")
        print(f"  Error: {result.get('error', 'Unknown error')}")

    return result

async def test_ai_service():
    """Test simplified AI service"""
    print("\n=== Testing AI Service (ai_litellm.py) ===")

    from services.ai_litellm import SimplifiedAIService

    service = SimplifiedAIService()

    # Test connection through the wrapper
    print(f"\nTesting AI service wrapper...")
    result = await service.test_connection()

    if result["status"] == "connected":
        print(f"✅ AI Service wrapper connected!")
        print(f"  Provider: {result.get('provider', 'N/A')}")

        # Test actual chat completion
        print(f"\nTesting chat completion...")
        try:
            response = await service.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "Say 'Hello, AI service is working!' in exactly those words."}
                ],
                max_tokens=20,
                temperature=0
            )

            if response.get("content"):
                print(f"✅ Chat completion successful!")
                print(f"  Response: {response['content']}")
                print(f"  Model: {response.get('model', 'N/A')}")
                print(f"  Latency: {response.get('latency_ms', 'N/A')}ms")
            else:
                print(f"⚠️  Chat completion returned but with issues")
                if response.get("error"):
                    print(f"  Error: {response['error']}")
        except Exception as e:
            print(f"❌ Chat completion failed: {e}")
    else:
        print(f"❌ AI Service wrapper failed!")
        print(f"  Error: {result.get('error', 'Unknown error')}")

    return result

async def test_dialogue_integration():
    """Test dialogue service AI integration"""
    print("\n=== Testing Dialogue Service Integration ===")

    # This will test if the dialogue service can properly use AI
    from services.dialogue import dialogue_service
    from services.ai_litellm import ai_service

    print(f"\nChecking if AI service is properly initialized...")

    # Try a simple message generation
    try:
        messages = [
            {"role": "system", "content": "You are a book discussion assistant."},
            {"role": "user", "content": "Hello, can you help me understand this book?"}
        ]

        response = await ai_service.chat_completion(
            messages=messages,
            user_id="test_user",
            session_id="test_session",
            feature="dialogue",
            temperature=0.7,
            max_tokens=100
        )

        if response.get("content"):
            print(f"✅ Dialogue AI integration working!")
            print(f"  Response preview: {response['content'][:100]}...")
        else:
            print(f"⚠️  Dialogue AI integration has issues")
            if response.get("error"):
                print(f"  Error: {response['error']}")
    except Exception as e:
        print(f"❌ Dialogue AI integration failed: {e}")

async def main():
    """Run all tests"""
    print("="*50)
    print("AI SERVICE CONFIGURATION TEST")
    print("="*50)

    # Test LiteLLM connection
    litellm_result = await test_litellm_connection()

    # Test AI service wrapper
    ai_result = await test_ai_service()

    # Test dialogue integration
    await test_dialogue_integration()

    # Summary
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)

    if litellm_result["status"] == "connected" and ai_result["status"] == "connected":
        print("✅ AI services are properly configured and working!")
        print("\nNext steps:")
        print("1. Ensure the backend server is running: python main.py")
        print("2. Test the WebSocket connection with the dialogue flow")
        print("3. Check frontend timeout settings if issues persist")
    else:
        print("❌ AI services have configuration issues!")
        print("\nTroubleshooting:")
        print("1. Check if LiteLLM proxy is accessible at: https://litellm.futurx.cc")
        print("2. Verify API key is valid: sk-tptTrlFHR14EDpg")
        print("3. Check network connectivity")
        print("4. Review error messages above for specific issues")

if __name__ == "__main__":
    asyncio.run(main())