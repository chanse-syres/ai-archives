export interface ScrapeMeasurement {
  model: string;
  sourceHtmlBytes: number;
  parseDurationMs: number;
  totalDurationMs: number;
  recordedAt: string;
}

export interface PercentileSummary {
  count: number;
  minMs: number | null;
  maxMs: number | null;
  p50Ms: number | null;
  p90Ms: number | null;
}

export interface ScrapeMetricsSnapshot {
  totalSamples: number;
  latestMeasurement: ScrapeMeasurement | null;
  parseDurationMs: PercentileSummary;
  totalDurationMs: PercentileSummary;
}

export interface ScrapeMetricsLogSummary {
  totalSamples: number;
  parseDurationMs: Pick<PercentileSummary, 'p50Ms' | 'p90Ms'>;
  totalDurationMs: Pick<PercentileSummary, 'p50Ms' | 'p90Ms'>;
}

const MAX_SAMPLES = 200;

class ScrapeMetricsStore {
  private parseDurations: number[] = [];
  private totalDurations: number[] = [];
  private latestMeasurement: ScrapeMeasurement | null = null;

  observe(measurement: Omit<ScrapeMeasurement, 'recordedAt'>): ScrapeMeasurement {
    const recordedMeasurement: ScrapeMeasurement = {
      ...measurement,
      recordedAt: new Date().toISOString(),
    };

    this.pushSample(this.parseDurations, recordedMeasurement.parseDurationMs);
    this.pushSample(this.totalDurations, recordedMeasurement.totalDurationMs);
    this.latestMeasurement = recordedMeasurement;

    return recordedMeasurement;
  }

  snapshot(): ScrapeMetricsSnapshot {
    return {
      totalSamples: this.totalDurations.length,
      latestMeasurement: this.latestMeasurement,
      parseDurationMs: summarizePercentiles(this.parseDurations),
      totalDurationMs: summarizePercentiles(this.totalDurations),
    };
  }

  private pushSample(collection: number[], value: number) {
    collection.push(value);
    if (collection.length > MAX_SAMPLES) {
      collection.shift();
    }
  }
}

function summarizePercentiles(values: number[]): PercentileSummary {
  if (values.length === 0) {
    return {
      count: 0,
      minMs: null,
      maxMs: null,
      p50Ms: null,
      p90Ms: null,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);

  return {
    count: sorted.length,
    minMs: roundMetric(sorted[0]),
    maxMs: roundMetric(sorted[sorted.length - 1]),
    p50Ms: percentile(sorted, 0.5),
    p90Ms: percentile(sorted, 0.9),
  };
}

function percentile(sortedValues: number[], quantile: number): number {
  const index = Math.ceil(sortedValues.length * quantile) - 1;
  const boundedIndex = Math.min(sortedValues.length - 1, Math.max(0, index));
  return roundMetric(sortedValues[boundedIndex]);
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

export const scrapeMetricsStore = new ScrapeMetricsStore();

export function getScrapeMetricsLogSummary(): ScrapeMetricsLogSummary {
  const snapshot = scrapeMetricsStore.snapshot();

  return {
    totalSamples: snapshot.totalSamples,
    parseDurationMs: {
      p50Ms: snapshot.parseDurationMs.p50Ms,
      p90Ms: snapshot.parseDurationMs.p90Ms,
    },
    totalDurationMs: {
      p50Ms: snapshot.totalDurationMs.p50Ms,
      p90Ms: snapshot.totalDurationMs.p90Ms,
    },
  };
}