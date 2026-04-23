"""Helpers de password para el modulo de autenticacion."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets


PBKDF2_ITERATIONS = 390000
SALT_SIZE = 16
HASH_NAME = "sha256"


def hash_password(password: str) -> str:
    password = (password or "").strip()
    if not password:
        raise ValueError("La password no puede estar vacia.")

    salt = secrets.token_bytes(SALT_SIZE)
    digest = hashlib.pbkdf2_hmac(HASH_NAME, password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return "pbkdf2_sha256${iterations}${salt}${digest}".format(
        iterations=PBKDF2_ITERATIONS,
        salt=base64.b64encode(salt).decode("ascii"),
        digest=base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, encoded_password: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = encoded_password.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    candidate = hashlib.pbkdf2_hmac(
        HASH_NAME,
        (password or "").encode("utf-8"),
        base64.b64decode(salt_b64.encode("ascii")),
        int(iterations),
    )
    expected = base64.b64decode(digest_b64.encode("ascii"))
    return hmac.compare_digest(candidate, expected)
