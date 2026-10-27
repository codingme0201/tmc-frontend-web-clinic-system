import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { request } from '../services/api'
import { PILL, PRIMARY_BTN } from '../lib/ui'
import UserAvatar from './UserAvatar'

export default function ProfilePictureEditor({ disabled = false }) {
  const { user, userRole, setProfilePicture } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const clearPreview = () => {
    setFile(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }
  const mutation = useMutation({
    mutationFn: async ({ remove, ownerId }) => {
      if (remove) return { ...await request('/me/profile-picture', { method: 'DELETE' }), ownerId }
      const body = new FormData()
      body.append('picture', file)
      return { ...await request('/me/profile-picture', { method: 'POST', body }), ownerId }
    },
    onSuccess: ({ profilePictureUrl, ownerId }) => {
      setProfilePicture(profilePictureUrl, ownerId)
      for (const key of ['clinic-staff', 'clinic-staff-member', 'users', 'eligible-staff', 'staff', 'activity-logs', 'audit-logs']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
      clearPreview()
      showToast(profilePictureUrl ? 'Profile picture saved.' : 'Profile picture removed.')
    },
    onError: (error) => showToast(error.message || 'Could not update the profile picture.', 'error'),
  })
  const busy = disabled || mutation.isPending
  if (!['doctor', 'front_desk'].includes(userRole)) return null

  return (
    <section className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-[#fbfdfc] p-4" aria-label="Profile picture">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-[22px] font-extrabold text-white">
        {preview ? <img src={preview} alt="New profile picture preview" className="size-full object-cover" /> : <UserAvatar user={user} className="size-full" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 mt-0 text-[13px] font-extrabold text-ink">Profile Picture</p>
        <p className="mb-2 mt-0 text-[11.5px] text-muted">JPEG, PNG or WebP. Up to 2 MB.</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile picture" className="sr-only" disabled={busy} onChange={(event) => {
          const selected = event.target.files?.[0]
          if (!selected) return
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 2 * 1024 * 1024) {
            showToast('Choose a JPEG, PNG or WebP image up to 2 MB.', 'error')
            event.target.value = ''
            return
          }
          setFile(selected)
          setPreview(URL.createObjectURL(selected))
        }} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={PILL} disabled={busy} onClick={() => inputRef.current?.click()}>{user?.profilePictureUrl || preview ? 'Change Photo' : 'Upload Photo'}</button>
          {file && <button type="button" className={PRIMARY_BTN} disabled={busy} onClick={() => mutation.mutate({ remove: false, ownerId: user.id })}>Save Photo</button>}
          {file && <button type="button" className={PILL} disabled={busy} onClick={clearPreview}>Cancel Preview</button>}
          {user?.profilePictureUrl && <button type="button" className={`${PILL} text-danger`} disabled={busy} onClick={() => mutation.mutate({ remove: true, ownerId: user.id })}>Remove Photo</button>}
        </div>
        {mutation.isPending && <p role="status" className="mb-0 mt-2 text-[11px] text-muted">Saving picture...</p>}
      </div>
    </section>
  )
}
