import { apiRequest } from '@/services/apiClient';

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  roleId: number;
  branchId: number;
  status: string;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
  refreshTokenExpiresAt: string;
  user: AuthUser;
};

type LoginResponse = {
  data: LoginSession;
};

export function login(credentials: LoginCredentials) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}
