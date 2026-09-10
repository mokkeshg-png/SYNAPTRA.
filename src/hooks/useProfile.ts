import { useAuth } from "@/context/AuthContext";

export function useProfile() {
  const { profile, user } = useAuth();
  return { profile, user };
}
