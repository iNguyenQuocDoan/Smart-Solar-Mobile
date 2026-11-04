import type { Product, ProductImage } from '@/lib/api/types'

// Danh mục sản phẩm: ảnh (danh sách ảnh, ảnh chính), tên loại, thông số inverter có tên tiếng Việt

const TYPE_LABELS: Record<string, string> = {
  SOLAR_PANEL: 'Tấm pin',
  INVERTER: 'Inverter',
  INSTALLATION_LABOR: 'Nhân công lắp đặt',
  TRANSPORT: 'Vận chuyển',
  OTHER_SERVICE: 'Dịch vụ khác',
}

/** Loại có luật riêng hiện tên tiếng Việt, loại khác giữ nguyên */
export function productTypeLabel(type: string | null | undefined) {
  if (!type?.trim()) return null
  return TYPE_LABELS[type.trim().toUpperCase()] ?? type
}

/** Ảnh theo thứ tự hiển thị. Sản phẩm chỉ có `imageUrl` (dữ liệu cũ) thì đó là ảnh chính duy nhất */
export function productImages(product: Product): ProductImage[] {
  const images = (product.images ?? [])
    .filter((image) => image.url)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  if (images.length === 0 && product.imageUrl) return [{ url: product.imageUrl, isPrimary: true, sortOrder: 0 }]
  return images
}

export function primaryImageUrl(product: Product) {
  const images = productImages(product)
  return (images.find((image) => image.isPrimary) ?? images[0])?.url ?? null
}

const INVERTER_FIELDS: Record<string, { label: string; unit: string | null }> = {
  ratedAcPowerW: { label: 'Công suất AC định mức', unit: 'W' },
  maxDcInputPowerW: { label: 'Công suất DC vào tối đa', unit: 'W' },
  maxDcVoltageV: { label: 'Điện áp DC tối đa', unit: 'V' },
  mpptCount: { label: 'Số MPPT', unit: null },
  efficiencyPercent: { label: 'Hiệu suất', unit: '%' },
}
const PHASES: Record<string, string> = { SINGLE_PHASE: '1 pha', THREE_PHASE: '3 pha' }
const specNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** Thông số để hiển thị: inverter có tên và đơn vị, khoá khác in nguyên, bỏ khối lồng nhau (vd. installation) */
export function specEntries(spec: unknown): { label: string; value: string }[] {
  let value = spec
  if (typeof spec === 'string') {
    try {
      value = JSON.parse(spec) as unknown
    } catch {
      return spec.trim() ? [{ label: 'Thông số', value: spec.trim() }] : []
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v != null && v !== '' && typeof v !== 'object')
    .map(([key, v]) => {
      if (key === 'phase' && typeof v === 'string' && PHASES[v]) return { label: 'Số pha', value: PHASES[v] }
      const field = INVERTER_FIELDS[key]
      if (!field || typeof v !== 'number') return { label: key, value: String(v) }
      const shown = specNumber.format(v)
      return {
        label: field.label,
        value: !field.unit ? shown : field.unit === '%' ? `${shown}%` : `${shown} ${field.unit}`,
      }
    })
}

const powerNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** Từ 1.000 W trở lên ghi theo kW, như web */
export function formatPower(watts: number) {
  return watts >= 1000 ? `${powerNumber.format(watts / 1000)} kW` : `${powerNumber.format(watts)} W`
}
