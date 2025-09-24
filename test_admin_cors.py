#!/usr/bin/env python3
"""
Test script for admin panel CORS and authentication
"""
import requests
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8888/v1"
FRONTEND_URL = "http://localhost:3555"

# Test colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def test_cors_preflight():
    """Test CORS preflight request"""
    print("\n1. Testing CORS preflight request...")

    url = f"{API_BASE_URL}/admin/analytics"
    headers = {
        "Origin": FRONTEND_URL,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type"
    }

    try:
        response = requests.options(url, headers=headers, timeout=5)

        # Check CORS headers
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers")
        }

        print(f"  Status Code: {response.status_code}")
        print(f"  CORS Headers:")
        for key, value in cors_headers.items():
            if value:
                print(f"    {GREEN}✓{RESET} {key}: {value}")
            else:
                print(f"    {RED}✗{RESET} {key}: Missing")

        return response.status_code == 200 and cors_headers["Access-Control-Allow-Origin"]
    except Exception as e:
        print(f"  {RED}Error: {e}{RESET}")
        return False

def test_admin_login():
    """Test admin login endpoint"""
    print("\n2. Testing admin login...")

    url = f"{API_BASE_URL}/admin/login"
    headers = {
        "Origin": FRONTEND_URL,
        "Content-Type": "application/json"
    }
    data = {
        "username": "admin",
        "password": "admin123"
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=5)

        print(f"  Status Code: {response.status_code}")

        # Check CORS headers
        if response.headers.get("Access-Control-Allow-Origin"):
            print(f"  {GREEN}✓{RESET} CORS headers present")
        else:
            print(f"  {YELLOW}⚠{RESET} CORS headers missing (may be OK for successful request)")

        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            if access_token:
                print(f"  {GREEN}✓{RESET} Access token received")
                return access_token
            else:
                print(f"  {RED}✗{RESET} No access token in response")
        else:
            print(f"  {RED}✗{RESET} Login failed: {response.text}")

    except Exception as e:
        print(f"  {RED}Error: {e}{RESET}")

    return None

def test_admin_analytics(access_token):
    """Test admin analytics endpoint with authentication"""
    print("\n3. Testing admin analytics with Bearer token...")

    url = f"{API_BASE_URL}/admin/analytics/overview"
    headers = {
        "Origin": FRONTEND_URL,
        "Authorization": f"Bearer {access_token}"
    }

    try:
        response = requests.get(url, headers=headers, timeout=5)

        print(f"  Status Code: {response.status_code}")

        # Check CORS headers
        cors_origin = response.headers.get("Access-Control-Allow-Origin")
        if cors_origin:
            print(f"  {GREEN}✓{RESET} CORS Origin: {cors_origin}")
        else:
            print(f"  {RED}✗{RESET} CORS headers missing")

        if response.status_code == 200:
            print(f"  {GREEN}✓{RESET} Analytics data retrieved successfully")
            return True
        else:
            print(f"  {RED}✗{RESET} Failed to get analytics: {response.text}")

    except Exception as e:
        print(f"  {RED}Error: {e}{RESET}")

    return False

def test_unauthenticated_request():
    """Test that unauthenticated requests still get CORS headers"""
    print("\n4. Testing unauthenticated request (should have CORS headers even on 401)...")

    url = f"{API_BASE_URL}/admin/analytics/overview"
    headers = {
        "Origin": FRONTEND_URL
    }

    try:
        response = requests.get(url, headers=headers, timeout=5)

        print(f"  Status Code: {response.status_code}")

        # Check CORS headers
        cors_origin = response.headers.get("Access-Control-Allow-Origin")
        if cors_origin:
            print(f"  {GREEN}✓{RESET} CORS headers present even on 401")
            print(f"    Access-Control-Allow-Origin: {cors_origin}")
        else:
            print(f"  {RED}✗{RESET} CORS headers missing on 401 - This is the problem!")

        return cors_origin is not None

    except Exception as e:
        print(f"  {RED}Error: {e}{RESET}")
        return False

def main():
    print(f"\n{'='*60}")
    print(f"Admin Panel CORS & Authentication Test")
    print(f"API URL: {API_BASE_URL}")
    print(f"Frontend URL: {FRONTEND_URL}")
    print(f"Time: {datetime.now()}")
    print(f"{'='*60}")

    # Run tests
    results = []

    # Test 1: CORS preflight
    results.append(("CORS Preflight", test_cors_preflight()))

    # Test 2: Admin login
    access_token = test_admin_login()
    results.append(("Admin Login", access_token is not None))

    # Test 3: Authenticated request
    if access_token:
        results.append(("Authenticated Request", test_admin_analytics(access_token)))
    else:
        results.append(("Authenticated Request", False))
        print("\n3. Skipping authenticated request test (no token)")

    # Test 4: Unauthenticated request
    results.append(("Unauthenticated CORS", test_unauthenticated_request()))

    # Summary
    print(f"\n{'='*60}")
    print("Test Summary:")
    print(f"{'='*60}")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = f"{GREEN}✓ PASS{RESET}" if result else f"{RED}✗ FAIL{RESET}"
        print(f"  {test_name:25} {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed < total:
        print(f"\n{YELLOW}⚠ Recommendations:{RESET}")
        if not results[0][1]:  # CORS preflight failed
            print("  - Check that CORS middleware is properly configured")
            print("  - Verify that OPTIONS requests are handled")
        if not results[3][1]:  # Unauthenticated CORS failed
            print("  - CORS headers missing on 401 responses")
            print("  - This is causing the browser CORS error")
            print("  - The enhanced CORS middleware should fix this")
    else:
        print(f"\n{GREEN}✓ All tests passed! CORS is working correctly.{RESET}")

if __name__ == "__main__":
    main()