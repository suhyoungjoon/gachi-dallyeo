import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, updateMyName } from '../api/users';
import { formatDuration } from '../hooks/useRunningTracker';

interface ProfileData {
  user: { id: string; name: string; email: string; createdAt: string };
  stats: {
    totalRuns: number;
    totalDistance: number;
    totalDuration: number;
    monthlyRuns: number;
    monthlyDistance: number;
    followerCount: number;
    followingCount: number;
  };
}

function getBadges(stats: ProfileData['stats']): string[] {
  const badges: string[] = [];
  if (stats.totalDistance >= 5) badges.push('5km 달성');
  if (stats.totalDistance >= 10) badges.push('10km 달성');
  if (stats.totalRuns >= 10) badges.push('10회 완주');
  if (stats.totalRuns >= 30) badges.push('30회 완주');
  if (stats.totalDistance >= 100) badges.push('100km 돌파');
  return badges.length ? badges : ['첫 달리기'];
}

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getMyProfile()
        .then((d) => { if (active) setData(d); })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const handleEditName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const updatedUser = await updateMyName(newName.trim());
      setData((prev) => prev ? { ...prev, user: updatedUser } : prev);
      setEditModalVisible(false);
    } catch {
      Alert.alert('오류', '이름 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#4CAF50" size="large" /></View>;
  }

  const stats = data?.stats;
  const user = data?.user;
  const badges = stats ? getBadges(stats) : [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.name?.[0] ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.followRow}>
          <View style={styles.followItem}>
            <Text style={styles.followCount}>{stats?.followerCount ?? 0}</Text>
            <Text style={styles.followLabel}>팔로워</Text>
          </View>
          <View style={styles.followDivider} />
          <View style={styles.followItem}>
            <Text style={styles.followCount}>{stats?.followingCount ?? 0}</Text>
            <Text style={styles.followLabel}>팔로잉</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => { setNewName(user?.name ?? ''); setEditModalVisible(true); }}>
          <Text style={styles.editButtonText}>프로필 편집</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalStats}>
        <View style={styles.totalStatItem}>
          <Text style={styles.totalStatValue}>{stats?.totalDistance ?? 0}km</Text>
          <Text style={styles.totalStatLabel}>누적 거리</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.totalStatItem}>
          <Text style={styles.totalStatValue}>{stats?.totalRuns ?? 0}회</Text>
          <Text style={styles.totalStatLabel}>총 러닝</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.totalStatItem}>
          <Text style={styles.totalStatValue}>{formatDuration(stats?.totalDuration ?? 0)}</Text>
          <Text style={styles.totalStatLabel}>총 시간</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이번 달 활동</Text>
        <View style={styles.monthCard}>
          <View style={styles.monthItem}>
            <Text style={styles.monthValue}>{stats?.monthlyDistance ?? 0}km</Text>
            <Text style={styles.monthLabel}>거리</Text>
          </View>
          <View style={styles.monthItem}>
            <Text style={styles.monthValue}>{stats?.monthlyRuns ?? 0}회</Text>
            <Text style={styles.monthLabel}>러닝</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>획득 배지</Text>
        <View style={styles.badgeContainer}>
          {badges.map((badge, i) => (
            <View key={i} style={styles.badge}>
              <Text style={styles.badgeEmoji}>🏅</Text>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        {['알림 설정', '개인정보 처리방침', '이용약관'].map((item) => (
          <TouchableOpacity key={item} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{item}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>로그아웃</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>이름 변경</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="새 이름"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleEditName} disabled={saving}>
                <Text style={styles.modalConfirmText}>{saving ? '저장 중...' : '저장'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { backgroundColor: '#FFFFFF', alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  email: { fontSize: 13, color: '#999', marginBottom: 16 },
  followRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  followItem: { alignItems: 'center', paddingHorizontal: 24 },
  followCount: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  followLabel: { fontSize: 12, color: '#999' },
  followDivider: { width: 1, height: 30, backgroundColor: '#ECECEC' },
  editButton: { borderWidth: 1, borderColor: '#DDDDDD', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  editButtonText: { fontSize: 13, color: '#555', fontWeight: '500' },
  totalStats: { flexDirection: 'row', backgroundColor: '#4CAF50', marginHorizontal: 16, marginTop: 16, borderRadius: 14, paddingVertical: 18, justifyContent: 'space-around' },
  totalStatItem: { alignItems: 'center' },
  totalStatValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  totalStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginHorizontal: 16, marginBottom: 8 },
  monthCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 12, padding: 16, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  monthItem: { alignItems: 'center' },
  monthValue: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  monthLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 8 },
  badge: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  badgeEmoji: { fontSize: 16 },
  badgeText: { fontSize: 13, fontWeight: '500', color: '#333' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 1, paddingHorizontal: 16, paddingVertical: 16 },
  menuItemText: { fontSize: 15, color: '#333' },
  menuArrow: { fontSize: 20, color: '#CCC' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '80%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalConfirm: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 10, padding: 12, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontWeight: '700' },
});
