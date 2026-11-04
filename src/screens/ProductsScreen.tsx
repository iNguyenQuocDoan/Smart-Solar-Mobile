import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useState } from 'react'
import { useProducts } from '@/hooks/queries'
import { formatMoney } from '@/lib/format'
import { formatPower, primaryImageUrl } from '@/lib/product'
import type { Product } from '@/lib/api/types'
import { ListRow, PageHeader, QueryState, Screen, StateView } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

/** Ảnh chính thu nhỏ; chưa có ảnh thì giữ ô xám */
function ProductThumb({ product }: { product: Product }) {
  const theme = useAppTheme()
  const image = primaryImageUrl(product)
  return (
    <View style={[styles.imageBox, { backgroundColor: theme.surfaceMuted }]}>
      {image ? <Image source={{ uri: image }} style={styles.image} resizeMode="contain" /> : null}
    </View>
  )
}

export function ProductsScreen({ role }: { role: 'customer' | 'tech' }) {
  const theme = useAppTheme()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const query = useProducts(search.trim())
  const items = query.data?.items ?? []

  function open(product: Product) {
    if (!product.id) return
    router.push({ pathname: `/${role}/product/[id]`, params: { id: product.id } } as Href)
  }

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader title="Sản phẩm" />
      <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={20} color={theme.textMuted} />
        <TextInput
          accessibilityLabel="Tìm sản phẩm"
          placeholder="Tên, hãng hoặc model"
          placeholderTextColor={theme.textSubtle}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.text }]}
        />
        {search ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xoá từ khoá"
            onPress={() => setSearch('')}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={21} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {!query.isPending && !query.error && items.length === 0 ? (
        <StateView title="Không tìm thấy sản phẩm" description="Thử tên hãng, model hoặc từ khoá khác." />
      ) : (
        <View>
          {items.map((product, index) => (
            <ListRow
              key={product.id ?? product.sku ?? index}
              accessibilityLabel={`Xem ${product.name ?? 'sản phẩm'}`}
              onPress={() => open(product)}
              last={index === items.length - 1}
            >
              <ProductThumb product={product} />
              <View style={styles.copy}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
                  {product.name || 'Sản phẩm chưa đặt tên'}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
                  {[product.brand, product.model].filter(Boolean).join(', ') || product.sku || '—'}
                </Text>
                <View style={styles.specs}>
                  {product.ratedPowerW != null ? (
                    <Text style={[styles.spec, { color: theme.brandText }]}>{formatPower(product.ratedPowerW)}</Text>
                  ) : null}
                  <Text style={[styles.price, { color: theme.text }]}>{formatMoney(product.unitPrice)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
            </ListRow>
          ))}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, minHeight: 42, fontSize: 15, lineHeight: 20, paddingVertical: 0 },
  imageBox: { width: 52, height: 52, borderRadius: 4, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  copy: { flex: 1, gap: 1 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
  specs: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  spec: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  price: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
})
