import { Metric } from '../../models/metric';
import logger from '../../utils/logger';

interface TimeSeriesAnalysis {
  trend: number[];
  seasonality: number[];
  residuals: number[];
}

interface ForecastResult {
  predictions: number[];
  confidence: {
    lower: number[];
    upper: number[];
  };
}

export class TimeSeriesService {
  private readonly MIN_DATA_POINTS = 10;

  async analyzeTrend(data: Metric[]): Promise<number[]> {
    if (data.length < this.MIN_DATA_POINTS) {
      throw new Error('Insufficient data points for trend analysis');
    }

    try {
      const values = data.map(d => d.value);
      const trend = this.calculateMovingAverage(values, 5);
      return trend;
    } catch (error) {
      logger.error('Error analyzing trend:', error);
      throw error;
    }
  }

  async detectSeasonality(data: Metric[]): Promise<number[]> {
    if (data.length < this.MIN_DATA_POINTS * 2) {
      throw new Error('Insufficient data points for seasonality detection');
    }

    try {
      const values = data.map(d => d.value);
      const trend = await this.analyzeTrend(data);
      const detrended = values.map((v, i) => v - trend[i]);
      return this.calculateSeasonalIndices(detrended);
    } catch (error) {
      logger.error('Error detecting seasonality:', error);
      throw error;
    }
  }

  async detectOutliers(data: Metric[]): Promise<number[]> {
    if (data.length < this.MIN_DATA_POINTS) {
      throw new Error('Insufficient data points for outlier detection');
    }

    try {
      const values = data.map(d => d.value);
      const mean = this.calculateMean(values);
      const stdDev = this.calculateStandardDeviation(values);
      const zScores = values.map(v => Math.abs((v - mean) / stdDev));
      
      return values.map((v, i) => zScores[i] > 3 ? v : NaN)
        .filter(v => !isNaN(v));
    } catch (error) {
      logger.error('Error detecting outliers:', error);
      throw error;
    }
  }

  async forecast(data: Metric[], steps: number): Promise<ForecastResult> {
    if (data.length < this.MIN_DATA_POINTS) {
      throw new Error('Insufficient data points for forecasting');
    }

    try {
      const values = data.map(d => d.value);
      const trend = await this.analyzeTrend(data);
      const seasonality = await this.detectSeasonality(data);
      
      const predictions = this.calculatePredictions(values, trend, seasonality, steps);
      const confidence = this.calculateConfidenceIntervals(predictions, values);

      return {
        predictions,
        confidence
      };
    } catch (error) {
      logger.error('Error generating forecast:', error);
      throw error;
    }
  }

  private calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(values.length, i + Math.floor(window / 2) + 1);
      const windowValues = values.slice(start, end);
      result.push(this.calculateMean(windowValues));
    }
    return result;
  }

  private calculateSeasonalIndices(detrended: number[]): number[] {
    // Simple seasonal decomposition using averages
    const seasonalPeriod = this.detectSeasonalPeriod(detrended);
    const indices: number[] = new Array(seasonalPeriod).fill(0);
    const counts: number[] = new Array(seasonalPeriod).fill(0);

    for (let i = 0; i < detrended.length; i++) {
      const idx = i % seasonalPeriod;
      indices[idx] += detrended[i];
      counts[idx]++;
    }

    return indices.map((sum, i) => sum / counts[i]);
  }

  private detectSeasonalPeriod(data: number[]): number {
    // Simple autocorrelation-based period detection
    const maxLag = Math.floor(data.length / 2);
    let bestPeriod = 1;
    let bestCorrelation = -1;

    for (let lag = 1; lag < maxLag; lag++) {
      const correlation = this.calculateAutocorrelation(data, lag);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = lag;
      }
    }

    return bestPeriod;
  }

  private calculateAutocorrelation(data: number[], lag: number): number {
    const n = data.length;
    const mean = this.calculateMean(data);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
      denominator += Math.pow(data[i] - mean, 2);
    }

    return numerator / denominator;
  }

  private calculatePredictions(
    values: number[],
    trend: number[],
    seasonality: number[],
    steps: number
  ): number[] {
    const predictions: number[] = [];
    const seasonalPeriod = seasonality.length;

    for (let i = 0; i < steps; i++) {
      const trendValue = this.extrapolateTrend(trend, i);
      const seasonalValue = seasonality[i % seasonalPeriod];
      predictions.push(trendValue + seasonalValue);
    }

    return predictions;
  }

  private extrapolateTrend(trend: number[], steps: number): number {
    const lastTrendValues = trend.slice(-5);
    const slope = (lastTrendValues[lastTrendValues.length - 1] - lastTrendValues[0]) / 
                 (lastTrendValues.length - 1);
    return trend[trend.length - 1] + slope * steps;
  }

  private calculateConfidenceIntervals(
    predictions: number[],
    historicalValues: number[]
  ): { lower: number[]; upper: number[] } {
    const stdDev = this.calculateStandardDeviation(historicalValues);
    const z = 1.96; // 95% confidence interval

    return {
      lower: predictions.map(p => p - z * stdDev),
      upper: predictions.map(p => p + z * stdDev)
    };
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(this.calculateMean(squaredDiffs));
  }
}
