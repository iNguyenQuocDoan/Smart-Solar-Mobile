import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useProduct } from '@/hooks/queries'
import { formatMoney } from '@/lib/format'
import { formatPower, productImages, productTypeLabel, specEntries } from '@/lib/product'
import {
  BackButton,
  KeyValue,
  PageHeader,
  Panel,
  QueryState,
  SCREEN_PADDING,
  Screen,
  SectionTitle,
} from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function ProductDetailScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const query = useProduct(id ?? '')
  const product = query.data
  // Mở trang thì hiện ảnh chính, bấm ảnh nhỏ để xem ảnh khác
  const [selected, setSelected] = useState<string | null>(null)
  const images = product ? productImages(product) : []
  const current = images.find((image) => image.url === selected) ?? images.find((image) => image.isPrimary) ?? images[0]
  const specs = product ? specEntries(product.spec) : []
  const typeLabel = productTypeLabel(product?.productType)
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <BackButton onPress={() => router.back()} />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {product ? (
        <>
          <View style={[styles.hero, { backgroundColor: theme.surfaceMuted }]}>
            {current?.url ? (
              <Image
                source={{ uri: current.url }}
                accessibilityLabel={current.altText || product.name || undefined}
                style={styles.heroImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
          {images.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
              {images.map((image, index) => {
                const active = image === current
                return (
                  <Pressable
                    key={image.id ?? image.url}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem ảnh ${index + 1}${image.altText ? `: ${image.altText}` : ''}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelected(image.url ?? null)}
                    style={[
                      styles.thumb,
                      { backgroundColor: theme.surfaceMuted, borderColor: active ? theme.brand : theme.border },
                    ]}
                  >
                    <Image source={{ uri: image.url ?? '' }} style={styles.thumbImage} resizeMode="contain" />
                  </Pressable>
                )
              })}
            </ScrollView>
          ) : null}
          <View style={styles.heading}>
            <PageHeader
              title={product.name || 'Sản phẩm chưa đặt tên'}
              description={[typeLabel, product.sku].filter(Boolean).join(', ')}
            />
            <Text style={[styles.price, { color: theme.text }]}>{formatMoney(product.unitPrice)}</Text>
          </View>
          <Panel>
            <SectionTitle>Thông số chính</SectionTitle>
            <KeyValue label="Hãng" value={product.brand || '—'} />
            <KeyValue label="Model" value={product.model || '—'} />
            <KeyValue label="Công suất" value={product.ratedPowerW == null ? '—' : formatPower(product.ratedPowerW)} />
            <KeyValue
              label="Kích thước"
              value={product.widthMm && product.heightMm ? `${product.widthMm} × ${product.heightMm} mm` : '—'}
            />
            <KeyValue label="Bảo hành" value={product.warrantyMonth == null ? '—' : `${product.warrantyMonth} tháng`} />
            <KeyValue label="Đơn vị" value={product.unit || '—'} />
          </Panel>
          {specs.length > 0 ? (
            <Panel>
              <SectionTitle>Thông số kỹ thuật</SectionTitle>
              {specs.map((spec) => (
                <KeyValue key={spec.label} label={spec.label} value={spec.value} />
              ))}
            </Panel>
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { height: 220, marginHorizontal: -SCREEN_PADDING, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  thumbs: { gap: 6 },
  thumb: { width: 52, height: 52, borderWidth: 2, borderRadius: 6, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  heading: { gap: 2 },
  price: { fontSize: 18, lineHeight: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
})
