# VERDICT build review

review:
  security_score: B
  quality_score: B
  ready_for_mainnet: false
  findings:
    - severity: Low
      category: Build
      description: Next.js warns that the workspace root is inferred from the repository lockfile while verdict has its own lockfile.
      fix: Set outputFileTracingRoot in verdict/next.config.ts or intentionally standardize the lockfile layout before deployment.
    - severity: Medium
      category: Deployment
      description: Production readiness still depends on funded Midnight Preprod credentials and a deployed contract address.
      fix: Configure the documented Preprod environment variables and complete a real wallet-backed deploy/verify round trip.
