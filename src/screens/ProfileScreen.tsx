import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { dummyProfile } from '../data/dummyData';

export default function ProfileScreen() {
  const profile = dummyProfile;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <Image source={{ uri: profile.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.level}>{profile.level}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>프로필 편집</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalStats}>
        <View style={styles.totalStatItem}>
          <Text style={styles.totalStatValue}>{profile.totalDistance}km</Text>
          <Text style={styles.totalStatLabel}>누적 거리</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.totalStatItem}>
          <Text style={styles.totalStatValue}>{profile.totalRuns}회</Text>
          <Text style={styles.totalStatLabel}>총 러닝</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.totalStatItem}>
          <Text style={styles.totalStatValue}>{profile.totalTime}</Text>
          <Text style={styles.totalStatLabel}>총 시간</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이번 달 활동</Text>
        <View style={styles.monthCard}>
          <View style={styles.monthItem}>
            <Text style={styles.monthValue}>{profile.monthlyDistance}km</Text>
            <Text style={styles.monthLabel}>거리</Text>
          </View>
          <View style={styles.monthItem}>
            <Text style={styles.monthValue}>{profile.monthlyRuns}회</Text>
            <Text style={styles.monthLabel}>러닝</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>획득 배지</Text>
        <View style={styles.badgeContainer}>
          {profile.badges.map((badge, index) => (
            <View key={index} style={styles.badge}>
              <Text style={styles.badgeEmoji}>🏅</Text>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>설정</Text>
        {['알림 설정', '개인정보 처리방침', '이용약관', '로그아웃'].map((item) => (
          <TouchableOpacity key={item} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{item}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  level: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 16,
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: { fontSize: 13, color: '#555', fontWeight: '500' },
  totalStats: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 18,
    justifyContent: 'space-around',
  },
  totalStatItem: { alignItems: 'center' },
  totalStatValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  totalStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginHorizontal: 16, marginBottom: 8 },
  monthCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  monthItem: { alignItems: 'center' },
  monthValue: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  monthLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 8 },
  badge: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  badgeEmoji: { fontSize: 16 },
  badgeText: { fontSize: 13, fontWeight: '500', color: '#333' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuItemText: { fontSize: 15, color: '#333' },
  menuArrow: { fontSize: 20, color: '#CCC' },
});
