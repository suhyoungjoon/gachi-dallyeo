import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { TERMS_TITLE, TERMS_OF_SERVICE, PRIVACY_TITLE, PRIVACY_POLICY } from '../constants/legal';

// 로그인 전(회원가입)과 로그인 후(프로필 설정) 양쪽 스택에서 함께 쓰는 화면
type LegalRoute = RouteProp<{ Legal: { doc: 'terms' | 'privacy' } }, 'Legal'>;

export default function LegalScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<LegalRoute>();
  const insets = useSafeAreaInsets();
  const isTerms = params.doc === 'terms';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isTerms ? TERMS_TITLE : PRIVACY_TITLE}</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.text}>{isTerms ? TERMS_OF_SERVICE : PRIVACY_POLICY}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 16, color: '#4CAF50' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  body: { padding: 20 },
  text: { fontSize: 14, color: '#333', lineHeight: 22 },
});
