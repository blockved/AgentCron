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
    const args = ["--quiet", "--prompt", params.prompt];
    if (params.permissionPolicy?.autoApprove) {
      args.push("--auto-approve");
    }
    return {
      command: "codex",
      args,
      env: { ...params.environment, HOME: process.env.HOME || "", PATH: process.env.PATH || "" },
    };
  }
}
