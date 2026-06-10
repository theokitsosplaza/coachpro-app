'use client'

import { useActionState } from 'react'
import { inviteClient, type InviteState } from './actions'

interface Props {
  clientId: string
  isInvited: boolean
}

export function InviteButton({ clientId, isInvited }: Props) {
  const [state, dispatch, isPending] = useActionState(inviteClient, null)

  const hasError   = state !== null && 'error'   in state
  const hasSuccess = state !== null && 'success' in state

  return (
    <div className="flex flex-col items-end gap-1">
      {hasError && (
        <p className="text-xs text-status-red">
          {(state as { error: string }).error}
        </p>
      )}
      {hasSuccess && (
        <p className="text-xs text-success">
          {(state as { success: true; message: string }).message}
        </p>
      )}

      {isInvited ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success-muted px-2.5 py-0.5 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Invited
          </span>
          <form action={dispatch}>
            <input type="hidden" name="clientId" value={clientId} />
            <button
              type="submit"
              disabled={isPending}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Resend'}
            </button>
          </form>
        </div>
      ) : (
        <form action={dispatch}>
          <input type="hidden" name="clientId" value={clientId} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-7 items-center rounded-lg border border-accent/40 bg-accent/10 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Sending…' : 'Invite to Portal'}
          </button>
        </form>
      )}
    </div>
  )
}
