/**
 * FinWise never collects UPI PINs, OTPs, banking passwords or card credentials.
 * This guard blocks free-text fields (notes, assistant messages) that look like they contain one.
 * Mentioning these words is fine ("someone asked for my OTP") — sharing a value is not.
 */

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

const SECRET_WITH_VALUE =
  /\b(otp|one[\s-]?time[\s-]?(?:password|code)|upi[\s-]?pin|m-?pin|atm[\s-]?pin|pin|cvv|cvc)\b[^\d\n]{0,20}\d{3,8}\b/i;
const PASSWORD_WITH_VALUE = /\b(password|passcode|net[\s-]?banking\s+(?:password|login))\s*(?:is|:|=|-)\s*\S{4,}/i;
const CARD_CANDIDATE = /\b(?:\d[ -]?){13,19}\b/g;

export interface SensitiveCheck {
  flagged: boolean;
  reason?: "secret_code" | "password" | "card_number";
}

export function checkSensitive(text: string): SensitiveCheck {
  if (!text) return { flagged: false };
  if (SECRET_WITH_VALUE.test(text)) return { flagged: true, reason: "secret_code" };
  if (PASSWORD_WITH_VALUE.test(text)) return { flagged: true, reason: "password" };
  for (const match of text.match(CARD_CANDIDATE) ?? []) {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) {
      return { flagged: true, reason: "card_number" };
    }
  }
  return { flagged: false };
}

export const SENSITIVE_MESSAGE =
  "That looks like a PIN, OTP, password or card number. FinWise never needs these — please remove it. Never share them with anyone, including people claiming to be from a bank.";
