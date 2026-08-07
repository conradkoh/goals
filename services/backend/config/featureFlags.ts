import type { SignupMethod } from './signupMethods';

export const featureFlags = {
  disableLogin: false,
  /** null or [] = signups disabled. Default ['self'] preserves current open self-signup. */
  allowedSignupMethods: ['self'] as SignupMethod[] | null,
};
