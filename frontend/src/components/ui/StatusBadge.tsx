import clsx from 'clsx'

const statusConfig: Record<string, { label: string; className: string }> = {
  uploaded:        { label: 'Uploaded',       className: 'bg-gray-100 text-gray-700' },
  outreach_sent:   { label: 'Outreach Sent',  className: 'bg-blue-100 text-blue-700' },
  interested:      { label: 'Interested',     className: 'bg-green-100 text-green-700' },
  not_interested:  { label: 'Not Interested', className: 'bg-red-100 text-red-700' },
  demo_invited:    { label: 'Demo Invited',   className: 'bg-purple-100 text-purple-700' },
  demo_scheduled:  { label: 'Demo Scheduled', className: 'bg-indigo-100 text-indigo-700' },
  demo_completed:  { label: 'Demo Completed', className: 'bg-teal-100 text-teal-700' },
  trial_started:   { label: 'Trial Active',   className: 'bg-amber-100 text-amber-700' },
  trial_expired:   { label: 'Trial Expired',  className: 'bg-orange-100 text-orange-700' },
  converted:       { label: 'Converted',      className: 'bg-emerald-100 text-emerald-700' },
  dropped:         { label: 'Dropped',        className: 'bg-rose-100 text-rose-700' },
  // Email statuses
  pending:  { label: 'Pending',  className: 'bg-gray-100 text-gray-600' },
  queued:   { label: 'Queued',   className: 'bg-blue-100 text-blue-600' },
  sent:     { label: 'Sent',     className: 'bg-green-100 text-green-700' },
  failed:   { label: 'Failed',   className: 'bg-red-100 text-red-700' },
  opened:   { label: 'Opened',   className: 'bg-purple-100 text-purple-700' },
  replied:  { label: 'Replied',  className: 'bg-teal-100 text-teal-700' },
  // Demo
  pending_demo:   { label: 'Pending',   className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  no_show:   { label: 'No Show',   className: 'bg-orange-100 text-orange-700' },
  // Trial
  active:    { label: 'Active',    className: 'bg-green-100 text-green-700' },
  expired:   { label: 'Expired',   className: 'bg-orange-100 text-orange-700' },
  // Size
  small:  { label: 'Small',  className: 'bg-sky-100 text-sky-700' },
  medium: { label: 'Medium', className: 'bg-indigo-100 text-indigo-700' },
  large:  { label: 'Large',  className: 'bg-violet-100 text-violet-700' },
}

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }

  return (
    <span className={clsx(
      'badge font-medium',
      config.className,
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70 inline-block" />
      {config.label}
    </span>
  )
}
