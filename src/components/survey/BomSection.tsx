import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/ui'
import { FormField, Note, NumberBox, TextBox } from '@/components/form'
import { ProductPicker } from '@/components/survey/ProductPicker'
import type { SectionProps } from '@/components/survey/SurveySections'
import type { Product } from '@/lib/api/types'
import {
  BOM_ERROR_KEY,
  BOM_LIMITS,
  bomErrorKey,
  bomGaps,
  isServiceType,
  newBomRow,
  type BomList,
  type BomRow,
} from '@/lib/onsiteSurvey/billOfMaterials'
import { productTypeLabel } from '@/lib/product'
import { useAppTheme } from '@/theme/theme'

// Thiết bị và dịch vụ kỹ thuật viên chốt tại công trình. Chỉ chọn sản phẩm đang bán trong danh mục, không có giá:
// báo giá lấy giá từ danh mục. Như BillOfMaterialsFields của web

const isActive = (p: Product) => (p.status ?? '').trim().toUpperCase() === 'ACTIVE'

export function BomSection({
  value,
  errors,
  onChange,
  disabled,
  catalog,
}: SectionProps & { catalog: { products: Product[] | undefined; loading: boolean; error: string | null } }) {
  const byId = useMemo(() => {
    const map = new Map<string, Product>()
    for (const p of catalog.products ?? []) if (p.id && p.name && isActive(p)) map.set(p.id, p)
    return map
  }, [catalog.products])
  const products = [...byId.values()]
  const gaps = catalog.products ? bomGaps(value.materials, value.serviceItems, (id) => byId.get(id)?.productType) : []
  const total = value.materials.length + value.serviceItems.length

  return (
    <>
      {catalog.error ? <Note tone="danger">{catalog.error}</Note> : null}
      {gaps.length > 0 ? <Note>Báo giá tự lập cần thêm: {gaps.join(', ')}.</Note> : null}
      <BomRows
        list="materials"
        title="Thiết bị"
        addLabel="Thêm thiết bị"
        rows={value.materials}
        products={products.filter((p) => !isServiceType(p.productType))}
        byId={byId}
        errors={errors}
        loading={catalog.loading}
        error={catalog.error}
        canAdd={total < BOM_LIMITS.maxItems}
        disabled={disabled}
        onChange={(materials) => onChange({ materials })}
      />
      <BomRows
        list="serviceItems"
        title="Dịch vụ"
        addLabel="Thêm dịch vụ"
        rows={value.serviceItems}
        products={products.filter((p) => isServiceType(p.productType))}
        byId={byId}
        errors={errors}
        loading={catalog.loading}
        error={catalog.error}
        canAdd={total < BOM_LIMITS.maxItems}
        disabled={disabled}
        onChange={(serviceItems) => onChange({ serviceItems })}
      />
      <FormField name={BOM_ERROR_KEY} label="Ghi chú lắp đặt" error={errors[BOM_ERROR_KEY]}>
        <TextBox
          label="Ghi chú lắp đặt"
          multiline
          value={value.installationNotes}
          editable={!disabled}
          maxLength={BOM_LIMITS.notesLength}
          onChangeText={(installationNotes) => onChange({ installationNotes })}
        />
      </FormField>
    </>
  )
}

function BomRows({
  list,
  title,
  addLabel,
  rows,
  products,
  byId,
  errors,
  loading,
  error,
  canAdd,
  disabled,
  onChange,
}: {
  list: BomList
  title: string
  addLabel: string
  rows: BomRow[]
  products: Product[]
  byId: Map<string, Product>
  errors: SectionProps['errors']
  loading: boolean
  error: string | null
  canAdd: boolean
  disabled?: boolean
  onChange: (rows: BomRow[]) => void
}) {
  const theme = useAppTheme()
  /** Dòng đang đổi sản phẩm; null là thêm dòng mới */
  const [picking, setPicking] = useState<{ index: number | null } | null>(null)
  const update = (index: number, patch: Partial<BomRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  function pick(product: Product) {
    if (!picking || !product.id) return
    if (picking.index === null) onChange([...rows, newBomRow(product.id, '')])
    else update(picking.index, { productId: product.id })
    setPicking(null)
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.heading, { color: theme.text }]}>
        {title} ({rows.length})
      </Text>
      {rows.length === 0 ? <Note>Chưa ghi {title.toLowerCase()} nào.</Note> : null}
      {rows.map((row, i) => {
        const product = byId.get(row.productId)
        const key = bomErrorKey(list, i)
        const rowError = errors[key]
        const name =
          product?.name ?? (row.productId ? 'Sản phẩm không còn trong danh mục đang bán' : 'Chưa chọn sản phẩm')
        const detail = product
          ? [productTypeLabel(product.productType), product.brand, product.sku].filter(Boolean).join(' · ')
          : null
        return (
          <View key={row.key} style={[styles.row, { borderBottomColor: theme.border }]}>
            <FormField name={key} label={`${title} ${i + 1}`} error={rowError}>
              <Text style={[styles.name, { color: product ? theme.text : theme.warning }]}>{name}</Text>
              {detail ? <Text style={[styles.meta, { color: theme.textMuted }]}>{detail}</Text> : null}
              <View style={styles.quantityRow}>
                <View style={styles.quantity}>
                  <NumberBox
                    label={`Số lượng ${title.toLowerCase()} ${i + 1}`}
                    unit={product?.unit ?? undefined}
                    placeholder="Số lượng"
                    value={row.quantity}
                    editable={!disabled}
                    invalid={Boolean(rowError)}
                    onChangeText={(quantity) => update(i, { quantity })}
                  />
                </View>
              </View>
              <View style={styles.actions}>
                <Button
                  label="Đổi sản phẩm"
                  variant="quiet"
                  compact
                  disabled={disabled}
                  onPress={() => setPicking({ index: i })}
                />
                <Button
                  label="Xoá"
                  icon="trash-outline"
                  variant="quiet"
                  compact
                  disabled={disabled}
                  onPress={() => onChange(rows.filter((_, j) => j !== i))}
                />
              </View>
            </FormField>
          </View>
        )
      })}
      {canAdd ? (
        <Button
          label={addLabel}
          icon="add"
          variant="secondary"
          disabled={disabled}
          onPress={() => setPicking({ index: null })}
        />
      ) : (
        <Note>Tối đa {BOM_LIMITS.maxItems} dòng.</Note>
      )}
      <ProductPicker
        visible={picking !== null}
        title={picking?.index === null ? addLabel : `Đổi ${title.toLowerCase()} ${(picking?.index ?? 0) + 1}`}
        group={list === 'materials' ? 'equipment' : 'service'}
        products={products}
        takenIds={rows.map((r) => r.productId).filter(Boolean)}
        loading={loading}
        error={error}
        onPick={pick}
        onClose={() => setPicking(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  heading: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  row: { paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  meta: { fontSize: 13, lineHeight: 18 },
  quantityRow: { flexDirection: 'row' },
  quantity: { flex: 1, maxWidth: 220 },
  actions: { flexDirection: 'row', gap: 8 },
})
