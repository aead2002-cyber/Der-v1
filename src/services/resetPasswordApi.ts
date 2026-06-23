import { apiRequest } from './apiClient';

interface GenericResetResponse {
  success?: boolean;
  error?: string;
}

interface VerifyResetTokenResponse {
  success?: boolean;
  email?: string;
  error?: string;
}

export const resetPasswordApi = {
  forgotPassword: async (email: string): Promise<void> => {
    const response = await apiRequest<GenericResetResponse>('/api/auth/forgot-password', {
      method: 'POST',
      auth: false,
      body: { email },
    });

    if (response.success === false) {
      throw new Error(response.error || 'Password reset request failed');
    }
  },

  verifyResetToken: async (token: string): Promise<{ success: boolean; email?: string }> => {
    const response = await apiRequest<VerifyResetTokenResponse>('/api/auth/verify-reset-token', {
      method: 'POST',
      auth: false,
      body: { token },
    });

    if (response.success) {
      return { success: true, email: response.email };
    }

    return {
      success: false,
    };
  },

  completePasswordReset: async (token: string, newPassword: string): Promise<void> => {
    const response = await apiRequest<GenericResetResponse>('/api/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: { token, newPassword },
    });

    if (response.success === false) {
      throw new Error(response.error || 'Password reset failed');
    }
  },
};
