import { z } from "zod";

export const doctorSchema = z.object({
  name: z.string().min(2, "Name is required").max(255),
  specialization: z.string().min(1, "Specialization is required").max(255),
  contact_number: z.string().max(20).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  qualifications: z.string().max(500).optional(),
  experience: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  consultation_fee: z
    .number({ error: "Fee must be a number" })
    .min(0, "Fee must be 0 or greater"),
  effective_from: z.string().optional(),
  // Login account creation
  create_login: z.boolean().optional(),
  login_email: z.string().email("Invalid login email").optional().or(z.literal("")),
  login_password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.create_login) {
      return !!data.login_email && !!data.login_password;
    }
    return true;
  },
  { message: "Login email and password are required when creating a login account", path: ["login_email"] }
);

export type DoctorFormValues = z.infer<typeof doctorSchema>;

export const doctorFeeSchema = z.object({
  consultation_fee: z
    .number({ error: "Fee must be a number" })
    .min(0, "Fee must be 0 or greater"),
  effective_from: z.string().min(1, "Effective date is required"),
});

export type DoctorFeeFormValues = z.infer<typeof doctorFeeSchema>;
