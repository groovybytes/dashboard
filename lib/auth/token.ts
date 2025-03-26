// Import the necessary functions from jose for JWT signing, verification, and JWE encryption/decryption.
import { SignJWT, jwtVerify, CompactEncrypt, compactDecrypt } from "jose";

// Import the KV store polyfill (which wraps Redis)
import { kv } from "../kv";
import { decodeHex, encodeHex } from "@std/encoding";
import { error } from "console";

// Define the token expiration time (2 hours = 7200 seconds * 1000 milliseconds).
export const TOKEN_TTL_SECONDS = 7200 * 1000;

/**
 * Creates a secure, encrypted JWT token for use in the PKCE authentication flow.
 *
 * This function encapsulates both a cryptographically random state and the intended user action (authority)
 * into a JWT token. It performs the following steps:
 *
 * 1. **Random Secret Generation:**  
 *    A unique 256-bit cryptographically secure secret is generated per token. This secret is used for both
 *    signing and encrypting the JWT, ensuring each token is individually protected.
 *
 * 2. **JWT Signing:**  
 *    The payload—containing both the `state` (for CSRF protection) and `authority` (user's intended action)—is
 *    signed using the HS256 algorithm. This ensures that any tampering with the payload can be detected.
 *
 * 3. **JWT Encryption:**  
 *    The signed JWT is encrypted using direct encryption (alg "dir") with A256GCM. Encrypting the token ensures
 *    that its contents remain confidential even if intercepted.
 *
 * 4. **External Secret Storage:**  
 *    The randomly generated secret is stored externally in a Redis-backed KV store (via the Deno KV polyfill)
 *    using the encrypted JWT token as the key. The TTL for this entry is synchronized with the token's expiration.
 *
 * **Security Concepts & Assumptions:**
 *
 * - **Enhanced CSRF and Context Binding:**  
 *   Traditional PKCE implementations use a plain random state value solely for CSRF protection. By embedding both
 *   the state and the authority (intended action) into a JWT, we bind the CSRF token to the user's intent, ensuring
 *   that the callback not only validates the request but also knows which action to execute.
 *
 * - **Per-Token Isolation:**  
 *   Each token uses its own cryptographically secure random secret. This isolates tokens from one another so that
 *   a compromise of one does not affect others.
 *
 * - **Synchronized Expiration:**  
 *   The token and its associated secret share the same TTL. This synchronization minimizes the window for potential abuse
 *   by ensuring that stale tokens and secrets are removed together.
 *
 * - **External Secret Storage:**  
 *   By storing the secret in an external, secure KV store (backed by Redis), the approach prevents an attacker
 *   from recreating or tampering with the token even if the token itself is intercepted.
 *
 * - **Assumption of Secure Transmission:**  
 *   It is assumed that all tokens are transmitted over secure channels (e.g., HTTPS), further reducing the risk of interception.
 *
 * **Justification Over a Plain Random State Value:**
 *
 * - A plain random state value provides basic CSRF protection but lacks the contextual binding of the user's intended action.
 * - Embedding both the state and authority in a signed and encrypted JWT allows the callback endpoint to verify not only the integrity
 *   of the request (preventing CSRF) but also to determine the appropriate action securely.
 * - The additional signing and encryption layers ensure that any tampering is detected and that the token's contents remain confidential.
 *
 * @param payload - An object containing:
 *   - `state`: A cryptographically secure random string used for CSRF protection.
 *   - `authority`: A string representing the user's intended action (e.g., login, password reset, profile edit).
 * @returns A promise that resolves to the encrypted JWT token, which acts as both the state parameter in the PKCE flow and the key for external secret storage.
 */
export async function createToken(payload: { state: string; authority: string, referer?: string | null }): Promise<string> {
  // 1. Generate a cryptographically secure random secret (256-bit = 32 bytes).
  const secret = crypto.getRandomValues(new Uint8Array(32));

  // 2. Create a signed JWT using HS256.
  const signedJWT = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()           // Set 'iat' claim to current time.
    .setExpirationTime("2h") // Set token expiration to 2 hours.
    .sign(secret);

  // 3. Encrypt the signed JWT.
  // Convert the signed JWT to a Uint8Array for encryption.
  const signedJWTBytes = new TextEncoder().encode(signedJWT);
  const encryptedJWT = await new CompactEncrypt(signedJWTBytes)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(secret);

  // 4. Store the secret externally in the KV store with the encrypted token as the key.
  // In production, ensure your KV store (Redis) enforces the TTL.
  await kv.set([encryptedJWT], encodeHex(secret), { 
    expireIn: TOKEN_TTL_SECONDS 
  });

  try {
    const val = await kv.get<string>([encryptedJWT]);
    console.log({
      encryptedJWT,
      val
    })
  } catch (e) {
    console.warn({
      error,
      createToken: "Create Token KV"
    })
  }

  // 5. Return the encrypted JWT token.
  return encryptedJWT;
}

/**
 * Verifies an encrypted JWT token by retrieving its corresponding secret from external storage,
 * decrypting the token, and then verifying its signature.
 *
 * @param token - The encrypted JWT token to verify.
 * @returns A promise that resolves to the verified JWT payload.
 * @throws Will throw an error if the token has expired or if the associated secret is not found.
 */
export async function verifyToken(token: string): Promise<any> {

  console.log({
    token
  })

  // 1. Retrieve the secret from the external KV store.
  const secretRes = await kv.get<string>([token]);
  if (!secretRes?.value) {
    throw new Error("Token expired or secret not found");
  }

  // 2. Decode the secret
  const secret = decodeHex(secretRes.value);

  // 3. Decrypt the token using the retrieved secret.
  const { plaintext } = await compactDecrypt(token, secret);
  const signedJWT = new TextDecoder().decode(plaintext);

  // 4. Verify the signed JWT.
  const { payload } = await jwtVerify(signedJWT, secret);
  return payload;
}