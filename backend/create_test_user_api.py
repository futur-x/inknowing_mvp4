#!/usr/bin/env python3
"""
Create test user via API for end-to-end testing
"""
import asyncio
import httpx
import json
from datetime import datetime

API_BASE_URL = "http://localhost:8888/v1"

async def register_user(phone: str, password: str):
    """Register a new user via API"""
    async with httpx.AsyncClient() as client:
        try:
            # Register user with phone number
            register_data = {
                "type": "phone",
                "phone": phone,
                "code": "123456",  # Test code for development environment
                "password": password,
                "nickname": f"TestUser_{phone[-4:]}"
            }

            print(f"Registering phone: {phone}")
            response = await client.post(
                f"{API_BASE_URL}/auth/register",
                json=register_data
            )

            if response.status_code in [200, 201]:
                data = response.json()
                print(f"✓ User registered successfully")
                print(f"  Username: {data['user']['username']}")
                print(f"  Phone: {data['user']['phone']}")
                return data
            else:
                print(f"✗ Failed to register user: {response.status_code}")
                print(f"  Response: {response.text}")
                return None

        except Exception as e:
            print(f"✗ Error registering user: {e}")
            return None

async def login_user(phone: str, password: str):
    """Login user and get tokens"""
    async with httpx.AsyncClient() as client:
        try:
            login_data = {
                "type": "phone",
                "phone": phone,
                "password": password
            }

            print(f"Logging in phone: {phone}")
            response = await client.post(
                f"{API_BASE_URL}/auth/login",
                json=login_data
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✓ User logged in successfully")
                print(f"  Access Token: {data.get('access_token', 'N/A')[:20]}...")
                print(f"  WebSocket Token: {data.get('ws_token', 'N/A')[:20]}...")

                # Check cookies
                cookies = response.cookies
                print(f"  Cookies received: {list(cookies.keys())}")

                return data, cookies
            else:
                print(f"✗ Failed to login: {response.status_code}")
                print(f"  Response: {response.text}")
                return None, None

        except Exception as e:
            print(f"✗ Error logging in: {e}")
            return None, None

async def get_user_profile(access_token: str, cookies=None):
    """Get user profile to verify authentication"""
    async with httpx.AsyncClient(cookies=cookies) as client:
        try:
            headers = {}
            if access_token:
                headers["Authorization"] = f"Bearer {access_token}"

            print("Getting user profile...")
            response = await client.get(
                f"{API_BASE_URL}/auth/me",
                headers=headers
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✓ User profile retrieved:")
                print(f"  Username: {data['username']}")
                print(f"  Email: {data.get('email', 'N/A')}")
                print(f"  Membership: {data.get('membership', 'N/A')}")
                return data
            else:
                print(f"✗ Failed to get profile: {response.status_code}")
                print(f"  Response: {response.text}")
                return None

        except Exception as e:
            print(f"✗ Error getting profile: {e}")
            return None

async def main():
    """Main test function"""
    print("=" * 60)
    print("API Test User Creation Script")
    print("=" * 60)

    # Generate unique phone number (Chinese format)
    timestamp = datetime.now().strftime("%H%M%S")
    # Use a valid Chinese phone format with random last digits
    phone = f"138{timestamp[:8]}"
    if len(phone) < 11:
        phone = phone + "0" * (11 - len(phone))
    password = "Test123!@#"

    # Register user
    register_result = await register_user(phone, password)
    if not register_result:
        print("\n❌ Registration failed, attempting login with existing test user...")
        phone = "13800138000"  # Default test phone
        password = "Test123!@#"

    # Login user
    login_result, cookies = await login_user(phone, password)
    if not login_result:
        print("\n❌ Login failed")
        return

    # Get profile
    access_token = login_result.get("access_token")
    profile = await get_user_profile(access_token, cookies)

    # Save credentials for later use
    test_credentials = {
        "phone": phone,
        "username": profile.get("username") if profile else None,
        "password": password,
        "access_token": access_token,
        "ws_token": login_result.get("ws_token"),
        "user_id": str(profile.get("id")) if profile else None
    }

    with open("test_credentials.json", "w") as f:
        json.dump(test_credentials, f, indent=2)

    print("\n" + "=" * 60)
    print("✅ Test user created/verified successfully!")
    print(f"   Credentials saved to test_credentials.json")
    print("=" * 60)

    return test_credentials

if __name__ == "__main__":
    result = asyncio.run(main())
    if result:
        print(f"\nTest user ready:")
        print(f"  Phone: {result['phone']}")
        print(f"  Username: {result['username']}")
        print(f"  Password: {result['password']}")