// generate-stats.js
// Fetches live GitHub stats and renders a self-hosted animated SVG card.
// No third-party stats service involved — runs entirely in your own GitHub Action.

const fs = require("fs");

const USERNAME = process.env.GH_USERNAME;
const TOKEN = process.env.GH_TOKEN;

if (!USERNAME || !TOKEN) {
  console.error("Missing GH_USERNAME or GH_TOKEN env vars");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": USERNAME,
};

async function getJSON(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function main() {
  // Basic profile info (followers, public repo count)
  const user = await getJSON(`https://api.github.com/users/${USERNAME}`);

  // Pull all public repos (paginated) to sum stars + count languages
  let repos = [];
  let page = 1;
  while (true) {
    const batch = await getJSON(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}`
    );
    repos = repos.concat(batch);
    if (batch.length < 100) break;
    page++;
  }

  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const totalForks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);
  const publicRepos = user.public_repos;
  const followers = user.followers;

  const stats = { publicRepos, followers, totalStars, totalForks };
  fs.writeFileSync("dist/stats-data.json", JSON.stringify(stats, null, 2));

  fs.writeFileSync("dist/animated-stats.svg", renderStatsCard(USERNAME, stats));
  fs.writeFileSync("dist/animated-trophies.svg", renderTrophyCard(stats));

  console.log("Generated animated-stats.svg and animated-trophies.svg", stats);
}

function renderStatsCard(username, s) {
  const items = [
    { label: "Public Repos", value: s.publicRepos, color: "#A970FF" },
    { label: "Followers", value: s.followers, color: "#FF6FA5" },
    { label: "Total Stars", value: s.totalStars, color: "#FFD166" },
    { label: "Total Forks", value: s.totalForks, color: "#6FCF97" },
  ];

  const cardW = 500;
  const cardH = 200;
  const colW = cardW / items.length;

  const cols = items
    .map((item, i) => {
      const cx = colW * i + colW / 2;
      const delay = i * 0.15;
      return `
      <g transform="translate(${cx}, 90)">
        <circle r="0" fill="none" stroke="${item.color}" stroke-width="3" opacity="0.35">
          <animate attributeName="r" from="0" to="46" dur="1s" begin="${delay}s" fill="freeze" />
          <animate attributeName="opacity" from="0" to="0.35" dur="0.6s" begin="${delay}s" fill="freeze" />
        </circle>
        <text text-anchor="middle" y="8" font-size="30" font-weight="700" fill="${item.color}" font-family="Segoe UI, sans-serif" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="${delay + 0.3}s" fill="freeze" />
          <animate attributeName="y" from="24" to="8" dur="0.6s" begin="${delay + 0.3}s" fill="freeze" />
          ${item.value}
        </text>
        <text text-anchor="middle" y="38" font-size="12" fill="#c9c9c9" font-family="Segoe UI, sans-serif" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="${delay + 0.45}s" fill="freeze" />
          ${item.label}
        </text>
      </g>`;
    })
    .join("\n");

  return `<svg width="${cardW}" height="${cardH}" viewBox="0 0 ${cardW} ${cardH}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0.5" y="0.5" width="${cardW - 1}" height="${cardH - 1}" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="24" y="34" font-size="16" font-weight="700" fill="#ffffff" font-family="Segoe UI, sans-serif">
    ⚡ ${username}'s Live GitHub Stats
  </text>
  <line x1="24" y1="46" x2="${cardW - 24}" y2="46" stroke="#30363d" stroke-width="1"/>
  ${cols}
</svg>`;
}

function renderTrophyCard(s) {
  const trophies = [
    { icon: "🏅", label: "Repo Builder", earned: s.publicRepos >= 5 },
    { icon: "⭐", label: "Star Collector", earned: s.totalStars >= 5 },
    { icon: "🤝", label: "Community", earned: s.followers >= 5 },
    { icon: "🍴", label: "Forked Often", earned: s.totalForks >= 1 },
  ];

  const cardW = 520;
  const cardH = 150;
  const boxW = cardW / trophies.length;

  const items = trophies
    .map((t, i) => {
      const cx = boxW * i + boxW / 2;
      const delay = i * 0.2;
      const glow = t.earned ? "#FFD166" : "#3a3f4b";
      const opacity = t.earned ? 1 : 0.35;
      return `
      <g transform="translate(${cx}, 75)" opacity="0">
        <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="${delay}s" fill="freeze" />
        <circle r="38" fill="none" stroke="${glow}" stroke-width="2">
          ${t.earned ? `<animate attributeName="stroke-width" values="2;4;2" dur="2s" begin="${delay}s" repeatCount="indefinite" />` : ""}
        </circle>
        <text text-anchor="middle" y="10" font-size="30" opacity="${opacity}">${t.icon}</text>
        <text text-anchor="middle" y="58" font-size="11" fill="#c9c9c9" font-family="Segoe UI, sans-serif">${t.label}</text>
      </g>`;
    })
    .join("\n");

  return `<svg width="${cardW}" height="${cardH}" viewBox="0 0 ${cardW} ${cardH}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0.5" y="0.5" width="${cardW - 1}" height="${cardH - 1}" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="24" y="30" font-size="16" font-weight="700" fill="#ffffff" font-family="Segoe UI, sans-serif">🏆 Trophy Case</text>
  ${items}
</svg>`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
