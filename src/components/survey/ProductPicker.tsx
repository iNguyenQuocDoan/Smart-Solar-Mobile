import Ionicons from '@expo/vector-icons/Ionicons'
import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IconButton, SCREEN_PADDING } from '@/components/ui'
import type { Product } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'
import { isServiceType } from '@/lib/onsiteSurvey/billOfMaterials'
import { productTypeLabel } from '@/lib/product'
import { useAppTheme } from '@/theme/theme'

// Chọn một sản phẩm trong danh mục: tìm theo tên, mã, hãng; lọc theo loại. Dùng cho bảng vật tư của biên bản và dòng báo giá

export type PickerGroup = 'equipment' | 'service' | 'all'

const FILTERS: Record<PickerGroup, { value: string; label: string }[]> = {
  equipment: [
    { value: '', label: 'Tất cả' },
    { value: 'SOLAR_PANEL', label: 'Tấm pin' },
    { value: 'INVERTER', label: 'Inverter' },
    { value: 'OTHER', label: 'Khác' },
  ],
  service: [
    { value: '', label: 'Tất cả' },
    { value: 'INSTALLATION_LABOR', label: 'Nhân công' },
    { value: 'TRANSPORT', label: 'Vận chuyển' },
    { value: 'OTHER_SERVICE', label: 'Dịch vụ khác' },
  ],
  all: [
    { value: '', label: 'Tất cả' },
    { value: 'SOLAR_PANEL', label: 'Tấm pin' },
    { value: 'INVERTER', label: 'Inverter' },
    { value: 'SERVICE', label: 'Dịch vụ' },
    { value: 'OTHER', label: 'Khác' },
  ],
}

const typeOf = (p: Product) => (p.productType ?? '').trim().toUpperCase()

function matchesFilter(p: Product, filter: string) {
  if (!filter) return true
  const type = typeOf(p)
  if (filter === 'SERVICE') return isServiceType(type)
  if (filter === 'OTHER') return type !== 'SOLAR_PANEL' && type !== 'INVERTER' && !isServiceType(type)
  return type === filter
}

const fold = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

export function ProductPicker({
  visible,
  title,
  group,
  products,
  takenIds = [],
  loading,
  error,
  onPick,
  onClose,
}: {
  visible: boolean
  title: string
  group: PickerGroup
  products: Product[]
  /** Sản phẩm đã có trong danh sách: hiện "Đã có", không chọn lại */
  takenIds?: string[]
  loading?: boolean
  error?: string | null
  onPick: (product: Product) => void
  onClose: () => void
}) {
  const theme = useAppTheme()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const filters = FILTERS[group]

  const shown = useMemo(() => {
    const words = fold(search.trim()).split(/\s+/).filter(Boolean)
    return products.filter((p) => {
      if (group === 'equipment' && isServiceType(p.productType)) return false
      if (group === 'service' && !isServiceType(p.productType)) return false
      if (!matchesFilter(p, filter)) return false
      if (words.length === 0) return true
      const haystack = fold([p.name, p.sku, p.brand, p.model].filter(Boolean).join(' '))
      return words.every((w) => haystack.includes(w))
    })
  }, [products, group, filter, search])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.canvas }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>
          <IconButton label="Đóng" icon="close" onPress={onClose} />
        </View>
        <View style={styles.controls}>
          <View style={[styles.search, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              accessibilityLabel="Tìm sản phẩm"
              value={search}
              onChangeText={setSearch}
              placeholder="Tên, mã, hãng…"
              placeholderTextColor={theme.textSubtle}
              autoCorrect={false}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <View style={styles.filters} accessibilityRole="tablist">
            {filters.map((f) => {
              const active = f.value === filter
              return (
                <Pressable
                  key={f.value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(f.value)}
                  style={[styles.filter, { borderBottomColor: active ? theme.brandText : 'transparent' }]}
                >
                  <Text style={[styles.filterText, { color: active ? theme.brandText : theme.textMuted }]}>
                    {f.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <FlatList
          data={shown}
          keyExtractor={(p) => p.id ?? p.name ?? ''}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: error ? theme.danger : theme.textMuted }]}>
              {loading ? 'Đang tải danh mục…' : (error ?? 'Không có sản phẩm đang bán nào khớp.')}
            </Text>
          }
          renderItem={({ item }) => {
            const taken = Boolean(item.id && takenIds.includes(item.id))
            const detail = [productTypeLabel(item.productType), item.brand, item.model, item.sku]
              .filter(Boolean)
              .join(' · ')
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: taken }}
                disabled={taken}
                onPress={() => onPick(item)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: theme.border },
                  pressed && { backgroundColor: theme.surfacePressed },
                ]}
              >
                <View style={styles.fill}>
                  <Text style={[styles.name, { color: taken ? theme.textMuted : theme.text }]}>{item.name}</Text>
                  {detail ? <Text style={[styles.meta, { color: theme.textMuted }]}>{detail}</Text> : null}
                  <Text style={[styles.meta, { color: theme.textMuted }]}>
                    {item.unitPrice ? `${formatMoney(item.unitPrice)} / ${item.unit ?? 'đơn vị'}` : 'Chưa có giá'}
                  </Text>
                </View>
                {taken ? (
                  <Text style={[styles.meta, { color: theme.textMuted }]}>Đã có</Text>
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color={theme.brandText} />
                )}
              </Pressable>
            )
          }}
        />
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
  },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', flex: 1 },
  controls: { paddingHorizontal: SCREEN_PADDING, gap: 8, paddingTop: 8 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: { flex: 1, fontSize: 16, lineHeight: 22, minHeight: 46 },
  filters: { flexDirection: 'row', flexWrap: 'wrap' },
  filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: 2 },
  filterText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  list: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  meta: { fontSize: 13, lineHeight: 18 },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 16 },
})
