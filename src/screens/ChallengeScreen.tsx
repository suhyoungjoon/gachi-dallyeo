import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getChallenges, createChallenge, joinChallenge, Challenge, ChallengeListData } from '../api/challenges';

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return '종료됨';
  if (days === 0) return '오늘 마감';
  return `${days}일 남음`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ChallengeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [data, setData] = useState<ChallengeListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [targetDist, setTargetDist] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadData = useCallback(async (active: { current: boolean }) => {
    try {
      const result = await getChallenges();
      if (active.current) setData(result);
    } catch {}
    finally { if (active.current) setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    const active = { current: true };
    setLoading(true);
    loadData(active);
    return () => { active.current = false; };
  }, [loadData]));

  const handleCreate = async () => {
    if (!title.trim() || !targetDist || !startDate || !endDate) {
      Alert.alert('알림', '모든 항목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await createChallenge({
        title: title.trim(),
        targetDistance: parseFloat(targetDist),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      setModalVisible(false);
      setTitle(''); setTargetDist(''); setStartDate(''); setEndDate('');
      const active = { current: true };
      await loadData(active);
    } catch {
      Alert.alert('오류', '챌린지 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    try {
      await joinChallenge(id);
      const active = { current: true };
      await loadData(active);
    } catch {
      Alert.alert('오류', '참여에 실패했습니다.');
    } finally {
      setJoiningId(null);
    }
  };

  const renderChallengeCard = (c: Challenge, mine: boolean) => {
    const progress = mine ? (data?.myProgress[c.id] ?? 0) : 0;
    const pct = mine ? Math.min(100, (progress / c.targetDistance) * 100) : 0;
    const ended = new Date(c.endDate) < new Date();

    return (
      <TouchableOpacity
        key={c.id}
        style={[styles.card, ended && styles.cardEnded]}
        onPress={() => navigation.navigate('ChallengeDetail', { challengeId: c.id })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{c.title}</Text>
          <Text style={[styles.cardDays, ended && styles.cardDaysEnded]}>{daysLeft(c.endDate)}</Text>
        </View>
        <Text style={styles.cardMeta}>
          🎯 {c.targetDistance}km · {formatDate(c.startDate)} ~ {formatDate(c.endDate)} · 👥 {c._count.participants}명
        </Text>
        {mine && (
          <>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={styles.progressText}>{progress.toFixed(1)} / {c.targetDistance}km ({Math.round(pct)}%)</Text>
          </>
        )}
        {!mine && !ended && (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={(e) => { e.stopPropagation(); handleJoin(c.id); }}
            disabled={joiningId === c.id}
          >
            {joiningId === c.id
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.joinBtnText}>참여하기</Text>
            }
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 챌린지</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtnText}>+ 만들기</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {(data?.myChallenges.length ?? 0) > 0 && (
            <>
              <Text style={styles.sectionTitle}>참여 중인 챌린지</Text>
              {data!.myChallenges.map((c) => renderChallengeCard(c, true))}
            </>
          )}

          <Text style={styles.sectionTitle}>참여 가능한 챌린지</Text>
          {(data?.openChallenges.length ?? 0) === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏁</Text>
              <Text style={styles.emptyTitle}>참여 가능한 챌린지가 없어요</Text>
              <Text style={styles.emptyDesc}>첫 번째 챌린지를 만들어보세요!</Text>
            </View>
          ) : (
            data!.openChallenges.map((c) => renderChallengeCard(c, false))
          )}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>새 챌린지 만들기</Text>
            <TextInput
              style={styles.input}
              placeholder="챌린지 이름 (예: 이번 달 100km 달성!)"
              placeholderTextColor="#AAA"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="목표 거리 (km, 예: 100)"
              placeholderTextColor="#AAA"
              value={targetDist}
              onChangeText={setTargetDist}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="시작일 (예: 2026-06-01)"
              placeholderTextColor="#AAA"
              value={startDate}
              onChangeText={setStartDate}
            />
            <TextInput
              style={styles.input}
              placeholder="종료일 (예: 2026-06-30)"
              placeholderTextColor="#AAA"
              value={endDate}
              onChangeText={setEndDate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreate} disabled={saving}>
                <Text style={styles.modalConfirmText}>{saving ? '생성 중...' : '만들기'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  createBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  createBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  cardEnded: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 8 },
  cardDays: { fontSize: 12, fontWeight: '600', color: '#4CAF50', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  cardDaysEnded: { color: '#999', backgroundColor: '#F0F0F0' },
  cardMeta: { fontSize: 12, color: '#888', marginBottom: 10 },
  progressBarBg: { height: 6, backgroundColor: '#EEEEEE', borderRadius: 3, marginBottom: 6 },
  progressBarFill: { height: 6, backgroundColor: '#4CAF50', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
  joinBtn: { backgroundColor: '#4CAF50', borderRadius: 20, paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  joinBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', backgroundColor: '#FAFAFA', marginBottom: 10 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalConfirm: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700' },
});
