// oz-next-app/src/features/auth/contracts/auth-form.schema.ts
import { z } from "zod";

const MAX_IDENTIFIER_LENGTH = 320;
const MAX_MASKED_DESTINATION_LENGTH = 320;
const MIN_OTP_LENGTH = 4;
const MAX_OTP_LENGTH = 8;
const MAX_OTP_EXPIRES_IN_SECONDS = 86_400;
const MAX_OTP_ATTEMPTS = 50;
const DELETE_CONTROL_CHARACTER_CODE = 127;

const OTP_CODE_PATTERN = /^\d+$/u;

const emailAddressSchema = z.email("Enter a valid email address.");

function isUnsafeSingleLineCode(code: number): boolean {
  return code <= 31 || code === DELETE_CONTROL_CHARACTER_CODE;
}

function isSafeSingleLineText(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (isUnsafeSingleLineCode(value.charCodeAt(index))) {
      return false;
    }
  }

  return true;
}

export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(3, "Enter at least 3 characters.")
  .max(MAX_IDENTIFIER_LENGTH, "Email or mobile number is too long.")
  .refine(isSafeSingleLineText, "Unsupported characters are not allowed.")
  .superRefine((value, context) => {
    if (!value.includes("@")) {
      return;
    }

    const parsed = emailAddressSchema.safeParse(value);
    if (!parsed.success) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid email address.",
      });
    }
  });

export const loginChallengeIdSchema = z
  .string()
  .trim()
  .pipe(z.uuid("Verification challenge is invalid."));

export const otpFormCodeSchema = z
  .string()
  .trim()
  .min(MIN_OTP_LENGTH, "Enter the complete verification code.")
  .max(MAX_OTP_LENGTH, "Verification code is too long.")
  .regex(OTP_CODE_PATTERN, "Verification code must contain digits only.");

export const loginStartFormSchema = z
  .object({
    identifier: loginIdentifierSchema,
  })
  .strict();

export const otpVerifyFormSchema = z
  .object({
    code: otpFormCodeSchema,
  })
  .strict();

const loginDestinationSchema = z
  .object({
    kind: z.enum(["EMAIL", "PHONE"]),
    value_masked: z
      .string()
      .trim()
      .min(1)
      .max(MAX_MASKED_DESTINATION_LENGTH)
      .refine(isSafeSingleLineText),
    channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]).optional(),
  })
  .strict()
  .readonly();

export const loginStartResponseSchema = z
  .object({
    challenge_id: loginChallengeIdSchema,
    expires_in: z.number().int().min(1).max(MAX_OTP_EXPIRES_IN_SECONDS),
    length: z.number().int().min(MIN_OTP_LENGTH).max(MAX_OTP_LENGTH),
    max_attempts: z.number().int().min(1).max(MAX_OTP_ATTEMPTS),
    attempts_remaining: z.number().int().min(0).max(MAX_OTP_ATTEMPTS),
    destination: loginDestinationSchema.optional(),
  })
  .strict()
  .readonly();

export type LoginStartFormValues = z.infer<typeof loginStartFormSchema>;
export type OtpVerifyFormValues = z.infer<typeof otpVerifyFormSchema>;
export type LoginStartResult = z.infer<typeof loginStartResponseSchema>;
