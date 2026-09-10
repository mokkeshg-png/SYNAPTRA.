import { useState, useEffect } from "react";
import { fetchProjects } from "@/lib/supabase-db";
import type { Project } from "@/types";

/**
 * Fetches all visible projects from Supabase.
 * Returns the list once loaded; returns [] while loading.
 */
export function useProjects(): Project[] {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchProjects().then((data) => {
      if (!cancelled) setProjects(data);
    });
    return () => { cancelled = true; };
  }, []);

  return projects;
}
