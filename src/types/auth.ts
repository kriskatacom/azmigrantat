export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  gender?: Gender | null;
  phone?: string | null;
  phone_verified?: boolean;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  profile_image?: string | null;
  avatar?: string | null;
  public_code?: string | null;
  username?: string | null;
}

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  gender: Gender | null;
  phone: string;
  country: string;
  city: string;
  address: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

export interface DeleteChatMessagesPayload {
  currentPassword: string;
  confirmation: "delete chat";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
  passwordConfirmation: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string | null;
  expiresIn: number;
  user: AuthUser;
}
