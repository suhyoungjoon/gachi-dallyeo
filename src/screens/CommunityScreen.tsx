import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPosts } from '../api/posts';
import { getGroups, createGroup, joinGroupByCode, Group } from '../api/groups';
import { RootStackParamList } from '../../App';

const POST_CATEGORIES = ['전체', '후기', '질문', '모임', '장비'];
const CATEGORY_COLORS: Record<string, string> = {
  후기: '#4CAF50', 질문: '#2196F3', 모임: '#FF9800', 장비: '#9C27B0',
};

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
  _count: { comments: number; likes: number };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function CommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [mainTab, setMainTab] = useState<'전체' | '소모임'>('전체');

  // 전체 커뮤니티 state
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // 소모임 state
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsRefreshing, setGroupsRefreshing] = useState(false);

  // 그룹 만들기 모달
  const [createModal, setCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPublic, setGroupPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  // 초대코드 입력 모달
  const [codeModal, setCodeModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadPosts = useCallback((cat: string) => {
    setPostsLoading(true);
    getPosts(cat === '전체' ? undefined : cat)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, []);

  const loadGroups = useCallback((refreshing = false) => {
    if (refreshing) setGroupsRefreshing(true);
    else setGroupsLoading(true);
    getGroups()
      .then(({ myGroups: mg, publicGroups: pg }) => {
        setMyGroups(mg);
        setPublicGroups(pg);
      })
      .catch(() => {})
      .finally(() => {
        setGroupsLoading(false);
        setGroupsRefreshing(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts(selectedCategory);
      loadGroups();
    }, [loadPosts, loadGroups, selectedCategory])
  );

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    loadPosts(cat);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { Alert.alert('알림', '그룹 이름을 입력해주세요.'); return; }
    setCreating(true);
    try {
      await createGroup({ name: groupName.trim(), description: groupDesc.trim() || undefined, isPublic: groupPublic });
      setCreateModal(false);
      setGroupName(''); setGroupDesc(''); setGroupPublic(true);
      loadGroups();
    } catch {
      Alert.alert('오류', '그룹 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) { Alert.alert('알림', '초대코드를 입력해주세요.'); return; }
    setJoining(true);
    try {
      const { group } = await joinGroupByCode(inviteCode.trim());
      setCodeModal(false);
      setInviteCode('');
      Alert.alert('참여 완료', `${group.name}에 참여했습니다!`, [
        { text: '확인', onPress: () => { loadGroups(); navigation.navigate('GroupHome', { groupId: group.id }); } },
      ]);
    } catch {
      Alert.alert('오류', '유효하지 않은 초대코드입니다.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>커뮤니티</Text>
        {mainTab === '전체' ? (
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('WritePost')}>
            <Text style={styles.actionButtonText}>글쓰기</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButtonOutline} onPress={() => setCodeModal(true)}>
              <Text style={styles.actionButtonOutlineText}>코드 입력</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setCreateModal(true)}>
              <Text style={styles.actionButtonText}>만들기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 메인 탭 */}
      <View style={styles.mainTabBar}>
        {(['전체', '소모임'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.mainTab, mainTab === tab && styles.mainTabActive]}
            onPress={() => setMainTab(tab)}
          >
            <Text style={[styles.mainTabText, mainTab === tab && styles.mainTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mainTab === '전체' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={styles.categoryContent}>
            {POST_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                onPress={() => handleCategorySelect(cat)}
              >
                <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {postsLoading ? (
            <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {posts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📝</Text>
                  <Text style={styles.emptyTitle}>게시글이 없어요</Text>
                  <Text style={styles.emptyDesc}>첫 번째 글을 작성해보세요!</Text>
                </View>
              ) : (
                posts.map((post) => (
                  <TouchableOpacity key={post.id} style={styles.postCard} onPress={() => navigation.navigate('PostDetail', { postId: post.id })}>
                    <View style={styles.postTop}>
                      <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[post.category] ?? '#888') + '20' }]}>
                        <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[post.category] ?? '#888' }]}>{post.category}</Text>
                      </View>
                      <Text style={styles.postDate}>{timeAgo(post.createdAt)}</Text>
                    </View>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <View style={styles.postBottom}>
                      <Text style={styles.postAuthor}>{post.user.name}</Text>
                      <View style={styles.postMeta}>
                        <Text style={styles.postMetaText}>👍 {post._count.likes}</Text>
                        <Text style={styles.postMetaText}>💬 {post._count.comments}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </>
      ) : (
        /* 소모임 탭 */
        groupsLoading ? (
          <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={groupsRefreshing} onRefresh={() => loadGroups(true)} tintColor="#4CAF50" />}
          >
            {myGroups.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>내 소모임</Text>
                {myGroups.map((g) => (
                  <GroupCard key={g.id} group={g} onPress={() => navigation.navigate('GroupHome', { groupId: g.id })} mine />
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>공개 소모임</Text>
            {publicGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏃</Text>
                <Text style={styles.emptyTitle}>공개 소모임이 없어요</Text>
                <Text style={styles.emptyDesc}>새로운 소모임을 만들어보세요!</Text>
              </View>
            ) : (
              publicGroups.map((g) => (
                <GroupCard key={g.id} group={g} onPress={() => navigation.navigate('GroupHome', { groupId: g.id })} />
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        )
      )}

      {/* 그룹 만들기 모달 */}
      <Modal visible={createModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setCreateModal(false); setGroupName(''); setGroupDesc(''); }}>
              <Text style={styles.modalCancel}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>소모임 만들기</Text>
            <TouchableOpacity onPress={handleCreateGroup} disabled={creating}>
              {creating ? <ActivityIndicator color="#4CAF50" /> : <Text style={styles.modalSubmit}>완료</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>모임 이름 *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: 한강 새벽 러닝 모임"
              placeholderTextColor="#AAA"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />
            <Text style={styles.inputLabel}>소개</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 90 }]}
              placeholder="모임을 소개해주세요"
              placeholderTextColor="#AAA"
              value={groupDesc}
              onChangeText={setGroupDesc}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={styles.inputLabel}>공개 설정</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleChip, groupPublic && styles.toggleChipActive]}
                onPress={() => setGroupPublic(true)}
              >
                <Text style={[styles.toggleChipText, groupPublic && styles.toggleChipTextActive]}>공개</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChip, !groupPublic && styles.toggleChipActive]}
                onPress={() => setGroupPublic(false)}
              >
                <Text style={[styles.toggleChipText, !groupPublic && styles.toggleChipTextActive]}>비공개</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.toggleHint}>{groupPublic ? '누구나 바로 참여할 수 있어요.' : '초대코드로만 참여할 수 있어요.'}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* 초대코드 입력 모달 */}
      <Modal visible={codeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setCodeModal(false); setInviteCode(''); }}>
              <Text style={styles.modalCancel}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>초대코드로 참여</Text>
            <TouchableOpacity onPress={handleJoinByCode} disabled={joining}>
              {joining ? <ActivityIndicator color="#4CAF50" /> : <Text style={styles.modalSubmit}>참여</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>초대코드</Text>
            <TextInput
              style={styles.textInput}
              placeholder="초대코드를 입력해주세요"
              placeholderTextColor="#AAA"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GroupCard({ group, onPress, mine }: { group: Group; onPress: () => void; mine?: boolean }) {
  const role = mine ? group.members?.[0]?.role : undefined;
  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress}>
      <View style={styles.groupCardLeft}>
        <View style={styles.groupAvatar}>
          <Text style={styles.groupAvatarText}>{group.name[0]}</Text>
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupNameRow}>
            <Text style={styles.groupName}>{group.name}</Text>
            {!group.isPublic && <Text style={styles.privateBadge}>🔒</Text>}
            {role === 'admin' && <Text style={styles.adminBadge}>관리자</Text>}
          </View>
          {group.description ? <Text style={styles.groupDesc} numberOfLines={1}>{group.description}</Text> : null}
          <Text style={styles.groupMeta}>멤버 {group._count.members}명</Text>
        </View>
      </View>
      <Text style={styles.groupArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionButton: { backgroundColor: '#4CAF50', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  actionButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  actionButtonOutline: { borderWidth: 1, borderColor: '#4CAF50', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  actionButtonOutlineText: { color: '#4CAF50', fontWeight: '600', fontSize: 13 },
  mainTabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  mainTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mainTabActive: { borderBottomColor: '#4CAF50' },
  mainTabText: { fontSize: 15, fontWeight: '500', color: '#AAA' },
  mainTabTextActive: { color: '#4CAF50', fontWeight: '700' },
  categoryBar: { backgroundColor: '#FFFFFF', maxHeight: 52 },
  categoryContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0' },
  categoryChipActive: { backgroundColor: '#4CAF50' },
  categoryChipText: { fontSize: 13, fontWeight: '500', color: '#666' },
  categoryChipTextActive: { color: '#FFFFFF' },
  postCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  postTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 12, fontWeight: '600' },
  postDate: { fontSize: 12, color: '#AAA' },
  postTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  postBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAuthor: { fontSize: 13, color: '#888' },
  postMeta: { flexDirection: 'row', gap: 12 },
  postMetaText: { fontSize: 13, color: '#888' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', marginHorizontal: 16, marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  groupCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  groupAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  groupAvatarText: { fontSize: 20, fontWeight: '700', color: '#4CAF50' },
  groupInfo: { flex: 1 },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  groupName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  privateBadge: { fontSize: 12 },
  adminBadge: { fontSize: 11, fontWeight: '600', color: '#4CAF50', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  groupDesc: { fontSize: 13, color: '#888', marginBottom: 4 },
  groupMeta: { fontSize: 12, color: '#AAA' },
  groupArrow: { fontSize: 22, color: '#CCC', marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#999' },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalCancel: { fontSize: 16, color: '#666' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalSubmit: { fontSize: 16, fontWeight: '700', color: '#4CAF50' },
  modalBody: { paddingHorizontal: 16, paddingTop: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, marginTop: 16 },
  textInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F0F0F0' },
  toggleChipActive: { backgroundColor: '#4CAF50' },
  toggleChipText: { fontSize: 14, fontWeight: '600', color: '#666' },
  toggleChipTextActive: { color: '#FFFFFF' },
  toggleHint: { fontSize: 12, color: '#AAA', marginTop: 8 },
});
