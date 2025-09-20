#!/usr/bin/env python3
"""
Test login with existing user
"""
import asyncio
import httpx
import json

API_BASE_URL = "http://localhost:8888/v1"

async def test_login():
    """Test login with testuser1"""
    async with httpx.AsyncClient() as client:
        # Method 1: Try phone login
        phone_data = {
            "type": "phone",
            "phone": "13800138000",
            "password": "Test123!@#"
        }

        print("Testing phone login...")
        response = await client.post(
            f"{API_BASE_URL}/auth/login",
            json=phone_data
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Phone login successful!")
            print(f"  Access Token: {data.get('access_token', '')[:30]}...")
            print(f"  WS Token: {data.get('ws_token', '')[:30]}...")
            return data
        else:
            print(f"✗ Phone login failed: {response.status_code}")
            print(f"  Response: {response.text}")

        # Method 2: Try username login (if phone fails)
        username_data = {
            "username": "testuser1",
            "password": "Test123!@#"
        }

        print("\nTrying username login...")
        response = await client.post(
            f"{API_BASE_URL}/auth/login",
            data=username_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Username login successful!")
            print(f"  Access Token: {data.get('access_token', '')[:30]}...")
            print(f"  WS Token: {data.get('ws_token', '')[:30]}...")
            return data
        else:
            print(f"✗ Username login failed: {response.status_code}")
            print(f"  Response: {response.text}")

        return None

async def main():
    print("=" * 60)
    print("Test User Login")
    print("=" * 60)

    result = await test_login()

    if result:
        # Save credentials
        with open("test_credentials.json", "w") as f:
            json.dump({
                "username": "testuser1",
                "password": "Test123!@#",
                "access_token": result.get("access_token"),
                "ws_token": result.get("ws_token"),
                "user": result.get("user")
            }, f, indent=2)

        print("\n✅ Login successful! Credentials saved to test_credentials.json")
    else:
        print("\n❌ Login failed")

if __name__ == "__main__":
    asyncio.run(main())