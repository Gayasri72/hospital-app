import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().min(2, "Name is required").max(255),
  nic: z.string().min(5, "NIC is required").max(50),
  phone: z.string().min(7, "Phone number is required").max(20),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.string().optional(),
  age: z.number({ error: "Age must be a number" }).int().positive().optional(),
  address: z.string().max(500).optional(),
  emergency_contact: z.string().max(20).optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;
