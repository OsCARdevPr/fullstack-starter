import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type SignInValues = z.output<typeof signInSchema>;

// Mirrors the server rules in apps/api/src/lib/auth.ts (minPasswordLength: 12, max 128).
export const PASSWORD_MIN_LENGTH = 12;

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(128, "Use at most 128 characters."),
});

export type SignUpValues = z.output<typeof signUpSchema>;

/** `?redirect=` after sign-in; only paths inside this app are honored. */
export const signInSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

/** Keeps `?redirect=` inside the app so it cannot send users to another site. */
export function safeRedirectPath(value: string | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
