import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image, StyleSheet, Text, View } from 'react-native'
import { useProduct } from '@/hooks/queries'
import { formatMoney } from '@/lib/format'
import { Badge, IconButton, KeyValue, PageHeader, Panel, QueryState, Screen } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function ProductDetailScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const query = useProduct(id ?? '')
  const product = query.data
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={styles.backRow}><IconButton label="Quay lại" icon="arrow-back" onPress={() => router.back()} /></View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {product ? (
        <>
          <View style={[styles.hero, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
            {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="contain" /> : <Ionicons name="hardware-chip-outline" size={58} color={theme.textSubtle} />}
          </View>
          <PageHeader eyebrow={product.brand ?? 'Sản phẩm'} title={product.name || 'Sản phẩm chưa đặt tên'} description={[product.model, product.sku].filter(Boolean).join(' · ')} />
          <View style={styles.summary}>
            <Text style={[styles.price, { color: theme.text }]}>{formatMoney(product.unitPrice)}</Text>
            {product.productType ? <Badge>{product.productType.replaceAll('_', ' ')}</Badge> : null}
          </View>
          <Panel>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Thông số chính</Text>
            <KeyValue label="Hãng" value={product.brand || '—'} />
            <KeyValue label="Model" value={product.model || '—'} />
            <KeyValue label="Công suất" value={product.ratedPowerW == null ? '—' : `${product.ratedPowerW} W`} />
            <KeyValue label="Kích thước" value={product.widthMm && product.heightMm ? `${product.widthMm} × ${product.heightMm} mm` : '—'} />
            <KeyValue label="Bảo hành" value={product.warrantyMonth == null ? '—' : `${product.warrantyMonth} tháng`} />
            <KeyValue label="Đơn vị" value={product.unit || '—'} />
          </Panel>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  backRow: { marginLeft: -8 },
  hero: { height: 240, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  price: { fontSize: 24, lineHeight: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
})
