import { useAuth } from "@/context/AuthContext";
import { currentProfile } from "@/lib/store";

export function useProfile() {
  const { profile, user } = useAuth();
  return { profile: profile ?? (user ? currentProfile() : null), user };
}
