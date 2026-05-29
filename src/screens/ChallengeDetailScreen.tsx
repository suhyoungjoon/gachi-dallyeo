import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getChallengeDetail, joinChallenge, leaveChallenge, LeaderboardEntry } from '../api/challenges';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ChallengeDetail'>;

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return '종료된 챌린지';
  if (days === 0) return '오늘 마감';
  return `${days}일 남음`;
}

export default function ChallengeDetailScreen({ navigation, route }: Props) {
  const { challengeId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      const result = await getChallengeDetail(challengeId);
      setData(result);
    } catch {
      Alert.alert('오류', '챌린지를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [challengeId]);

  const handleJoinLeave = async () => {
    setActing(true);
    try {
      if (data.isParticipating) {
        await leaveChallenge(challengeId);
      } else {
        await joinChallenge(challengeId);
      }
      await load();
    } catch {
      Alert.alert('오류', '처리에 실패했습니다.');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4CAF50" size="large" /></View>;

  const { challenge, leaderboard, isParticipating } = data ?? {};
  const myEntry: LeaderboardEntry | undefined = leaderboard?.find((e: LeaderboardEntry) => e.user.id === user?.id);
  const myDistance = myEntry?.distance ?? 0;
  const pct = Math.min(100, (myDistance / challenge?.targetDistance) * 100);
  const ended = new Date(challenge?.endDate) < new Date();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        {!ended && (
          <TouchableOpacity
            style={[styles.actionBtn, isParticipating && styles.leaveBtn]}
            onPress={handleJoinLeave}
            disabled={acting}
          >
            {acting
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.actionBtnText}>{isParticipating ? '나가기' : '참여하기'}</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{challenge?.title}</Text>
          <Text style={styles.heroMeta}>
            {formatDate(challenge?.startDate)} ~ {formatDate(challenge?.endDate)}
          </Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{daysLeft(challenge?.endDate)}</Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{challenge?.targetDistance}km</Text>
              <Text style={styles.heroStatLabel}>목표 거리</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{challenge?._count?.participants ?? leaderboard?.length}명</Text>
              <Text style={styles.heroStatLabel}>참여자</Text>
            </View>
          </View>
        </View>

        {isParticipating && (
          <View style={styles.myProgress}>
            <View style={styles.myProgressTop}>
              <Text style={styles.myProgressLabel}>내 진행률</Text>
              <Text style={styles.myProgressPct}>{Math.round(pct)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={styles.myProgressDist}>{myDistance.toFixed(1)} / {challenge?.targetDistance}km</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>리더보드 🏆</Text>
        {leaderboard?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>아직 기록이 없어요. 달리기를 시작해보세요!</Text>
          </View>
        ) : (
          leaderboard?.map((entry: LeaderboardEntry, index: number) => {
            const entryPct = Math.min(100, (entry.distance / challenge?.targetDistance) * 100);
            const isMe = entry.user.id === user?.id;
            return (
              <View key={entry.user.id} style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
                <Text style={[styles.rank, index < 3 && styles.rankTop]}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                </Text>
                <View style={styles.leaderInfo}>
                  <View style={styles.leaderNameRow}>
                    <Text style={styles.leaderName}>{entry.user.name}{isMe ? ' (나)' : ''}</Text>
                    <Text style={styles.leaderDist}>{entry.distance.toFixed(1)}km</Text>
                  </View>
                  <View style={styles.leaderBarBg}>
                    <View style={[styles.leaderBarFill, { width: `${entryPct}%` as any, backgroundColor: isMe ? '#4CAF50' : '#90CAF9' }]} />
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  backText: { fontSize: 16, color: '#4CAF50' },
  actionBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 80, alignItems: 'center' },
  leaveBtn: { backgroundColor: '#FF3B30' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  heroCard: { backgroundColor: '#1A1A2E', margin: 16, borderRadius: 16, padding: 20 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  heroMeta: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(76,175,80,0.25)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16 },
  heroBadgeText: { fontSize: 12, color: '#81C784', fontWeight: '600' },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 },
  heroStatItem: { alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  myProgress: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  myProgressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  myProgressLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  myProgressPct: { fontSize: 13, fontWeight: '700', color: '#4CAF50' },
  progressBarBg: { height: 8, backgroundColor: '#EEEEEE', borderRadius: 4, marginBottom: 6 },
  progressBarFill: { height: 8, backgroundColor: '#4CAF50', borderRadius: 4 },
  myProgressDist: { fontSize: 12, color: '#999' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginHorizontal: 16, marginBottom: 8 },
  emptyState: { marginHorizontal: 16, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14 },
  leaderRowMe: { backgroundColor: '#E8F5E9', borderWidth: 1.5, borderColor: '#4CAF50' },
  rank: { fontSize: 18, fontWeight: '700', color: '#AAA', width: 36, textAlign: 'center' },
  rankTop: { fontSize: 20 },
  leaderInfo: { flex: 1 },
  leaderNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  leaderName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  leaderDist: { fontSize: 14, fontWeight: '700', color: '#333' },
  leaderBarBg: { height: 4, backgroundColor: '#EEEEEE', borderRadius: 2 },
  leaderBarFill: { height: 4, borderRadius: 2 },
});
