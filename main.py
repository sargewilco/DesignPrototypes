import base64
import hashlib
from Crypto.Cipher import AES

def decrypt_binary(encrypted_data, password):
    iv = encrypted_data[:16]
    # This is an adjustment from the original gist to handle the padding data type
    padding_length = int(encrypted_data[16])
    cipher = encrypted_data[17:]
    key = hashlib.sha256(password.encode("utf-8")).digest()
    aes = AES.new(key, AES.MODE_CBC, iv)
    padded_plain = aes.decrypt(cipher)
    plain = padded_plain[:-padding_length]
    return plain

from Crypto.Random import get_random_bytes

def encrypt_binary(data: bytes, password: str) -> bytes:
    plain = data
    padding_length = 16 - len(plain) % 16
    padding = b"\0" * padding_length
    padded_plain = plain + padding
    key = hashlib.sha256(password.encode("utf-8")).digest()
    iv = get_random_bytes(16)
    aes = AES.new(key, AES.MODE_CBC, iv)
    cipher = aes.encrypt(padded_plain)
    encrypted_data = iv + padding_length.to_bytes(length=1, byteorder='big') + cipher
    return encrypted_data

def encrypt_string(data: str, password: str) -> str:
    encrypted_data = encrypt_binary(data.encode("utf-8"), password)
    return base64.b64encode(encrypted_data).decode("utf-8")


def decrypt_string(encrypted_data: str, password: str) -> str:
    """
    Decrypts an AES256 encrypted string.

    Args:
      encrypted_data: The base64 encoded encrypted string.
      password: The password to use for decryption.

    Returns:
      The decrypted string.
    """
    decrypted_data = decrypt_binary(base64.b64decode(encrypted_data), password)
    return decrypted_data.decode("utf-8")

if __name__ == "__main__":
    # Test the encryption and decryption
    password = "mysecretpassword"
    original_string = "This is a secret message."
    encrypted_string = encrypt_string(original_string, password)
    decrypted_string = decrypt_string(encrypted_string, password)
    assert original_string == decrypted_string
    print("Test passed!")

    # Example usage
    encrypted_string_input = input("Enter the encrypted string: ")
    password_input = input("Enter the password: ")
    try:
        decrypted_string_output = decrypt_string(encrypted_string_input, password_input)
        print("Decrypted string:", decrypted_string_output)
    except Exception as e:
        print("An error occurred during decryption:", e)