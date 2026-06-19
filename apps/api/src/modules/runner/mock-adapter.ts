import type { AgentAdapter, AdapterResult } from "./codex-adapter.js";

export class MockCodexAdapter implements AgentAdapter {
  constructor(private exitCode: number = 0, private output: string = "mock output", private delayMs: number = 100) {}

  buildCommand(params: { prompt: string; workDir: string }): AdapterResult {
    return {
      command: "node",
      args: ["-e", `setTimeout(() => { process.stdout.write(${JSON.stringify(this.output)}); process.exit(${this.exitCode}); }, ${this.delayMs})`],
      env: { HOME: process.env.HOME || "", PATH: process.env.PATH || "" },
    };
  }
}
