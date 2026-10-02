import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { REPORT_REASONS, ReportTargetType, reportContent } from '../api/reports';

interface Props {
  target: { type: ReportTargetType; id: string } | null;
  onClose: () => void;
  onReported: (target: { type: ReportTargetType; id: string }) => void;
}

const TARGET_LABEL: Record<ReportTargetType, string> = { post: '게시글', comment: '댓글', user: '사용자' };

export default function ReportModal({ target, onClose, onReported }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target) { setReason(null); setDetail(''); }
  }, [target]);

  const handleSubmit = async () => {
    if (!target || !reason) return;
    setSubmitting(true);
    try {
      const message = await reportContent(target.type, target.id, reason, detail.trim() || undefined);
      onReported(target);
      onClose();
      Alert.alert('신고 완료', message);
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.message ?? '신고에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.title}>{target ? TARGET_LABEL[target.type] : ''} 신고</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>신고 사유를 선택해주세요. 신고한 콘텐츠는 바로 숨겨지며, 24시간 이내에 검토합니다.</Text>
          {REPORT_REASONS.map((r) => (
            <TouchableOpacity key={r} style={styles.reasonRow} onPress={() => setReason(r)}>
              <View style={[styles.radio, reason === r && styles.radioOn]} />
              <Text style={styles.reasonText}>{r}</Text>
            </TouchableOpacity>
          ))}
          {reason === '기타' && (
            <TextInput
              style={styles.input}
              placeholder="자세한 내용을 적어주세요 (선택)"
              placeholderTextColor="#AAA"
              value={detail}
              onChangeText={setDetail}
              multiline
              maxLength={500}
            />
          )}
          <TouchableOpacity style={[styles.submit, (!reason || submitting) && styles.submitDisabled]}
            onPress={handleSubmit} disabled={!reason || submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>신고하기</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  box: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  close: { fontSize: 18, color: '#888' },
  subtitle: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 12 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CCC' },
  radioOn: { borderColor: '#FF3B30', borderWidth: 6 },
  reasonText: { fontSize: 15, color: '#333' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 70, color: '#1A1A1A', marginTop: 6, textAlignVertical: 'top' },
  submit: { backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
