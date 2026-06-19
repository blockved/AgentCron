# Harness 约束总入口

> Open Harness V2 | 服务：AgentCron | 模式：greenfield
> 更新时间：2026-06-18

## 定位

`docs/harness/` 是本服务的**约束层**：所有 Agent 在 propose / apply / review / verify 时必须遵守的硬性规则。叶子文件按需加载，不需通读。

## 全局约束摘要

1. **BIZ-001 业务规则**：核心状态流转必须满足业务不变量；状态机变更必须先更新 invariants 文档再改代码（业务域确认后细化）
2. **API-001 幂等**：所有写接口必须支持幂等，统一通过业务唯一 ID + 服务端去重实现
3. **SEC-001 数据安全**：PII 与敏感业务字段必须 KMS 加密存储，日志必须脱敏，禁止硬编码密钥
4. **DB-001 数据访问**：禁止 `SELECT *`、禁止外键、禁止物理删除业务数据，金额禁用 float/double
5. **LOG-001 可观测**：业务日志使用 kv 格式，traceId 必须贯穿入口到出口的完整链路

## 全部叶子文件索引

| 文件/目录 | 定位 | 加载时机 |
|---------|------|--------|
| `invariants/biz.md` | 业务规则与状态机不变量 | 涉及业务流程、状态变更、领域规则时 |
| `invariants/amt.md` | 金额计算与精度规则 | 涉及金额、计费、对账时（业务域为信贷/支付/电商时必读） |
| `invariants/txn.md` | 交易与事务规则 | 涉及订单、支付、事务流程时（业务域为信贷/支付时必读） |
| `architecture/index.md` | 架构约束（分层、依赖、模块边界） | 涉及模块新增、跨层调用、依赖方向变更时 |
| `infrastructure/api.md` | API 接口设计规范 | 涉及 HTTP 接口新增/修改、错误码、幂等设计时 |
| `infrastructure/database.md` | 数据库表与 ORM 规范 | 涉及建表、字段变更、SQL 编写、索引设计时 |
| `infrastructure/cache.md` | 缓存使用规范 | 涉及 Redis/Fusion 操作、Key 设计、TTL 决策时 |
| `infrastructure/mq.md` | 消息队列规范 | 涉及 Topic 新增、生产/消费逻辑、幂等设计时 |
| `infrastructure/security.md` | 安全规范 | 涉及 PII、加密、鉴权、敏感配置、日志脱敏时 |
| `infrastructure/logging.md` | 日志规范 | 涉及日志输出、traceId、异常处理时 |
| `linters/invariant-check.sh` | 约束自动化检查脚本 | PostToolUse 自动触发，无需手动加载 |
| `linters/spec-sync-check.sh` | spec/代码一致性检查 | PostToolUse 自动触发，无需手动加载 |
