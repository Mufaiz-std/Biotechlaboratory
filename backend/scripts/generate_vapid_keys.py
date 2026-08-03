import os, base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

# Generate VAPID key pair
private_key = ec.generate_private_key(ec.SECP256R1())
private_bytes = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)
public_key = private_key.public_key()
public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)
# Encode to URL-safe base64 without padding
public_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
private_b64 = base64.urlsafe_b64encode(private_bytes).decode('utf-8').rstrip('=')

# Write to backend .env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
with open(env_path, 'a') as f:
    f.write(f'VAPID_PUBLIC_KEY={public_b64}\n')
    f.write(f'VAPID_PRIVATE_KEY={private_b64}\n')
print('VAPID keys generated and appended to .env')
