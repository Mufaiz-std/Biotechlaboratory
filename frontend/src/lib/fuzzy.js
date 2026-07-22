function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function fuzzyMatch(query, text) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const t = (text || "").toLowerCase();
  if (t.includes(q)) return true;
  const words = t.split(/\s+/);
  if (words.some((w) => w.startsWith(q) || q.startsWith(w))) return true;
  if (q.length >= 3 && t.length >= 3) {
    const dist = levenshtein(q, t.slice(0, Math.min(t.length, q.length + 3)));
    return dist <= 2;
  }
  return false;
}
