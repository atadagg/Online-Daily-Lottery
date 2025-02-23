import secrets
import string
import uuid
import hashlib
import os
from datetime import datetime

def generate_session_secret(length=64):
    """Generate a secure session secret."""
    return secrets.token_hex(length)

def generate_api_key(length=32):
    """Generate a secure API key."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_password(length=16):
    """Generate a secure password with mixed characters."""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Check if password contains at least one of each required type
        if (any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in string.punctuation for c in password)):
            return password

def generate_salt():
    """Generate a secure salt for password hashing."""
    return os.urandom(16).hex()

def generate_db_credentials():
    """Generate secure database credentials."""
    return {
        'username': f"user_{secrets.token_hex(4)}",
        'password': generate_password(20),
        'database': f"db_{secrets.token_hex(4)}"
    }

def generate_config():
    """Generate all necessary security configurations."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    config = {
        'session_secret': generate_session_secret(),
        'api_key': generate_api_key(),
        'db_credentials': generate_db_credentials(),
        'jwt_secret': generate_session_secret(),
        'encryption_key': os.urandom(32).hex(),
        'salt': generate_salt(),
    }
    
    # Print configurations
    print("\n=== Security Configuration Generated ===")
    print(f"Generated at: {timestamp}\n")
    
    for key, value in config.items():
        if isinstance(value, dict):
            print(f"\n{key.upper()}:")
            for subkey, subvalue in value.items():
                print(f"{subkey}: {subvalue}")
        else:
            print(f"\n{key.upper()}:")
            print(value)
    
    # Save to file
    filename = f"security_config_{timestamp}.txt"
    with open(filename, 'w') as f:
        f.write(f"Security Configuration Generated at {timestamp}\n\n")
        for key, value in config.items():
            f.write(f"\n{key.upper()}:\n")
            if isinstance(value, dict):
                for subkey, subvalue in value.items():
                    f.write(f"{subkey}: {subvalue}\n")
            else:
                f.write(f"{value}\n")
    
    print(f"\nConfiguration saved to: {filename}")

if __name__ == "__main__":
    generate_config()