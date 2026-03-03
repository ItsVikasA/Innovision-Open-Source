import { NextResponse } from "next/server";

const OWNER = "ItsVikasA";
const REPO = "Innovision-Open-Source";
const GITHUB_API = "https://api.github.com";

// Cache for 5 minutes to avoid rate-limiting
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000;

async function githubFetch(url) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Innovision-Open-Source",
  };

  // Use token if available to increase rate limit
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers, next: { revalidate: 300 } });

  if (!res.ok) {
    throw new Error(`GitHub API responded with ${res.status}`);
  }

  return res.json();
}

async function fetchAllContributors() {
  const contributors = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const data = await githubFetch(
      `${GITHUB_API}/repos/${OWNER}/${REPO}/contributors?per_page=${perPage}&page=${page}`
    );

    if (!data.length) break;
    contributors.push(...data);

    if (data.length < perPage) break;
    page++;
  }

  return contributors;
}

export async function GET() {
  try {
    const now = Date.now();

    if (cache.data && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const [repoData, contributors, pullRequests] = await Promise.all([
      githubFetch(`${GITHUB_API}/repos/${OWNER}/${REPO}`),
      fetchAllContributors(),
      githubFetch(
        `${GITHUB_API}/search/issues?q=repo:${OWNER}/${REPO}+type:pr+state:open&per_page=1`
      ),
    ]);

    const result = {
      repo: {
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        openPRs: pullRequests.total_count,
        description: repoData.description,
        language: repoData.language,
      },
      contributors: contributors.map((c) => ({
        id: c.id,
        login: c.login,
        avatarUrl: c.avatar_url,
        profileUrl: c.html_url,
        contributions: c.contributions,
      })),
      totalContributors: contributors.length,
    };

    cache = { data: result, timestamp: now };

    return NextResponse.json(result);
  } catch (error) {
    console.error("GitHub API error:", error);

    // Return cached data if available, even if stale
    if (cache.data) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json(
      { error: "Failed to fetch contributor data" },
      { status: 500 }
    );
  }
}
