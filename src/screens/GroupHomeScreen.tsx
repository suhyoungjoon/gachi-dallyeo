import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Share, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { getGroupDetail, getGroupPosts, joinGroup, leaveGroup, GroupDetail } from '../api/groups';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../hooks/useRunningTracker';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupHome'>;

type Tab = '활동' | '게시판' | '멤버';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function GroupHomeScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<GroupDetail | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('활동');
  const [writeModal, setWriteModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('공지');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, boardData] = await Promise.all([
        getGroupDetail(groupId),
        getGroupPosts(groupId).catch(() => ({ posts: [] })),
      ]);
      setData(detail);
      setPosts(boardData.posts);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [groupId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleJoin = async () => {
    try {
      await joinGroup(groupId);
      load();
    } catch {
      Alert.alert('오류', '참여에 실패했습니다.');
    }
  };

  const handleLeave = () => {
    Alert.alert('그룹 탈퇴', '정말 탈퇴하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴', style: 'destructive',
        onPress: async () => {
          try { await leaveGroup(groupId); navigation.goBack(); }
          catch { Alert.alert('오류', '탈퇴에 실패했습니다.'); }
        },
      },
    ]);
  };

  const handleShareInvite = async () => {
    if (!data) return;
    await Share.share({ message: `[같이달려] "${data.group.name}" 소모임 초대코드: ${data.group.inviteCode}` });
  };

  const handleWritePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      Alert.alert('알림', '제목과 내용을 입력해주세요.'); return;
    }
    setSubmitting(true);
    try {
      const { default: client } = await import('../api/client');
      await client.post('/api/posts', {
        title: postTitle.trim(),
        content: postContent.trim(),
        category: postCategory,
        groupId,
      });
      setWriteModal(false);
      setPostTitle(''); setPostContent(''); setPostCategory('공지');
      load();
    } catch {
      Alert.alert('오류', '게시글 작성에 실패했습니다.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4CAF50" size="large" /></View>;

  const { group, isMember, myRole, members, weeklyStats, recentRuns } = data ?? {};

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group?.name}</Text>
        {isMember && myRole === 'admin' ? (
          <TouchableOpacity onPress={handleShareInvite}>
            <Text style={styles.inviteBtn}>초대</Text>
          </TouchableOpacity>
        ) : isMember ? (
          <TouchableOpacity onPress={handleLeave}>
            <Text style={styles.leaveBtn}>탈퇴</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
            <Text style={styles.joinBtnText}>참여</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 이번 달 통계 */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{weeklyStats?.totalDistance ?? 0}km</Text>
          <Text style={styles.statLabel}>이번달 거리</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{weeklyStats?.totalRuns ?? 0}회</Text>
          <Text style={styles.statLabel}>러닝</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{weeklyStats?.activeMembers ?? 0}명</Text>
          <Text style={styles.statLabel}>활동 멤버</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{group?._count?.members ?? 0}명</Text>
          <Text style={styles.statLabel}>전체 멤버</Text>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        {(['활동', '게시판', '멤버'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabItem, tab === t && styles.tabItemActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
      >
        {/* 활동 탭 */}
        {tab === '활동' && (
          recentRuns?.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>아직 달리기 기록이 없어요</Text></View>
          ) : (
            recentRuns?.map((run: any) => (
              <View key={run.id} style={styles.runCard}>
                <View style={styles.runHeader}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{run.user.name[0]}</Text></View>
                  <View>
                    <Text style={styles.runUser}>{run.user.name}{run.userId === user?.id ? ' (나)' : ''}</Text>
                    <Text style={styles.runTime}>{timeAgo(run.createdAt)}</Text>
                  </View>
                </View>
                {run.course && <Text style={styles.runCourse}>📍 {run.course.name}</Text>}
                <View style={styles.runStats}>
                  <Text style={styles.runStat}>{run.distance.toFixed(2)}km</Text>
                  <Text style={styles.runStatDot}>·</Text>
                  <Text style={styles.runStat}>{formatDuration(run.duration)}</Text>
                  <Text style={styles.runStatDot}>·</Text>
                  <Text style={styles.runStat}>{run.pace}/km</Text>
                </View>
              </View>
            ))
          )
        )}

        {/* 게시판 탭 */}
        {tab === '게시판' && (
          <>
            {isMember && (
              <TouchableOpacity style={styles.writeBtn} onPress={() => setWriteModal(true)}>
                <Text style={styles.writeBtnText}>+ 글쓰기</Text>
              </TouchableOpacity>
            )}
            {posts.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyText}>아직 게시글이 없어요</Text></View>
            ) : (
              posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                >
                  <View style={styles.postMeta}>
                    <Text style={styles.postCategory}>{post.category}</Text>
                    <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                  </View>
                  <Text style={styles.postTitle} numberOfLines={1}>{post.title}</Text>
                  <View style={styles.postFooter}>
                    <Text style={styles.postAuthor}>{post.user.name}</Text>
                    <Text style={styles.postCounts}>💬 {post._count.comments} ❤️ {post._count.likes}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* 멤버 탭 */}
        {tab === '멤버' && (
          <>
            <Text style={styles.sectionLabel}>이번달 랭킹</Text>
            {members?.map((m, i) => (
              <View key={m.userId} style={[styles.memberRow, m.userId === user?.id && styles.memberRowMe]}>
                <Text style={[styles.rank, i < 3 && styles.rankTop]}>{i + 1}</Text>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {m.name}{m.userId === user?.id ? ' (나)' : ''}{m.role === 'admin' ? ' 👑' : ''}
                  </Text>
                  <Text style={styles.memberStats}>{m.distance}km · {m.runs}회</Text>
                </View>
                <Text style={styles.memberDist}>{m.distance.toFixed(1)}km</Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 글쓰기 모달 */}
      <Modal visible={writeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>소모임 게시글 작성</Text>
            <View style={styles.categoryRow}>
              {['공지', '일정', '자유'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryChip, postCategory === c && styles.categoryChipActive]}
                  onPress={() => setPostCategory(c)}
                >
                  <Text style={[styles.categoryChipText, postCategory === c && styles.categoryChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.modalInput} placeholder="제목" placeholderTextColor="#AAA" value={postTitle} onChangeText={setPostTitle} />
            <TextInput style={[styles.modalInput, { height: 100 }]} placeholder="내용" placeholderTextColor="#AAA" value={postContent} onChangeText={setPostContent} multiline textAlignVertical="top" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setWriteModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleWritePost} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>등록</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  backText: { fontSize: 16, color: '#4CAF50', minWidth: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginHorizontal: 8 },
  inviteBtn: { fontSize: 14, color: '#4CAF50', fontWeight: '600', minWidth: 40, textAlign: 'right' },
  leaveBtn: { fontSize: 14, color: '#FF3B30', fontWeight: '600', minWidth: 40, textAlign: 'right' },
  joinBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  joinBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  statsBar: { flexDirection: 'row', backgroundColor: '#4CAF50', paddingVertical: 16, paddingHorizontal: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#4CAF50' },
  tabText: { fontSize: 14, color: '#AAA', fontWeight: '600' },
  tabTextActive: { color: '#4CAF50' },
  body: { flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, color: '#AAA' },
  runCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  runHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  runUser: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  runTime: { fontSize: 12, color: '#AAA' },
  runCourse: { fontSize: 12, color: '#4CAF50', marginBottom: 6 },
  runStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  runStat: { fontSize: 14, fontWeight: '600', color: '#333' },
  runStatDot: { fontSize: 12, color: '#CCC' },
  writeBtn: { marginHorizontal: 16, marginTop: 12, borderWidth: 1.5, borderColor: '#4CAF50', borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center' },
  writeBtnText: { color: '#4CAF50', fontWeight: '600' },
  postCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  postCategory: { fontSize: 12, color: '#4CAF50', fontWeight: '700' },
  postTime: { fontSize: 12, color: '#AAA' },
  postTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  postAuthor: { fontSize: 12, color: '#888' },
  postCounts: { fontSize: 12, color: '#AAA' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 14 },
  memberRowMe: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#4CAF50' },
  rank: { fontSize: 16, fontWeight: '700', color: '#BBB', width: 28 },
  rankTop: { color: '#FF9800' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  memberStats: { fontSize: 12, color: '#888', marginTop: 2 },
  memberDist: { fontSize: 16, fontWeight: '700', color: '#4CAF50' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#DDD' },
  categoryChipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  categoryChipText: { fontSize: 13, color: '#888' },
  categoryChipTextActive: { color: '#FFF', fontWeight: '700' },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', marginBottom: 12, backgroundColor: '#FAFAFA' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalConfirm: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontWeight: '700' },
});
