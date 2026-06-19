import bcrypt from "bcrypt";
import type { PrismaClient } from "@prisma/client";
import type { JwtPayload } from "@agentcron/shared";

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async validateCredentials(
    username: string,
    password: string
  ): Promise<JwtPayload | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return {
      userId: user.id,
      username: user.username,
      role: user.role as JwtPayload["role"],
    };
  }

  async getUserById(userId: bigint) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, createdAt: true },
    });
  }
}
