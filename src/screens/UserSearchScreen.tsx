import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { searchUsers, followUser, unfollowUser } from '../api/users';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'UserSearch'>;

interface User {
  id: string;
  name: string;
  createdAt: string;
  isFollowing?: boolean;
}

export default function UserSearchScreen({ navigation }: Props) {
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setUsers([]); return; }
    setLoading(true);
    try {
      const result = await searchUsers(q);
      setUsers(result);
    } catch {
      Alert.alert('오류', '검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setFollowingMap((prev) => ({ ...prev, [userId]: false }));
      } else {
        await followUser(userId);
        setFollowingMap((prev) => ({ ...prev, [userId]: true }));
      }
    } catch {
      Alert.alert('오류', '팔로우 처리에 실패했습니다.');
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isFollowing = followingMap[item.id] ?? false;
    return (
      <View style={styles.userRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userSince}>
            {new Date(item.createdAt).getFullYear()}년부터 달리기 중
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={() => handleFollow(item.id, isFollowing)}
        >
          <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
            {isFollowing ? '팔로잉' : '팔로우'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>러너 찾기</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="이름으로 검색"
          placeholderTextColor="#AAA"
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setUsers([]); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ListEmptyComponent={
            query.length > 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏃</Text>
                <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
                <Text style={styles.emptyDesc}>다른 이름으로 검색해보세요</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyTitle}>함께 달릴 친구를 찾아보세요</Text>
                <Text style={styles.emptyDesc}>이름으로 검색하면 팔로우할 수 있어요</Text>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#FFFFFF',
  },
  backText: { fontSize: 16, color: '#4CAF50' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginVertical: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  clearBtn: { fontSize: 14, color: '#AAA', paddingLeft: 8 },
  listContent: { paddingBottom: 20 },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  userSince: { fontSize: 12, color: '#999', marginTop: 2 },
  followBtn: {
    backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
  },
  followingBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD' },
  followBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  followingBtnText: { color: '#888' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#999' },
});
