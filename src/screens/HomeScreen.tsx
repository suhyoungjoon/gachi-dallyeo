import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getFeed } from '../api/users';
import { getMyStats } from '../api/runs';
import { getGoal, GoalData } from '../api/goals';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../hooks/useRunningTracker';

type Props = CompositeScreenProps<
  BottomTabScreenProps<{ 홈: undefined; 기록: undefined; 코스: undefined; 커뮤니티: undefined; 프로필: undefined }, '홈'>,
  NativeStackScreenProps<RootStackParamList>
>;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [feedRuns, setFeedRuns] = useState<any[]>([]);
  const [isPublicFeed, setIsPublicFeed] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [feed, myStats, goal] = await Promise.all([getFeed(), getMyStats(), getGoal().catch(() => null)]);
      setFeedRuns(feed.runs);
      setIsPublicFeed(feed.isPublicFeed);
      setStats(myStats);
      setGoalData(goal);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>같이달려</Text>
        <TouchableOpacity style={styles.startButton} onPress={() => navigation.navigate('Running')}>
          <Text style={styles.startButtonText}>▶ 달리기 시작</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>이번 달 달린 거리</Text>
        <Text style={styles.summaryDistance}>{stats?.monthlyDistance ?? 0} km</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{stats?.monthlyRuns ?? 0}회</Text>
            <Text style={styles.summaryItemLabel}>러닝</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{formatDuration(stats?.totalDuration ?? 0)}</Text>
            <Text style={styles.summaryItemLabel}>누적 시간</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{stats?.totalRuns ?? 0}회</Text>
            <Text style={styles.summaryItemLabel}>총 러닝</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.challengeBanner} onPress={() => navigation.navigate('Challenge')}>
        <View>
          <Text style={styles.challengeBannerTitle}>🏆 러닝 챌린지</Text>
          <Text style={styles.challengeBannerDesc}>친구와 목표 거리를 경쟁해보세요</Text>
        </View>
        <Text style={styles.challengeBannerArrow}>›</Text>
      </TouchableOpacity>

      {goalData?.goal && (
        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>🎯 이번 주 목표</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>
              {goalData.progress.weeklyDistance.toFixed(1)} / {goalData.goal.weeklyDistance}km
            </Text>
            <Text style={styles.goalPct}>
              {Math.min(100, Math.round((goalData.progress.weeklyDistance / goalData.goal.weeklyDistance) * 100))}%
            </Text>
          </View>
          <View style={styles.goalBarBg}>
            <View style={[styles.goalBarFill, {
              width: `${Math.min(100, (goalData.progress.weeklyDistance / goalData.goal.weeklyDistance) * 100)}%` as any,
            }]} />
          </View>
          <Text style={styles.goalMonthly}>
            이번 달: {goalData.progress.monthlyDistance.toFixed(1)} / {goalData.goal.monthlyDistance}km
          </Text>
        </View>
      )}

      <View style={styles.feedHeader}>
        <Text style={styles.sectionTitle}>
          {isPublicFeed ? '전체 러너 활동' : '팔로우 피드'}
        </Text>
        {isPublicFeed && (
          <View style={styles.publicBadge}>
            <Text style={styles.publicBadgeText}>전체 공개</Text>
          </View>
        )}
      </View>
      {isPublicFeed && (
        <View style={styles.publicBanner}>
          <Text style={styles.publicBannerText}>
            👥 팔로우한 러너가 없어요. 다른 러너를 팔로우하면 맞춤 피드를 볼 수 있어요.
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 20 }} />
      ) : feedRuns.length === 0 ? (
        <View style={styles.emptyFeed}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>아직 피드가 없어요</Text>
          <Text style={styles.emptyDesc}>다른 러너를 팔로우하면 활동이 여기 보여요</Text>
        </View>
      ) : (
        feedRuns.map((run) => (
          <View key={run.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{run.user.name?.[0] ?? '?'}</Text>
              </View>
              <View style={styles.postMeta}>
                <Text style={styles.postUser}>{run.user.name}</Text>
                <Text style={styles.postTime}>{timeAgo(run.createdAt)}</Text>
              </View>
            </View>
            {run.course && <Text style={styles.postCourse}>📍 {run.course.name}</Text>}
            <View style={styles.postStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{run.distance.toFixed(2)}km</Text>
                <Text style={styles.statLabel}>거리</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDuration(run.duration)}</Text>
                <Text style={styles.statLabel}>시간</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{run.pace}/km</Text>
                <Text style={styles.statLabel}>페이스</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  startButton: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  startButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  summaryCard: { backgroundColor: '#4CAF50', margin: 16, borderRadius: 16, padding: 20 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 },
  summaryDistance: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryItemValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  summaryItemLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  challengeBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A2E', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16 },
  challengeBannerTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  challengeBannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  challengeBannerArrow: { fontSize: 24, color: '#4CAF50', fontWeight: '700' },
  goalCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  goalTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { fontSize: 13, color: '#555' },
  goalPct: { fontSize: 13, fontWeight: '700', color: '#4CAF50' },
  goalBarBg: { height: 6, backgroundColor: '#EEEEEE', borderRadius: 3, marginBottom: 8 },
  goalBarFill: { height: 6, backgroundColor: '#4CAF50', borderRadius: 3 },
  goalMonthly: { fontSize: 12, color: '#999' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  publicBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  publicBadgeText: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  publicBanner: { backgroundColor: '#F1F8F1', marginHorizontal: 16, marginBottom: 10, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#4CAF50' },
  publicBannerText: { fontSize: 13, color: '#555', lineHeight: 18 },
  emptyFeed: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 32 },
  postCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  postMeta: { marginLeft: 10 },
  postUser: { fontWeight: '600', fontSize: 14, color: '#1A1A1A' },
  postTime: { fontSize: 12, color: '#999' },
  postCourse: { fontSize: 12, color: '#4CAF50', marginBottom: 8 },
  postStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F9F9F9', borderRadius: 8, paddingVertical: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },
});
