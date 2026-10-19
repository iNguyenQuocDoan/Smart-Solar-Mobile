import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customerService, productService, technicianService } from '@/lib/api/services'

export const keys = {
  customerRequests: ['customer-requests'] as const,
  customerRequest: (id: string) => ['customer-requests', id] as const,
  slots: (siteId: string, date: string) => ['survey-slots', siteId, date] as const,
  techJobs: ['technician-jobs'] as const,
  techJob: (id: string) => ['technician-jobs', id] as const,
  schedule: (date: string) => ['technician-schedule', date] as const,
  products: (search: string) => ['products', search] as const,
  product: (id: string) => ['products', 'detail', id] as const,
}

export function useCustomerRequests() {
  return useQuery({ queryKey: keys.customerRequests, queryFn: customerService.listRequests })
}

export function useCustomerRequest(id: string) {
  return useQuery({ queryKey: keys.customerRequest(id), queryFn: () => customerService.getRequest(id), enabled: Boolean(id) })
}

export function useSurveySlots(siteId: string, date: string, enabled: boolean) {
  return useQuery({ queryKey: keys.slots(siteId, date), queryFn: () => customerService.getSlots(siteId, date), enabled })
}

export function useBookingMutation(id: string, mode: 'book' | 'reschedule') {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ startsAt, note }: { startsAt: string; note: string }) =>
      mode === 'book' ? customerService.book(id, startsAt, note) : customerService.reschedule(id, startsAt, note),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.customerRequests }),
        client.invalidateQueries({ queryKey: keys.customerRequest(id) }),
      ])
    },
  })
}

export function useCancelBooking(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => customerService.cancel(id),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.customerRequests }),
        client.invalidateQueries({ queryKey: keys.customerRequest(id) }),
      ])
    },
  })
}

export function useTechJobs() {
  return useQuery({ queryKey: keys.techJobs, queryFn: technicianService.listAppointments })
}

export function useTechJob(id: string) {
  return useQuery({ queryKey: keys.techJob(id), queryFn: () => technicianService.getAppointment(id), enabled: Boolean(id) })
}

export function useAcknowledgeJob(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => technicianService.acknowledge(id),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.techJobs }),
        client.invalidateQueries({ queryKey: keys.techJob(id) }),
      ])
    },
  })
}

export function useTechSchedule(date: string) {
  return useQuery({ queryKey: keys.schedule(date), queryFn: () => technicianService.schedule(date) })
}

export function useProducts(search: string) {
  return useQuery({ queryKey: keys.products(search), queryFn: () => productService.list(search) })
}

export function useProduct(id: string) {
  return useQuery({ queryKey: keys.product(id), queryFn: () => productService.get(id), enabled: Boolean(id) })
}
