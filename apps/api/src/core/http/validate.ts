import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";
import { validationFailed } from "../errors";

/**
 * `zValidator` with the app's failure contract: invalid input throws a VALIDATION_ERROR whose
 * details are `z.flattenError` output. Input and output types still flow to `c.req.valid()` and
 * to the RPC client.
 */
export function validate<T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) throw validationFailed(z.flattenError(result.error));
  });
}
