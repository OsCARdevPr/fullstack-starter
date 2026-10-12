import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldValues, type UseFormProps, useForm } from "react-hook-form";
import type { z } from "zod";

/**
 * `useForm` validated by a Zod schema (usually a contract schema shared with the API).
 * Fields hold the schema input; submit handlers receive the output (trimmed, defaulted values).
 *
 * @example const form = useZodForm(createProjectSchema, { defaultValues: { name: "" } });
 */
export function useZodForm<TInput extends FieldValues, TOutput extends FieldValues>(
  schema: z.ZodType<TOutput, TInput>,
  options?: Omit<UseFormProps<TInput, unknown, TOutput>, "resolver">,
) {
  return useForm<TInput, unknown, TOutput>({ ...options, resolver: zodResolver(schema) });
}
