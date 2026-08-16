import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, EmptyState, ErrorState, Input, LoadingSkeleton } from '@/components/ui';
import {
  useInviteUser,
  useOrgUsers,
  usePermissions,
  useSetUserRole,
  useSetUserStatus,
} from '@/features/settings';
import { roleLabel, userStatusLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/date';
import type { UserRole } from '@rentaflow/shared';
import { colors, radius, spacing, typography } from '@/theme';

const ASSIGNABLE: UserRole[] = ['admin', 'manager', 'staff', 'viewer'];

export default function UsersSettingsScreen() {
  const { can } = usePermissions();
  const users = useOrgUsers();
  const invite = useInviteUser();
  const setStatus = useSetUserStatus();
  const setRole = useSetUserRole();

  const [showInvite, setShowInvite] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setInviteRole] = useState<UserRole>('staff');

  if (!can('users.view')) {
    return (
      <View style={styles.screen}>
        <ErrorState message="Bu işlem için yetkiniz bulunmuyor." />
      </View>
    );
  }

  if (users.isLoading) return <LoadingSkeleton />;
  if (users.isError) {
    return (
      <ErrorState
        message="Kullanıcılar yüklenemedi."
        onRetry={() => void users.refetch()}
      />
    );
  }

  const submitInvite = () => {
    void invite
      .mutateAsync({ email, fullName, role })
      .then((res) => {
        setShowInvite(false);
        setFullName('');
        setEmail('');
        Alert.alert(
          'Davet oluşturuldu',
          `Davet kaydı hazır (${res.email}). E-posta gönderimi için Supabase Auth Invite / Edge Function yapılandırması gerekir. Token güvenli şekilde paylaşılmalıdır.`,
        );
      })
      .catch((e: unknown) =>
        Alert.alert('Hata', getErrorMessage(e, 'Davet gönderilemedi.')),
      );
  };

  return (
    <View style={styles.screen}>
      {can('users.invite') ? (
        <Button
          title="Kullanıcı Davet Et"
          onPress={() => setShowInvite(true)}
          style={styles.inviteBtn}
        />
      ) : null}

      <FlatList
        data={users.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="Henüz kullanıcı yok." description="Ekip üyesi davet edin." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name || '—'}</Text>
            <Text style={styles.meta}>{item.email || 'E-posta yok'}</Text>
            <Text style={styles.meta}>
              {roleLabel(item.role)} · {userStatusLabel(item.status)}
            </Text>
            <Text style={styles.meta}>
              Son giriş:{' '}
              {item.last_sign_in_at
                ? formatDate(item.last_sign_in_at.slice(0, 10))
                : '—'}
            </Text>
            <View style={styles.actions}>
              {can('users.suspend') && item.status === 'ACTIVE' ? (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      'Pasifleştir',
                      'Bu kullanıcı organizasyon verilerine erişemez.',
                      [
                        { text: 'İptal', style: 'cancel' },
                        {
                          text: 'Pasifleştir',
                          style: 'destructive',
                          onPress: () =>
                            void setStatus
                              .mutateAsync({
                                userId: item.id,
                                status: 'SUSPENDED',
                              })
                              .catch((e: unknown) =>
                                Alert.alert(
                                  'Hata',
                                  getErrorMessage(e, 'İşlem başarısız.'),
                                ),
                              ),
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.danger}>Pasifleştir</Text>
                </Pressable>
              ) : null}
              {can('users.suspend') && item.status === 'SUSPENDED' ? (
                <Pressable
                  onPress={() =>
                    void setStatus
                      .mutateAsync({ userId: item.id, status: 'ACTIVE' })
                      .catch((e: unknown) =>
                        Alert.alert('Hata', getErrorMessage(e, 'İşlem başarısız.')),
                      )
                  }
                >
                  <Text style={styles.link}>Aktifleştir</Text>
                </Pressable>
              ) : null}
              {can('users.invite') ? (
                <Pressable
                  onPress={() => {
                    const buttons = ASSIGNABLE.map((r) => ({
                      text: roleLabel(r),
                      onPress: () =>
                        void setRole
                          .mutateAsync({ userId: item.id, role: r })
                          .catch((e: unknown) =>
                            Alert.alert(
                              'Hata',
                              getErrorMessage(e, 'Rol güncellenemedi.'),
                            ),
                          ),
                    }));
                    Alert.alert('Rol değiştir', 'Yeni rol seçin', [
                      ...buttons,
                      { text: 'İptal', style: 'cancel' },
                    ]);
                  }}
                >
                  <Text style={styles.link}>Rol</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      />

      <Modal visible={showInvite} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Kullanıcı Davet Et</Text>
            <Input label="Ad Soyad" value={fullName} onChangeText={setFullName} />
            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.roleLabel}>Rol: {roleLabel(role)}</Text>
            <View style={styles.roleRow}>
              {ASSIGNABLE.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setInviteRole(r)}
                  style={[styles.chip, role === r && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, role === r && styles.chipTextActive]}
                  >
                    {roleLabel(r)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Button
              title="Davet Gönder"
              onPress={submitInvite}
              loading={invite.isPending}
            />
            <Button
              title="İptal"
              variant="ghost"
              onPress={() => setShowInvite(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  inviteBtn: { margin: spacing.lg, marginBottom: 0 },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    marginBottom: spacing.md,
  },
  name: { ...typography.subtitle, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  link: { ...typography.label, color: colors.primary },
  danger: { ...typography.label, color: colors.danger },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { ...typography.title, color: colors.text },
  roleLabel: { ...typography.label, color: colors.textMuted },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  chipTextActive: { color: colors.primary, fontFamily: 'DMSans_600SemiBold' },
});
