# 项目上下文

> 本文件是 propose / review 阶段的**必读入口**，用于建立项目基线认知。

- **project-mode**: greenfield
- **业务域**: <!-- TODO: 待确认 -->
- **架构风格**: <!-- TODO: 待确认 -->
- **技术栈**: <!-- TODO: 待确认 --> / <!-- TODO: 待确认 --> / <!-- TODO: 待确认 -->

## 判定依据

- **greenfield**：当前仓库尚无稳定业务代码，技术方案按首版基线设计评审。
- 评审重点：**基线架构合理性、可扩展性、运维可行性**为主，不以历史兼容性为主。

## 演进期望

- 在写入第一份业务代码后，更新本文件的技术栈、业务域、架构风格三项
- 同步触发 `scan-tech` / `scan-service` / `scan-boundary` / `scan-service-meta` 重建知识库与服务元数据
- 业务域明确后，将 `harness/invariants/amt.md` / `txn.md` 中的占位规则升级为强约束
