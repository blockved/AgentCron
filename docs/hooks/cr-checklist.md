# CR 检查清单

> 在 `/openharness:review` 与 `/openharness:verify` 阶段使用。每条都必须给出"通过 / 不通过 / 不适用"判定，"不通过"必须落 finding。

## 1. 代码规范

- [ ] 代码与项目既有风格一致（命名 / 缩进 / 包结构）
- [ ] 无注释掉的代码、无调试用的临时打印
- [ ] 公共方法有 javadoc / docstring，复杂逻辑有内联注释
- [ ] 异常处理符合 `infrastructure/logging.md` 的约定

## 2. Invariants

- [ ] 业务规则未破坏 `harness/invariants/biz.md` 中的状态机与不变量
- [ ] 金额相关代码遵守 `harness/invariants/amt.md`（如适用）
- [ ] 交易/事务代码遵守 `harness/invariants/txn.md`（如适用）

## 3. 架构约束

- [ ] 依赖方向符合 `harness/architecture/index.md` 的分层规则
- [ ] 没有引入新的循环依赖
- [ ] 第三方 SDK 已在适配层封装，未直接耦合业务代码

## 4. 基础设施规范

- [ ] API 改动遵守 `harness/infrastructure/api.md`（统一响应、错误码、幂等）
- [ ] 数据库改动遵守 `harness/infrastructure/database.md`（必备字段、命名、索引、软删除）
- [ ] 缓存改动遵守 `harness/infrastructure/cache.md`（Key 集中定义、TTL、序列化）
- [ ] MQ 改动遵守 `harness/infrastructure/mq.md`（Topic 枚举、生产/消费幂等）
- [ ] 安全改动遵守 `harness/infrastructure/security.md`（KMS、脱敏、配置）
- [ ] 日志改动遵守 `harness/infrastructure/logging.md`（kv 格式、traceId、异常 stacktrace）

## 5. Tasks 与 Verification

- [ ] `tasks.md` 中本批次涉及的 task 已勾选 checkpoint
- [ ] `verification.md` 中已记录对应证据（命令、输出、链接）
- [ ] 已有 finding 已对账：要么修复并标记 resolved，要么显式延期并备注原因

## 6. 安全与合规

- [ ] 没有硬编码密码 / 密钥 / AccessKey
- [ ] PII 字段在日志、监控、消息体中均已脱敏
- [ ] 输入校验完整（@Valid / 枚举校验 / 长度限制）
- [ ] 没有 SQL 注入、命令注入、SSRF 风险

## 7. 测试

- [ ] 新增/修改的逻辑有对应的单元测试或集成测试
- [ ] 边界条件、异常路径已覆盖
- [ ] 关键流程跑通了端到端验证（命令或截图记录在 verification.md）
