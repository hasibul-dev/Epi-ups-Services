import { z } from "zod";
import { DEPT_ORDER, ROLE_ORDER } from "@/lib/constants";

export const userSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(40).regex(/^[a-zA-Z0-9._-]+$/, "Username may contain letters, numbers, dot, dash and underscore"),
  email: z.string().trim().email("Valid email is required"),
  name: z.string().trim().min(2, "Full name is required"),
  phone: z.string().trim().max(40).optional().nullable(),
  role: z.enum(ROLE_ORDER as [string, ...string[]]),
  department: z.enum(DEPT_ORDER as [string, ...string[]]),
  active: z.boolean().default(true),
});
