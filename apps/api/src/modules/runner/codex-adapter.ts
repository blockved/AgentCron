export interface AdapterResult {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface AgentAdapter {
  buildCommand(params: {
    prompt: string;
    workDir: string;
    sessionId?: string;
    environment: Record<string, string>;
    permissionPolicy: Record<string, unknown>;
  }): AdapterResult;
}

export class CodexAdapter implements AgentAdapter {
  buildCommand(params: {
    prompt: string;
    workDir: string;
    sessionId?: string;
    environment: Record<string, string>;
    permissionPolicy: Record<string, unknown>;
  }): AdapterResult {
    const args = [
      "--dangerously-bypass-approvals-and-sandbox",
      "exec",
      "--json",
      "--skip-git-repo-check",
      "--cd",
      params.workDir,
    ];
    args.push(params.prompt);

    return {
      command: "codex",
      args,
      env: { ...params.environment, HOME: process.env.HOME || "", PATH: process.env.PATH || "" },
    };
  }
}
