import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const allAgreed = agreeTerms && agreePrivacy && agreeAge;

  const toggleAll = () => {
    const next = !allAgreed;
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeAge(next);
  };

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !passwordConfirm) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (!allAgreed) {
      Alert.alert('약관 동의', '필수 약관에 모두 동의해주세요.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, { agreeTerms, agreePrivacy, agreeAge });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? '회원가입에 실패했습니다.';
      Alert.alert('회원가입 실패', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>같이달려와 함께 시작해보세요!</Text>

        <TextInput
          style={styles.input}
          placeholder="이름 (닉네임)"
          placeholderTextColor="#AAA"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#AAA"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (6자 이상)"
          placeholderTextColor="#AAA"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          placeholderTextColor="#AAA"
          secureTextEntry
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
        />

        <View style={styles.agreeBox}>
          <TouchableOpacity style={styles.agreeAllRow} onPress={toggleAll}>
            <Text style={[styles.checkbox, allAgreed && styles.checkboxOn]}>{allAgreed ? '✓' : ''}</Text>
            <Text style={styles.agreeAllText}>전체 동의</Text>
          </TouchableOpacity>
          <View style={styles.agreeDivider} />
          <AgreeRow label="[필수] 서비스 이용약관 동의" checked={agreeTerms} onToggle={() => setAgreeTerms((v) => !v)}
            onView={() => navigation.navigate('Legal', { doc: 'terms' })} />
          <AgreeRow label="[필수] 개인정보 수집·이용 동의" checked={agreePrivacy} onToggle={() => setAgreePrivacy((v) => !v)}
            onView={() => navigation.navigate('Legal', { doc: 'privacy' })} />
          <AgreeRow label="[필수] 만 14세 이상입니다" checked={agreeAge} onToggle={() => setAgreeAge((v) => !v)} />
        </View>

        <TouchableOpacity
          style={[styles.signupBtn, (loading || !allAgreed) && styles.signupBtnDisabled]}
          onPress={handleSignup}
          disabled={loading || !allAgreed}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.signupBtnText}>가입하기</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AgreeRow({ label, checked, onToggle, onView }: {
  label: string; checked: boolean; onToggle: () => void; onView?: () => void;
}) {
  return (
    <View style={styles.agreeRow}>
      <TouchableOpacity style={styles.agreeToggle} onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }}>
        <Text style={[styles.checkbox, checked && styles.checkboxOn]}>{checked ? '✓' : ''}</Text>
        <Text style={styles.agreeText}>{label}</Text>
      </TouchableOpacity>
      {onView && (
        <TouchableOpacity onPress={onView} hitSlop={8}>
          <Text style={styles.agreeView}>보기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 16, color: '#4CAF50' },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#999', marginBottom: 36 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  signupBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupBtnDisabled: { opacity: 0.6 },
  agreeBox: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 12, backgroundColor: '#FAFAFA' },
  agreeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agreeAllText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  agreeDivider: { height: 1, backgroundColor: '#ECECEC', marginVertical: 12 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  agreeToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  agreeText: { fontSize: 14, color: '#444' },
  agreeView: { fontSize: 13, color: '#999', textDecorationLine: 'underline' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CCC', textAlign: 'center', lineHeight: 19, fontSize: 14, color: '#FFFFFF', overflow: 'hidden' },
  checkboxOn: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  signupBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
