import { readdir, copyFile, stat, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { log } from "../../logger.js";

export class ArtifactStore {
  constructor(private prisma: PrismaClient, private dataDir: string) {}

  async collect(runId: bigint) {
    const workDir = join(this.dataDir, "workspaces", runId.toString());
    const artifactDir = join(this.dataDir, "artifacts", runId.toString());
    try { await stat(workDir); } catch { return; }
    await mkdir(artifactDir, { recursive: true });

    const patterns = [".diff", ".patch", ".log", ".md", ".txt"];
    const files = await this.findFiles(workDir, patterns);
    for (const file of files) {
      const name = file.replace(workDir + "/", "");
      const dest = join(artifactDir, name);
      await mkdir(join(dest, ".."), { recursive: true });
      await copyFile(file, dest);
      await this.prisma.taskRunArtifact.create({ data: { runId, artifactType: "file", name, storagePath: dest } });
    }
    if (files.length > 0) log("info", "artifact-store", "collected artifacts", { runId: runId.toString(), count: files.length });
  }

  private async findFiles(dir: string, patterns: string[]): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) results.push(...(await this.findFiles(full, patterns)));
        else if (patterns.some((p) => entry.name.endsWith(p))) results.push(full);
      }
    } catch {}
    return results;
  }
}
