import requests
import sys

AUTH_URL = "http://localhost:8003"
GENEALOGY_URL = "http://localhost:8006"

def verify():
    # 1. Register
    print("Registering user...")
    reg_data = {
        "email": "verify_user@example.com",
        "password": "SecurePassword123!",
        "full_name": "Verification User"
    }
    try:
        resp = requests.post(f"{AUTH_URL}/register", json=reg_data)
        if resp.status_code == 400 and "already registered" in resp.text:
            print("User already registered, proceeding to login.")
        elif resp.status_code != 201:
            print(f"Registration failed: {resp.status_code} {resp.text}")
            return
    except Exception as e:
        print(f"Registration error: {e}")
        return

    # 2. Login
    print("Logging in...")
    login_data = {
        "email": "verify_user@example.com",
        "password": "SecurePassword123!"
    }
    resp = requests.post(f"{AUTH_URL}/login", json=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        return
    
    token = resp.json().get("access_token")
    if not token:
        print("No access token returned")
        return
    print("Login successful, token received.")

    # 3. Create Family Tree
    print("Creating family tree...")
    headers = {"Authorization": f"Bearer {token}"}
    tree_data = {
        "name": "Verification Tree",
        "description": "Tree for automated verification",
        "is_public": False
    }
    resp = requests.post(f"{GENEALOGY_URL}/family-trees/", json=tree_data, headers=headers)
    if resp.status_code != 201:
        print(f"Create tree failed: {resp.status_code} {resp.text}")
        return
    
    tree_id = resp.json().get("id")
    print(f"Tree created with ID: {tree_id}")

    # 4. Export GEDCOM
    print("Exporting GEDCOM...")
    resp = requests.get(f"{GENEALOGY_URL}/family-trees/{tree_id}/export/gedcom", headers=headers)
    if resp.status_code != 200:
        print(f"GEDCOM export failed: {resp.status_code} {resp.text}")
        return
    
    gedcom_content = resp.text
    print("GEDCOM Export successful. Content preview:")
    print(gedcom_content[:200])

    if "0 HEAD" in gedcom_content and "0 @SUBM@ SUBM" in gedcom_content:
        print("\nVERIFICATION SUCCESSFUL: End-to-end flow works.")
    else:
        print("\nVERIFICATION FAILED: GEDCOM content seems invalid.")

if __name__ == "__main__":
    verify()
