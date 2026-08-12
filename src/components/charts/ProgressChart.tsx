// interactive svg progress chart for best weight, e1rm, and volume progression

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ChartDataPoint } from '../../database/queries/statsQueries';
import { formatWeight } from '../../utils/calculations';

interface ProgressChartProps {
  data: ChartDataPoint[];
  unit: 'kg' | 'lb';
  title: string;
}

export const ProgressChart: React.FC<ProgressChartProps> = React.memo(({ data, unit, title }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    data.length > 0 ? data.length - 1 : null
  );

  // keep the selection valid when new data arrives
  useEffect(() => {
    setSelectedIndex(data.length > 0 ? data.length - 1 : null);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No historical chart data points recorded yet.</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - 32;
  const chartHeight = 180;
  const paddingVertical = 25;
  const paddingHorizontal = 20;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const width = screenWidth;
  const height = chartHeight;

  // calculate svg coordinates for each point
  const points = data.map((d, i) => {
    const x =
      paddingHorizontal +
      (i / (data.length - 1 || 1)) * (width - 2 * paddingHorizontal);
    const y =
      height -
      paddingVertical -
      ((d.value - minVal) / range) * (height - 2 * paddingVertical);
    return { x, y, dataPoint: d };
  });

  // build line path string
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  const selectedPoint = selectedIndex !== null ? points[selectedIndex] : points[points.length - 1];

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>{title}</Text>

      {selectedPoint && (
        <View style={styles.tooltipCard}>
          <Text style={styles.tooltipDate}>{selectedPoint.dataPoint.date}</Text>
          <Text style={styles.tooltipValue}>
            {formatWeight(selectedPoint.dataPoint.value, unit)}
            {selectedPoint.dataPoint.reps ? ` × ${selectedPoint.dataPoint.reps} reps` : ''}
          </Text>
          {selectedPoint.dataPoint.e1rm && (
            <Text style={styles.tooltipSub}>
              Est 1RM: {formatWeight(selectedPoint.dataPoint.e1rm, unit)}
            </Text>
          )}
        </View>
      )}

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* horizontal reference grid lines */}
        <Line
          x1={paddingHorizontal}
          y1={paddingVertical}
          x2={width - paddingHorizontal}
          y2={paddingVertical}
          stroke="#334155"
          strokeDasharray="4 4"
        />
        <Line
          x1={paddingHorizontal}
          y1={height - paddingVertical}
          x2={width - paddingHorizontal}
          y2={height - paddingVertical}
          stroke="#334155"
          strokeDasharray="4 4"
        />

        {/* line path */}
        <Path d={pathD} stroke="#6366f1" strokeWidth={3} fill="none" />

        {/* interactive point dots */}
        {points.map((p, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <Circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={isSelected ? 6 : 4}
              fill={isSelected ? '#38bdf8' : '#818cf8'}
              stroke="#0f172a"
              strokeWidth={2}
              onPress={() => setSelectedIndex(idx)}
            />
          );
        })}
      </Svg>

      <View style={styles.touchStrip}>
        {points.map((p, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.touchItem}
            onPress={() => setSelectedIndex(idx)}
          />
        ))}
      </View>
    </View>
  );
});
ProgressChart.displayName = 'ProgressChart';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  emptyContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  tooltipCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tooltipDate: {
    color: '#94a3b8',
    fontSize: 12,
  },
  tooltipValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  tooltipSub: {
    color: '#38bdf8',
    fontSize: 13,
    marginTop: 2,
  },
  touchStrip: {
    flexDirection: 'row',
    height: 30,
    marginTop: -30,
  },
  touchItem: {
    flex: 1,
    height: '100%',
  },
});
