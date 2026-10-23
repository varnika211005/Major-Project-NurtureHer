import { z } from "zod";

function blankToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  if (typeof value === "string") {
    if (value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

export const pcosSchema = z.object({
  age: z.preprocess(
    blankToUndefined,
    z.number({ required_error: "Age is required.", invalid_type_error: "Age is required." })
      .min(10, "Age must be at least 10.")
      .max(60, "Age must be 60 or below."),
  ),
  bmi: z.preprocess(
    blankToUndefined,
    z.number({ required_error: "BMI is required.", invalid_type_error: "BMI is required." })
      .positive("BMI must be greater than 0.")
      .max(80, "BMI must be 80 or below."),
  ),
  cycle: z.preprocess(
    blankToUndefined,
    z.custom<2 | 4>(
      (value): value is 2 | 4 => value === 2 || value === 4,
      "Please select a cycle category.",
    ),
  ),
  cycleLength: z.preprocess(
    blankToUndefined,
    z.number({ required_error: "Cycle length is required.", invalid_type_error: "Cycle length is required." })
      .min(1, "Cycle length must be at least 1 day.")
      .max(100, "Cycle length must be 100 days or below."),
  ),
  weightGain: z.boolean().default(false),
  hairGrowth: z.boolean().default(false),
  skinDarkening: z.boolean().default(false),
  hairLoss: z.boolean().default(false),
  pimples: z.boolean().default(false),
});

export type PCOSForm = z.infer<typeof pcosSchema>;

export const pcosBlankDefaults = {
  age: undefined as unknown as number,
  bmi: undefined as unknown as number,
  cycle: undefined as unknown as 2 | 4,
  cycleLength: undefined as unknown as number,
  weightGain: false,
  hairGrowth: false,
  skinDarkening: false,
  hairLoss: false,
  pimples: false,
};
