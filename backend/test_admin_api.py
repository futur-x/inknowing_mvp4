#!/usr/bin/env python3
"""
Test admin API with proper authentication
"""

import requests
import json

# Base URL
BASE_URL = "http://localhost:8888/v1"

def test_admin_stats():
    """Test admin stats API"""

    # Login to get token
    print("1. Logging in...")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "phone": "13800000001",
            "code": "123456"
        }
    )

    if login_response.status_code == 200:
        auth_data = login_response.json()
        token = auth_data.get("access_token")
        print(f"✓ Login successful, got token: {token[:20]}...")

        # Test admin stats endpoint
        print("\n2. Testing /v1/admin/stats endpoint...")
        stats_response = requests.get(
            f"{BASE_URL}/admin/stats",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )

        print(f"Status Code: {stats_response.status_code}")
        if stats_response.status_code == 200:
            stats_data = stats_response.json()
            print("✓ Admin stats retrieved successfully!")
            print(json.dumps(stats_data, indent=2))
        else:
            print(f"✗ Failed to get admin stats: {stats_response.text}")
    else:
        print(f"✗ Login failed: {login_response.text}")

if __name__ == "__main__":
    test_admin_stats()