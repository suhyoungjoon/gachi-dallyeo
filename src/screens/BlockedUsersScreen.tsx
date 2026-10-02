import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getBlockedUsers, unblockUser } from '../api/users';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

export default function BlockedUsersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getBlockedUsers()
        .then((u) => { if (active) setUsers(u); })
        .catch(() => Alert.alert('오류', '차단 목록을 불러올 수 없습니다.'))
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const handleUnblock = (id: string, name: string) => {
    Alert.alert('차단 해제', `${name}님의 차단을 해제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        onPress: async () => {
          try {
            await unblockUser(id);
            setUsers((prev) => prev.filter((u) => u.id !== id));
          } catch {
            Alert.alert('오류', '차단 해제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단한 사용자</Text>
        <View style={{ width: 50 }} />
      </View>
      {loading ? (
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name[0]}</Text></View>
              <Text style={styles.name}>{item.name}</Text>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item.id, item.name)}>
                <Text style={styles.unblockText}>차단 해제</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>차단한 사용자가 없습니다</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 16, color: '#4CAF50' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#777' },
  name: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  unblockBtn: { borderWidth: 1, borderColor: '#DDD', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  unblockText: { fontSize: 13, color: '#555', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#AAA', marginTop: 40, fontSize: 14 },
});
