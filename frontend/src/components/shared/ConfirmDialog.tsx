import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
            <p className="text-sm text-neutral-500 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
