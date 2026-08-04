export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
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

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
