import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useState } from 'react'
import { useProducts } from '@/hooks/queries'
import { formatMoney } from '@/lib/format'
import type { Product } from '@/lib/api/types'
import { PageHeader, QueryState, Screen, StateView } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

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
      <PageHeader eyebrow="Danh mục" title="Sản phẩm" description="Thiết bị đang được Smart Solar cung cấp." />
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
          <Pressable accessibilityRole="button" accessibilityLabel="Xoá từ khoá" onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={21} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {!query.isPending && !query.error && items.length === 0 ? (
        <StateView icon="search-outline" title="Không tìm thấy sản phẩm" description="Thử tên hãng, model hoặc từ khoá khác." />
      ) : (
        <View style={[styles.list, { borderColor: theme.border }]}>
          {items.map((product, index) => (
            <Pressable
              key={product.id ?? product.sku ?? index}
              accessibilityRole="button"
              accessibilityLabel={`Xem ${product.name ?? 'sản phẩm'}`}
              onPress={() => open(product)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? theme.surfacePressed : theme.surface, borderBottomColor: theme.border },
                index === items.length - 1 && styles.lastRow,
              ]}
            >
              <View style={[styles.imageBox, { backgroundColor: theme.surfaceMuted }]}>
                {product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
                ) : (
                  <Ionicons name="hardware-chip-outline" size={26} color={theme.textSubtle} />
                )}
              </View>
              <View style={styles.copy}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{product.name || 'Sản phẩm chưa đặt tên'}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>{[product.brand, product.model].filter(Boolean).join(' · ') || product.sku || '—'}</Text>
                <View style={styles.specs}>
                  {product.ratedPowerW != null ? <Text style={[styles.spec, { color: theme.brandText }]}>{product.ratedPowerW} W</Text> : null}
                  <Text style={[styles.price, { color: theme.text }]}>{formatMoney(product.unitPrice)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  search: { minHeight: 48, borderWidth: 1, borderRadius: 6, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, minHeight: 46, fontSize: 15, lineHeight: 21, paddingVertical: 0 },
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  row: { minHeight: 96, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  lastRow: { borderBottomWidth: 0 },
  imageBox: { width: 68, height: 68, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  copy: { flex: 1, gap: 3 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
  specs: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginTop: 3 },
  spec: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  price: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
})
