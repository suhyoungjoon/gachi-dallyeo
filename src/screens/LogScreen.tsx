import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllRuns } from '../storage/runStorage';
import { RunRecord } from '../types';
import { formatDuration } from '../hooks/useRunningTracker';

function formatDate(iso: string) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return { day, month };
}

function totalStats(runs: RunRecord[]) {
  const dist = runs.reduce((s, r) => s + r.distance, 0);
  const secs = runs.reduce((s, r) => s + r.duration, 0);
  return {
    distance: Math.round(dist * 10) / 10,
    count: runs.length,
    duration: formatDuration(secs),
  };
}

export default function LogScreen() {
  const [runs, setRuns] = useState<RunRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllRuns().then(setRuns);
    }, [])
  );

  const stats = totalStats(runs);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>운동 기록</Text>
      </View>

      <View style={styles.monthSummary}>
        <Text style={styles.monthTitle}>내 전체 기록</Text>
        <View style={styles.monthStats}>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatValue}>{stats.distance}km</Text>
            <Text style={styles.monthStatLabel}>총 거리</Text>
          </View>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatValue}>{stats.count}회</Text>
            <Text style={styles.monthStatLabel}>러닝 횟수</Text>
          </View>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatValue}>{stats.duration}</Text>
            <Text style={styles.monthStatLabel}>총 시간</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>최근 기록</Text>

      {runs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏃</Text>
          <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
          <Text style={styles.emptyDesc}>홈 화면에서 달리기를 시작해보세요!</Text>
        </View>
      ) : (
        runs.map((run) => {
          const { day, month } = formatDate(run.date);
          return (
            <TouchableOpacity key={run.id} style={styles.logCard}>
              <View style={styles.logDate}>
                <Text style={styles.logDay}>{day}</Text>
                <Text style={styles.logMonth}>{month}월</Text>
              </View>
              <View style={styles.logDivider} />
              <View style={styles.logMain}>
                <Text style={styles.logDistance}>{run.distance.toFixed(2)} km</Text>
                <View style={styles.logDetails}>
                  <Text style={styles.logDetailText}>⏱ {formatDuration(run.duration)}</Text>
                  <Text style={styles.logDetailText}>⚡ {run.pace}/km</Text>
                  <Text style={styles.logDetailText}>🔥 {run.calories}kcal</Text>
                </View>
              </View>
              <Text style={styles.logArrow}>›</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  monthSummary: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  monthTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  monthStats: { flexDirection: 'row', justifyContent: 'space-around' },
  monthStatItem: { alignItems: 'center' },
  monthStatValue: { fontSize: 20, fontWeight: '700', color: '#4CAF50' },
  monthStatLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 8,
    color: '#1A1A1A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#999' },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  logDate: { alignItems: 'center', width: 40 },
  logDay: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  logMonth: { fontSize: 11, color: '#999' },
  logDivider: { width: 1, height: 40, backgroundColor: '#ECECEC', marginHorizontal: 14 },
  logMain: { flex: 1 },
  logDistance: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  logDetails: { flexDirection: 'row', gap: 10 },
  logDetailText: { fontSize: 12, color: '#666' },
  logArrow: { fontSize: 22, color: '#CCC' },
});
