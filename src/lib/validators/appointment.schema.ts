import { z } from "zod";

export const createAppointmentSchema = z.object({
  session_id: z.string().min(1, "Session is required"),
  patient_id: z.string().min(1, "Patient is required"),
  notes: z.string().max(500).optional(),
});

export type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>;

export const paymentTransactionSchema = z.object({
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than 0"),
  method: z.enum(["cash", "card", "online", "insurance"], { message: "Select payment method" }),
  reference: z.string().max(100).optional(),
  note: z.string().max(255).optional(),
});

export type PaymentTransactionFormValues = z.infer<typeof paymentTransactionSchema>;
