import { z } from 'zod';
import { MIN_NAME_LENGTH, MIN_PASSWORD_LENGTH } from '@/config/constants';

const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;

export const nameSchema = z
  .string()
  .trim()
  .min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters`)
  .max(60, 'Name is too long')
  .regex(NAME_REGEX, "Only letters, spaces, and . - ' allowed");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  )
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const otpSchema = z.string().regex(/^\d{4}$/, 'OTP must be 4 digits');

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const phoneFormSchema = z.object({
  phone: phoneSchema,
});

export type PhoneFormData = z.infer<typeof phoneFormSchema>;

export const otpFormSchema = z.object({
  otp: otpSchema,
});

export type OtpFormData = z.infer<typeof otpFormSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
