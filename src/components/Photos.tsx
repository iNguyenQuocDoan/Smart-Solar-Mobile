import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { PickedImage } from '@/lib/api/files'
import type { SignedFileUrl } from '@/lib/api/types'
import { Button, IconButton } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

// Chụp hoặc chọn ảnh hiện trường rồi xem lại theo lưới. Ảnh nén còn ~70% chất lượng để tải nhanh bằng mạng di động

const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 }
export const MAX_PICK = 10

/** Mảng rỗng khi người dùng huỷ. Chưa cho quyền máy ảnh / thư viện thì ném lỗi có câu tiếng Việt */
export async function pickPhotos(source: 'camera' | 'library'): Promise<PickedImage[]> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted)
    throw new Error(
      source === 'camera'
        ? 'Ứng dụng chưa được dùng máy ảnh. Bật quyền Máy ảnh cho Smart Solar trong Cài đặt.'
        : 'Ứng dụng chưa được xem ảnh. Bật quyền Ảnh cho Smart Solar trong Cài đặt.',
    )
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(OPTIONS)
      : await ImagePicker.launchImageLibraryAsync({
          ...OPTIONS,
          allowsMultipleSelection: true,
          selectionLimit: MAX_PICK,
        })
  if (result.canceled) return []
  return result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName }))
}

export function PhotoButtons({
  disabled,
  onPick,
}: {
  disabled?: boolean
  onPick: (source: 'camera' | 'library') => void
}) {
  return (
    <View style={styles.buttons}>
      <Button label="Chụp ảnh" icon="camera-outline" compact disabled={disabled} onPress={() => onPick('camera')} />
      <Button
        label="Chọn ảnh"
        icon="images-outline"
        variant="secondary"
        compact
        disabled={disabled}
        onPress={() => onPick('library')}
      />
    </View>
  )
}

export type PhotoItem = { id: string; label: string; fetchUrl: () => Promise<SignedFileUrl> }

/** Lưới ảnh đã tải lên; chạm ảnh để mở cỡ lớn */
export function PhotoGrid({
  items,
  onRemove,
  removingId,
}: {
  items: PhotoItem[]
  onRemove?: (id: string) => void
  removingId?: string | null
}) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <PhotoTile key={item.id} item={item} onRemove={onRemove} removing={removingId === item.id} />
      ))}
    </View>
  )
}

function PhotoTile({
  item,
  onRemove,
  removing,
}: {
  item: PhotoItem
  onRemove?: (id: string) => void
  removing: boolean
}) {
  const theme = useAppTheme()
  // Link xem ký sẵn hết hạn sau vài phút nên không giữ quá lâu
  const url = useQuery({ queryKey: ['photo-url', item.id], queryFn: item.fetchUrl, staleTime: 4 * 60_000 })
  const [broken, setBroken] = useState(false)
  return (
    <View style={styles.tile}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Ảnh ${item.label}`}
        disabled={!url.data}
        onPress={() => url.data && void Linking.openURL(url.data.url)}
        style={[styles.frame, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
      >
        {url.isError || broken ? (
          <Text style={[styles.caption, { color: theme.textMuted }]}>Không mở được ảnh</Text>
        ) : (
          // Vòng quay nằm dưới ảnh: ảnh lớn tải chậm thì vẫn thấy đang tải
          <ActivityIndicator color={theme.brand} />
        )}
        {url.data && !broken ? (
          <Image
            source={{ uri: url.data.url }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setBroken(true)}
          />
        ) : null}
      </Pressable>
      <View style={styles.tileFooter}>
        <Text numberOfLines={1} style={[styles.caption, styles.label, { color: theme.text }]}>
          {item.label}
        </Text>
        {onRemove ? (
          removing ? (
            <ActivityIndicator color={theme.danger} size="small" />
          ) : (
            <IconButton label={`Xoá ảnh ${item.label}`} icon="trash-outline" onPress={() => onRemove(item.id)} />
          )
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%' },
  frame: {
    aspectRatio: 1,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  tileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { flex: 1, fontWeight: '600' },
})
