import { z } from "zod";
import { dataEnvelope } from "../http";
import { tenancyModeSchema } from "./me";

/** Server settings the web app needs before sign-in. Never put secrets here: it is public. */
export const publicConfigSchema = z.object({
  tenancyMode: tenancyModeSchema,
  allowSignup: z.boolean(),
});

export type PublicConfig = z.infer<typeof publicConfigSchema>;

export const publicConfigResponseSchema = dataEnvelope(publicConfigSchema);
