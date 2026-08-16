import { Badge } from './Badge';
import { vehicleStatusLabel } from '@/utils/labels';
import type { VehicleStatus } from '@rentaflow/shared';

const toneByStatus = {
  AVAILABLE: 'success',
  RENTED: 'info',
  MAINTENANCE: 'warning',
  INACTIVE: 'neutral',
} as const;

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <Badge label={vehicleStatusLabel(status)} tone={toneByStatus[status]} />
  );
}
