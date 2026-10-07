/**
 * Validates player nickname according to US-001 / AUTH-01.
 * Rules:
 * - 3–20 characters
 * - Alphanumeric only (a-z, A-Z, 0-9)
 */
export function validateNickname(nickname) {
  if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
    return { valid: false, error: 'Please enter a nickname' };
  }
  const trimmed = nickname.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Nickname must be at least 3 characters' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Nickname must be 20 characters or fewer' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { valid: false, error: 'Nickname must contain letters and numbers only (no spaces or special characters)' };
  }
  return { valid: true, error: null, value: trimmed };
}
