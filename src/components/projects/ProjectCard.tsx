import { Link } from "react-router-dom";
import type { Profile, Project } from "@/types";
import { Badge, Card, Progress } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { deadlineCountdown } from "@/lib/utils";
import { projectMatchBreakdown } from "@/lib/matching";

export function ProjectCard({
  project,
  viewer,
  match,
}: {
  project: Project;
  viewer?: Profile | null;
  match?: number;
}) {
  const score = match ?? (viewer ? projectMatchBreakdown(viewer, project).score : undefined);
  const fill = Math.min(100, Math.round((0 / project.teamMax) * 100));
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-brass">{project.domains[0]}</p>
          <h3 className="mt-1 font-serif text-xl text-ink">
            <Link to={`/projects/${project.id}`} className="hover:underline">
              {project.title}
            </Link>
          </h3>
        </div>
        {typeof score === "number" ? <Badge tone="navy">{score}% match</Badge> : null}
      </div>
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-ink-500">{project.shortDescription}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.requiredSkills.slice(0, 4).map((s) => (
          <Badge key={s} tone="slate">
            {s}
          </Badge>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-500">
        <span>{project.difficulty}</span>
        <span className="text-right">{deadlineCountdown(project.deadline)}</span>
        <span>{project.roles.map((r) => r.name).slice(0, 2).join(", ")}</span>
        <span className="text-right">
          Team {project.teamMin}–{project.teamMax}
        </span>
      </div>
      <Progress value={fill} />
      <div className="mt-4 flex gap-2">
        <Link to={`/projects/${project.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            View details
          </Button>
        </Link>
        <Link to={`/projects/${project.id}?apply=1`} className="flex-1">
          <Button className="w-full">Apply</Button>
        </Link>
      </div>
    </Card>
  );
}

export function PersonCard({ profile, score, reason }: { profile: Profile; score?: number; reason?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-ink">
            <Link to={`/profile/${profile.userId}`} className="hover:underline">
              {profile.fullName}
            </Link>
          </h3>
          <p className="text-sm text-ink-500">
            {profile.designation ? `${profile.designation} · ` : ""}
            {profile.department}
          </p>
          <p className="text-xs text-ink-400">{profile.institution}</p>
        </div>
        {typeof score === "number" ? <Badge>{score}% match</Badge> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.skills.slice(0, 4).map((s) => (
          <Badge key={s.skill} tone="slate">
            {s.skill}
          </Badge>
        ))}
      </div>
      {reason ? <p className="mt-3 text-sm text-ink-500">{reason}</p> : null}
      <Link to={`/profile/${profile.userId}`} className="mt-4 inline-block">
        <Button variant="outline" size="sm">
          View profile
        </Button>
      </Link>
    </Card>
  );
}
