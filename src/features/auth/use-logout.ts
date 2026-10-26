import { useAuth } from './auth-context';

export function useLogout(): () => Promise<void> {
  return useAuth().logOut;
}
