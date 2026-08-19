import { z } from "zod";
import { ROLE_ENUM, SEX_ENUM, USER_TYPE_ENUM } from "../types/formInput";
import { ADMIN_ROLES } from "../lib/admin-roles";

// User registration schema - single source of truth
// For input validation
export const userRegistrationSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    sex: z.enum(SEX_ENUM, "Please select a valid option"),
    dob: z.string(),
    phoneNumber: z.string(),
    role: z.enum(ROLE_ENUM),
    userType: z.enum(USER_TYPE_ENUM),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const userRegistrationSchemaWithId = userRegistrationSchema.extend({
  userId: z.string().optional(),
});
export type TUserProfileRegistrationInput = z.infer<
  typeof userRegistrationSchemaWithId
>;

// Will be used by expo
// User profile creation schema (for backend)
export const createProfileSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.email(),
  sex: z.enum(["male", "female", "other"]).optional(),
  date_of_birth: z.date().optional(),
});

export type CreateProfile = z.infer<typeof createProfileSchema>;

export const userLoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type UserLoginSchema = z.infer<typeof userLoginSchema>;

export const adminInviteSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum(ADMIN_ROLES),
  token: z.string(),
  expires_at: z.date(),
});
export type TAdminInviteSchema = z.infer<typeof adminInviteSchema>;

export const adminInviteInputSchema = z.object({
  role: z.enum(ADMIN_ROLES),
  email: z.email(),
});
export type TAdminInviteInputSchema = z.infer<typeof adminInviteInputSchema>;
//The above are for Form input validations

//The below are actual types
export type TUserProfile = {
  user_id: string;
  created_at: Date | string;
  updated_at: Date | string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  sex: "male" | "female" | "other";
  dob: string;
  user_type: "customer" | "business_provider" | "both";
  role: "user" | (typeof ADMIN_ROLES)[number];
  status: "active" | "pending" | "inactive" | "suspended";
  phone_number: string;
  image: string;
  email_verified: boolean;
};

export type TUserProfileWithUser = {
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  name: string;
  email: string;
  sex: "male" | "female" | "other";
  dob: string;
  userType: "customer" | "business_provider" | "both";
  role: "user" | (typeof ADMIN_ROLES)[number];
  status: "active" | "pending" | "inactive" | "suspended";
  phoneNumber: string;
};
