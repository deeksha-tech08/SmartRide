import requests
import time
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def print_step(msg):
    print(f"\n-> {msg}")

def print_success(msg):
    print(f"[OK] {msg}")

def print_error(msg):
    print(f"[ERROR] {msg}")
    sys.exit(1)

def run_tests():
    print("========================================")
    print(" SmartRide E2E Automated Test Suite ")
    print("========================================")

    # 1. Setup isolated test users
    print_step("Setting up isolated test users...")
    p_cred = {"email": f"test_pass_{time.time()}@example.com", "password": "password123", "name": "Test Passenger", "role": "passenger"}
    d1_cred = {"email": f"test_driv1_{time.time()}@example.com", "password": "password123", "name": "Test Driver 1", "role": "driver"}
    d2_cred = {"email": f"test_driv2_{time.time()}@example.com", "password": "password123", "name": "Test Driver 2", "role": "driver"}

    for cred in [p_cred, d1_cred, d2_cred]:
        requests.post(f"{BASE_URL}/auth/register", json=cred)

    p_token = requests.post(f"{BASE_URL}/auth/login", json={"email": p_cred["email"], "password": p_cred["password"]}).json()["access_token"]
    d1_token = requests.post(f"{BASE_URL}/auth/login", json={"email": d1_cred["email"], "password": d1_cred["password"]}).json()["access_token"]
    d2_token = requests.post(f"{BASE_URL}/auth/login", json={"email": d2_cred["email"], "password": d2_cred["password"]}).json()["access_token"]

    p_headers = {"Authorization": f"Bearer {p_token}"}
    d1_headers = {"Authorization": f"Bearer {d1_token}"}
    d2_headers = {"Authorization": f"Bearer {d2_token}"}

    # Setup driver profiles
    requests.post(f"{BASE_URL}/drivers/profile", json={"vehicle_model": "Car1", "license_plate": "AA11", "capacity": 4}, headers=d1_headers)
    requests.post(f"{BASE_URL}/drivers/profile", json={"vehicle_model": "Car2", "license_plate": "BB22", "capacity": 4}, headers=d2_headers)
    
    print_success("Users registered and logged in.")

    # 2. Test RBAC Security Constraints
    print_step("Testing RBAC Security Boundaries...")
    ai_req = {"pickup_lat": 18.52, "pickup_lng": 73.85, "dest_lat": 18.55, "dest_lng": 73.88}
    
    # Driver tries to call passenger endpoint
    ai_res_driver = requests.post(f"{BASE_URL}/ai/estimate-fare", json=ai_req, headers=d1_headers)
    if ai_res_driver.status_code == 403:
        print_success("Driver correctly blocked from calling Passenger-only AI endpoint (403).")
    else:
        print_error(f"Security failure: Driver not blocked! Status: {ai_res_driver.status_code}")

    # Passenger calls passenger endpoint
    ai_res_pass = requests.post(f"{BASE_URL}/ai/estimate-fare", json=ai_req, headers=p_headers)
    if ai_res_pass.status_code == 200:
        print_success("Passenger successfully called AI endpoint (200).")
    else:
        print_error(f"Passenger blocked from AI endpoint! Status: {ai_res_pass.status_code}")

    # 3. Test Ride Lifecycle
    print_step("Testing Ride Lifecycle (Happy Path + Validation Constraints)...")
    requests.post(f"{BASE_URL}/drivers/go-online", headers=d1_headers)
    requests.post(f"{BASE_URL}/drivers/go-online", headers=d2_headers)

    ride_req = {"pickup_lat": 18.5204, "pickup_lng": 73.8567, "dest_lat": 18.5504, "dest_lng": 73.8867}
    ride = requests.post(f"{BASE_URL}/rides/request", json=ride_req, headers=p_headers).json()
    ride_id = ride["id"]
    print_success(f"Ride successfully created by Passenger. ID: {ride_id}")

    # Driver 1 accepts
    acc1 = requests.post(f"{BASE_URL}/rides/{ride_id}/accept", headers=d1_headers)
    if acc1.status_code == 200:
        print_success("Driver 1 successfully accepted the ride.")
    else:
        print_error("Driver 1 failed to accept.")

    # Driver 2 tries to accept (Race Condition Check)
    acc2 = requests.post(f"{BASE_URL}/rides/{ride_id}/accept", headers=d2_headers)
    if acc2.status_code == 400:
        print_success("Driver 2 successfully blocked from accepting the already-claimed ride (400 Race Condition handling).")
    else:
        print_error("Driver 2 bypassed race condition check!")

    # Invalid status transition (accepted -> started)
    inv_stat = requests.post(f"{BASE_URL}/rides/{ride_id}/status", json={"status": "started"}, headers=d1_headers)
    if inv_stat.status_code == 400:
        print_success("Strict transition check passed! Driver 1 blocked from skipping 'arrived' state (400).")
    else:
        print_error("Driver bypassed state transition rules!")

    # Valid transitions
    for status in ["arriving", "arrived", "started", "completed"]:
        stat_res = requests.post(f"{BASE_URL}/rides/{ride_id}/status", json={"status": status}, headers=d1_headers)
        if stat_res.status_code == 200:
            print_success(f"Successfully transitioned ride to: {status}")
        else:
            print_error(f"Failed to transition to {status}. Status code: {stat_res.status_code}")

    # 4. Test History Isolation
    print_step("Testing Ride History (Data Isolation)...")
    p_hist = requests.get(f"{BASE_URL}/rides/history", headers=p_headers).json()
    d1_hist = requests.get(f"{BASE_URL}/rides/history", headers=d1_headers).json()
    d2_hist = requests.get(f"{BASE_URL}/rides/history", headers=d2_headers).json()

    if len(p_hist) == 1 and len(d1_hist) == 1:
        print_success("Passenger and Driver 1 correctly received exactly 1 completed ride in history.")
    else:
        print_error("History counts mismatched!")

    if len(d2_hist) == 0:
        print_success("Driver 2 correctly received 0 rides in history (Data Isolation).")
    else:
        print_error("Driver 2 received ride history they do not own!")

    print("\n*** ALL TESTS PASSED SUCCESSFULLY! ***\n")

if __name__ == "__main__":
    run_tests()
