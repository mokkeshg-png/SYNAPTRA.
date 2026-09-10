export interface GithubPublicProfile {
  login: string;
  name: string | null;
  html_url: string;
  public_repos: number;
  bio: string | null;
  avatar_url: string;
}

export async function fetchGithubPublic(username: string): Promise<GithubPublicProfile> {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
  if (res.status === 404) throw new Error("GitHub user not found.");
  if (!res.ok) throw new Error("GitHub is temporarily unavailable. Try again later.");
  return res.json();
}

export function githubOauthConfigured() {
  return Boolean(import.meta.env.VITE_GITHUB_CLIENT_ID);
}

export function githubOauthUrl() {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) return null;
  const redirect = `${window.location.origin}/settings`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    scope: "read:user",
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
