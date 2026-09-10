import { getState } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";

export function useProjects() {
  const { ready } = useAuth();
  return ready ? getState().projects : [];
}
