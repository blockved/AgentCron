const PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9\-_]{10,}/g,
  /sk-[a-zA-Z0-9]{10,}/g,
  /ghp_[a-zA-Z0-9]{36,}/g,
  /gho_[a-zA-Z0-9]{36,}/g,
  /github_pat_[a-zA-Z0-9_]{22,}/g,
  /key-[a-zA-Z0-9]{10,}/g,
  /Bearer\s+\S+/g,
  /\bDsn\s*=\s*"[^"\r\n]+"/gi,
  /\bDsn\s*=\s*\\?"[^"\r\n]+\\?"/gi,
  /\b(mysql|mariadb):\/\/[^:\s/@]+:[^@\s]+@/gi,
  /\b([A-Za-z0-9_.%-]+):([^@\s]+)@((?:tcp|unix)?\([^)\r\n]+\))/g,
];

export function sanitize(input: string): string {
  let result = input;
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, (match) => {
      const lowerMatch = match.toLowerCase();
      if (match.startsWith("Bearer ")) return "Bearer [REDACTED]";
      if (lowerMatch.startsWith("dsn")) {
        return match.includes('\\"') ? 'Dsn = \\"[REDACTED]\\"' : 'Dsn = "[REDACTED]"';
      }
      if (lowerMatch.startsWith("mysql://") || lowerMatch.startsWith("mariadb://")) {
        return match.replace(/:\/\/([^:\s/@]+):[^@\s]+@/i, "://$1:[REDACTED]@");
      }
      if (match.includes("@")) return match.replace(/^([^:\s]+):([^@\s]+)@/, "$1:[REDACTED]@");
      return "[REDACTED]";
    });
  }
  return result;
}
