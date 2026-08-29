// interactive svg progress chart for best weight, e1rm, and volume progression

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ChartDataPoint } from '../../database/queries/statsQueries';
import { formatWeight } from '../../utils/calculations';
import { useAppTheme } from '../../context/ThemeContext';

interface ProgressChartProps {
  data: ChartDataPoint[];
  unit: 'kg' | 'lb';
  title: string;
}

export const ProgressChart: React.FC<ProgressChartProps> = React.memo(({ data, unit, title }) => {
  const { colors } = useAppTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    data.length > 0 ? data.length - 1 : null
  );

  // keep the selection valid when new data arrives
  useEffect(() => {
    setSelectedIndex(data.length > 0 ? data.length - 1 : null);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No historical chart data points recorded yet.</Text>
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
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.chartTitle, { color: colors.textMuted }]}>{title}</Text>

      {selectedPoint && (
        <View style={[styles.tooltipCard, { backgroundColor: colors.cardAlt }]}>
          <Text style={[styles.tooltipDate, { color: colors.textMuted }]}>{selectedPoint.dataPoint.date}</Text>
          <Text style={[styles.tooltipValue, { color: colors.text }]}>
            {formatWeight(selectedPoint.dataPoint.value, unit)}
            {selectedPoint.dataPoint.reps ? ` × ${selectedPoint.dataPoint.reps} reps` : ''}
          </Text>
          {selectedPoint.dataPoint.e1rm && (
            <Text style={[styles.tooltipSub, { color: colors.secondary }]}>
              Est 1RM: {formatWeight(selectedPoint.dataPoint.e1rm, unit)}
            </Text>
          )}
        </View>
      )}

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* horizontal reference grid lines */}
        <Line
          x1={paddingHorizontal}
          y1={paddingVertical}
          x2={width - paddingHorizontal}
          y2={paddingVertical}
          stroke={colors.border}
          strokeDasharray="4 4"
        />
        <Line
          x1={paddingHorizontal}
          y1={height - paddingVertical}
          x2={width - paddingHorizontal}
          y2={height - paddingVertical}
          stroke={colors.border}
          strokeDasharray="4 4"
        />

        {/* line path */}
        <Path d={pathD} stroke={colors.primary} strokeWidth={3} fill="none" />

        {/* interactive point dots */}
        {points.map((p, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <Circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={isSelected ? 6 : 4}
              fill={isSelected ? colors.secondary : colors.primary}
              stroke={colors.card}
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
  },
  tooltipCard: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tooltipDate: {
    fontSize: 12,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  tooltipSub: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '700',
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
