import requests
import json
import time

# --- 1. YOUR PISTE CREDENTIALS ---
CLIENT_ID = "095260DD-747A-4AE2-8A7E-999878AEC4A2"
CLIENT_SECRET = "9d93c73b-e7cf-41ff-9cef-08ef4955db34"

# The text ID for the Arrêté du 25 juin 1980 (ERP)
TEXT_ID = "LEGITEXT000020303557"

# --- 2. GET THE ACCESS TOKEN ---
print("Authenticating with PISTE...")
token_url = "https://oauth.piste.gouv.fr/api/oauth/token"

payload = {
    "grant_type": "client_credentials",
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "scope": "openid" 
}

token_response = requests.post(token_url, data=payload)

# NEW: Print the exact error message from the server before it crashes!
if token_response.status_code != 200:
    print("\n--- PISTE ERROR MESSAGE ---")
    print(token_response.text)
    print("---------------------------\n")

token_response.raise_for_status() 
access_token = token_response.json().get("access_token")

# --- 3. FETCH THE DOCUMENT ---
print("Downloading the document structure...")
api_url = "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app/consult/legiPart"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# We request the text ID and provide today's timestamp so we get the current, in-force 2026 version
body = {
    "textId": TEXT_ID,
    "date": int(time.time() * 1000) 
}

api_response = requests.post(api_url, headers=headers, json=body)
api_response.raise_for_status()
data = api_response.json()

# --- 4. SAVE TO JSON ---
output_filename = "arrete_erp_1980.json"
with open(output_filename, "w", encoding="utf-8") as f:
    # indent=4 ensures the JSON is human-readable and nicely formatted
    json.dump(data, f, ensure_ascii=False, indent=4)

print(f"Success! The document has been saved as {output_filename}")