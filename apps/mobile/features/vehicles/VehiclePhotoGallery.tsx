import { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { VehiclePhoto } from '@rentaflow/shared';
import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

type Props = {
  photos: VehiclePhoto[];
  uploading?: boolean;
  onAdd: () => void;
  onDelete: (photo: VehiclePhoto) => void;
  onSetPrimary: (photoId: string) => void;
};

const width = Dimensions.get('window').width;

export function VehiclePhotoGallery({
  photos,
  uploading,
  onAdd,
  onDelete,
  onSetPrimary,
}: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const listRef = useRef<FlatList>(null);

  const confirmDelete = (photo: VehiclePhoto) => {
    Alert.alert('Fotoğrafı Sil', 'Bu fotoğrafı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => onDelete(photo),
      },
    ]);
  };

  return (
    <View>
      <FlatList
        horizontal
        data={photos}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz fotoğraf yok</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => setViewerIndex(index)}
            style={styles.thumbWrap}
          >
            <Image source={{ uri: item.public_url ?? undefined }} style={styles.thumb} />
            {item.is_primary ? (
              <View style={styles.primaryTag}>
                <Text style={styles.primaryText}>Ana</Text>
              </View>
            ) : null}
          </Pressable>
        )}
        contentContainerStyle={styles.list}
      />
      <Button
        title={uploading ? 'Yükleniyor...' : 'Fotoğraf Ekle'}
        loading={uploading}
        variant="secondary"
        onPress={onAdd}
        style={styles.addBtn}
      />

      <Modal visible={viewerIndex !== null} transparent animationType="fade">
        <View style={styles.viewer}>
          <FlatList
            ref={listRef}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex ?? 0}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            data={photos}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={(
              e: NativeSyntheticEvent<NativeScrollEvent>,
            ) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setViewerIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={{ width }}>
                <Image
                  source={{ uri: item.public_url ?? undefined }}
                  style={styles.full}
                  resizeMode="contain"
                />
              </View>
            )}
          />
          <View style={styles.viewerActions}>
            <Button title="Kapat" variant="ghost" onPress={() => setViewerIndex(null)} />
            {viewerIndex !== null && photos[viewerIndex] ? (
              <>
                {!photos[viewerIndex].is_primary ? (
                  <Button
                    title="Ana Fotoğraf Yap"
                    variant="secondary"
                    onPress={() => onSetPrimary(photos[viewerIndex].id)}
                  />
                ) : null}
                <Button
                  title="Sil"
                  variant="danger"
                  onPress={() => confirmDelete(photos[viewerIndex])}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingVertical: spacing.sm },
  thumbWrap: { marginRight: spacing.sm },
  thumb: {
    width: 140,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  primaryTag: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryText: { ...typography.caption, color: colors.textInverse },
  empty: {
    width: width - 48,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { ...typography.caption, color: colors.textMuted },
  addBtn: { marginTop: spacing.sm },
  viewer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  full: { width, height: '70%' },
  viewerActions: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: '#111',
  },
});
