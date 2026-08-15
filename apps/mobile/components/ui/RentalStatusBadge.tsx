import { Badge } from '@/components/ui/Badge';
import { rentalStatusLabel } from '@/utils/labels';

const toneMap = {
  RESERVED: 'info',
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  OVERDUE: 'danger',
} as const;

export function RentalStatusBadge({
  status,
}: {
  status: keyof typeof toneMap;
}) {
  return (
    <Badge label={rentalStatusLabel(status)} tone={toneMap[status]} />
  );
}
