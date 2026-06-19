const PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9\-_]{10,}/g,
  /sk-[a-zA-Z0-9]{10,}/g,
  /ghp_[a-zA-Z0-9]{36,}/g,
  /gho_[a-zA-Z0-9]{36,}/g,
  /github_pat_[a-zA-Z0-9_]{22,}/g,
  /key-[a-zA-Z0-9]{10,}/g,
  /Bearer\s+\S+/g,
];

export function sanitize(input: string): string {
  let result = input;
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, (match) =>
      match.startsWith("Bearer ") ? "Bearer [REDACTED]" : "[REDACTED]"
    );
  }
  return result;
}
