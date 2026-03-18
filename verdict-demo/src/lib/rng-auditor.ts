export interface RNGAuditResult {
  verdict: "fair" | "suspicious" | "rigged";
  entropy: number;
  chiSquared: number;
  pValue: number;
  buckets: { range: string; observed: number; expected: number }[];
  anomalies: { description: string; severity: "low" | "medium" | "high" }[];
  sequenceLength: number;
}

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function chiSquaredTest(observed: number[], expected: number[]): { chiSq: number; pValue: number } {
  let chiSq = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chiSq += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
  }
  const df = observed.length - 1;
  const z = Math.sqrt(2 * chiSq) - Math.sqrt(2 * df - 1);
  const pValue = Math.max(0, Math.min(1, 0.5 * (1 - erf(z / Math.sqrt(2)))));
  return { chiSq, pValue };
}

function shannonEntropy(values: number[], bucketCount: number): number {
  const counts = new Array(bucketCount).fill(0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  for (const v of values) {
    const idx = Math.min(Math.floor(((v - min) / range) * bucketCount), bucketCount - 1);
    counts[idx]++;
  }

  let entropy = 0;
  const n = values.length;
  for (const c of counts) {
    if (c > 0) {
      const p = c / n;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export function auditRNGSequence(values: number[]): RNGAuditResult {
  const bucketCount = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const observed = new Array(bucketCount).fill(0);
  for (const v of values) {
    const idx = Math.min(Math.floor(((v - min) / range) * bucketCount), bucketCount - 1);
    observed[idx]++;
  }

  const expected = new Array(bucketCount).fill(values.length / bucketCount);

  const buckets = observed.map((obs: number, i: number) => ({
    range: `${(min + (i / bucketCount) * range).toFixed(1)}-${(min + ((i + 1) / bucketCount) * range).toFixed(1)}`,
    observed: obs,
    expected: Math.round(expected[i] * 100) / 100,
  }));

  const { chiSq, pValue } = chiSquaredTest(observed, expected);
  const entropy = shannonEntropy(values, bucketCount);
  const maxEntropy = Math.log2(bucketCount);
  const entropyRatio = entropy / maxEntropy;

  const anomalies: RNGAuditResult["anomalies"] = [];

  const valueCounts = new Map<number, number>();
  for (const v of values) {
    valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
  }
  const maxRepeat = Math.max(...valueCounts.values());
  if (maxRepeat > values.length * 0.1) {
    anomalies.push({
      description: `Value ${[...valueCounts.entries()].find(([, c]) => c === maxRepeat)?.[0]} appears ${maxRepeat} times (${((maxRepeat / values.length) * 100).toFixed(1)}%)`,
      severity: maxRepeat > values.length * 0.2 ? "high" : "medium",
    });
  }

  let maxRun = 1;
  let currentRun = 1;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 1;
    }
  }
  if (maxRun > Math.sqrt(values.length) * 2) {
    anomalies.push({
      description: `Longest ascending run: ${maxRun} consecutive values (expected ~${Math.round(Math.sqrt(values.length))})`,
      severity: "high",
    });
  }

  const maxBucket = Math.max(...observed);
  const minBucket = Math.min(...observed);
  if (maxBucket > expected[0] * 2) {
    anomalies.push({
      description: `Distribution heavily skewed: bucket max=${maxBucket}, min=${minBucket}, expected=${Math.round(expected[0])}`,
      severity: "high",
    });
  } else if (maxBucket > expected[0] * 1.5) {
    anomalies.push({
      description: `Distribution mildly skewed: bucket max=${maxBucket}, min=${minBucket}`,
      severity: "medium",
    });
  }

  if (entropyRatio < 0.8) {
    anomalies.push({
      description: `Low entropy: ${(entropyRatio * 100).toFixed(1)}% of maximum — predictable sequence`,
      severity: entropyRatio < 0.5 ? "high" : "medium",
    });
  }

  if (pValue < 0.01) {
    anomalies.push({
      description: `Chi-squared test failed (p=${pValue.toFixed(4)}) — distribution significantly non-uniform`,
      severity: "high",
    });
  } else if (pValue < 0.05) {
    anomalies.push({
      description: `Chi-squared marginal (p=${pValue.toFixed(4)}) — borderline uniformity`,
      severity: "medium",
    });
  }

  let verdict: RNGAuditResult["verdict"] = "fair";
  const highCount = anomalies.filter((a) => a.severity === "high").length;
  if (highCount >= 2 || pValue < 0.01) verdict = "rigged";
  else if (highCount >= 1 || pValue < 0.05) verdict = "suspicious";

  return {
    verdict,
    entropy: Math.round(entropy * 1000) / 1000,
    chiSquared: Math.round(chiSq * 100) / 100,
    pValue: Math.round(pValue * 10000) / 10000,
    buckets,
    anomalies,
    sequenceLength: values.length,
  };
}

export function generateSampleRNG(type: "fair" | "rigged", count: number = 200): number[] {
  if (type === "fair") {
    return Array.from({ length: count }, () => Math.round(Math.random() * 100));
  }

  return Array.from({ length: count }, (_, i) => {
    if (i % 5 === 0) return 73;
    if (i % 3 === 0) return Math.round(60 + Math.random() * 20);
    return Math.round(Math.random() * 40 + 50);
  });
}
