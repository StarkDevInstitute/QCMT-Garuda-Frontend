import type { EvaluationMode, EvaluationStatus } from '@/types/seismology'
import { Badge } from '@/components/ui/badge'

interface EventStatusBadgeProps {
  evaluationMode: EvaluationMode
  evaluationStatus?: EvaluationStatus
}

/** Returns the status code string like M+, M, A+, A */
function getStatusCode(mode: EvaluationMode, status?: EvaluationStatus): string {
  const isManual = mode === 'manual'
  const isPreferred =
    status === 'confirmed' || status === 'reviewed' || status === 'final'
  if (isManual) return isPreferred ? 'M+' : 'M'
  return isPreferred ? 'A+' : 'A'
}

export function EventStatusBadge({ evaluationMode, evaluationStatus }: EventStatusBadgeProps) {
  const code = getStatusCode(evaluationMode, evaluationStatus)

  const variant =
    code === 'M+' ? 'manual_preferred'
    : code === 'M' ? 'manual'
    : code === 'A+' ? 'auto_preferred'
    : 'auto'

  return <Badge variant={variant}>{code}</Badge>
}
