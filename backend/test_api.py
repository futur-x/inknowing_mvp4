#!/usr/bin/env python3
"""
Simple API test script for InKnowing backend
"""
import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8888"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        print("✅ Health check passed:", response.json())
        return True
    else:
        print("❌ Health check failed:", response.status_code)
        return False

def test_root():
    """Test root endpoint"""
    print("\nTesting root endpoint...")
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200:
        print("✅ Root endpoint passed:", response.json())
        return True
    else:
        print("❌ Root endpoint failed:", response.status_code)
        return False

def test_register():
    """Test user registration"""
    print("\nTesting user registration...")

    # Test data
    data = {
        "type": "phone",
        "phone": "13800138000",
        "code": "123456",
        "password": "Test123456",
        "nickname": "TestUser"
    }

    response = requests.post(
        f"{BASE_URL}/v1/auth/register",
        json=data,
        headers={"Content-Type": "application/json"}
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 201:
        print("✅ Registration successful")
        return response.json()
    else:
        print("❌ Registration failed")
        return None

def test_login(phone: str = "13800138000", password: str = "Test123456"):
    """Test user login"""
    print("\nTesting user login...")

    data = {
        "type": "phone",
        "phone": phone,
        "password": password
    }

    response = requests.post(
        f"{BASE_URL}/v1/auth/login",
        json=data,
        headers={"Content-Type": "application/json"}
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 200:
        print("✅ Login successful")
        return response.json()
    else:
        print("❌ Login failed")
        return None

def test_books(token: str = None):
    """Test books endpoint"""
    print("\nTesting books endpoint...")

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    response = requests.get(
        f"{BASE_URL}/v1/books",
        headers=headers
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}...")  # Print first 500 chars

    if response.status_code == 200:
        print("✅ Books endpoint working")
        return response.json()
    else:
        print("❌ Books endpoint failed")
        return None

def main():
    """Run all tests"""
    print("=" * 50)
    print("InKnowing Backend API Tests")
    print("=" * 50)

    # Test basic endpoints
    test_health()
    test_root()

    # Test authentication
    auth_response = test_register()

    if auth_response:
        token = auth_response.get("access_token")
        # Test authenticated endpoints
        test_books(token)
    else:
        # Try without authentication
        test_books()

    print("\n" + "=" * 50)
    print("Tests completed")
    print("=" * 50)

if __name__ == "__main__":
    main()