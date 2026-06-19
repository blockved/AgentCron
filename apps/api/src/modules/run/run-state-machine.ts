import type { PrismaClient } from "@prisma/client";
import { canTransition, isTerminal } from "@agentcron/shared";

export interface TransitionContext {
  resultSummary?: string;
  errorMessage?: string;
  riskLevel?: string;
  needsReview?: boolean;
}

export class RunStateMachine {
  constructor(private prisma: PrismaClient) {}

  async transition(
    runId: bigint,
    targetStatus: string,
    context: TransitionContext
  ) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.run.findUnique({ where: { id: runId } });
      if (!run) throw new Error(`Run ${runId} not found`);

      if (!canTransition(run.status, targetStatus)) {
        throw new Error(
          `Invalid transition: ${run.status} → ${targetStatus} for run ${runId}`
        );
      }

      const now = new Date();
      const updateData: Record<string, unknown> = {
        status: targetStatus,
      };

      if (targetStatus === "RUNNING") {
        updateData.startedAt = now;
      }

      if (isTerminal(targetStatus)) {
        updateData.finishedAt = now;
        if (run.startedAt) {
          updateData.duration = Math.floor(
            (now.getTime() - run.startedAt.getTime()) / 1000
          );
        }
      }

      if (context.resultSummary !== undefined) {
        updateData.resultSummary = context.resultSummary;
      }
      if (context.errorMessage !== undefined) {
        updateData.errorMessage = context.errorMessage;
      }
      if (context.riskLevel !== undefined) {
        updateData.riskLevel = context.riskLevel;
      }
      if (context.needsReview !== undefined) {
        updateData.needsReview = context.needsReview;
      }

      const updated = await tx.run.update({
        where: { id: runId },
        data: updateData,
      });

      await tx.taskRunLog.create({
        data: {
          runId,
          logType: "system",
          content: `State transition: ${run.status} → ${targetStatus}`,
          metadata: context as any,
        },
      });

      return updated;
    });
  }
}
