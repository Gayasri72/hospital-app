import { z } from "zod";

export const sessionSchema = z.object({
  doctor_id: z.string().min(1, "Doctor is required"),
  branch_id: z.string().min(1, "Branch is required"),
  session_date: z.string().min(1, "Session date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  max_patients: z
    .number({ error: "Max patients must be a number" })
    .int()
    .positive("Must be greater than 0")
    .max(100, "Cannot exceed 100 patients"),
  slot_duration: z.number().int().positive().optional(),
});

export type SessionFormValues = z.infer<typeof sessionSchema>;
