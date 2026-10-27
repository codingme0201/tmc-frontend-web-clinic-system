import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../services/api'
import { useAuth } from '../hooks/useAuth'

export default function UserAvatar({ user, className = '' }) {
  const { user: viewer } = useAuth()
  const imageRef = useRef(null)
  const source = user?.profilePictureUrl
  const { data: picture } = useQuery({
    queryKey: ['profile-picture', viewer?.id, user?.id ?? user?.userId, source],
    queryFn: async ({ signal }) => (await http.get(source, { responseType: 'blob', signal })).data,
    enabled: Boolean(viewer?.id && source?.startsWith('/profile-pictures/')),
    staleTime: 300000,
    retry: false,
  })

  useEffect(() => {
    if (!picture || !imageRef.current) return
    const url = URL.createObjectURL(picture)
    imageRef.current.style.display = ''
    imageRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [picture])

  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[inherit] ${className}`}>
      <span aria-hidden="true">{user?.name?.slice(0, 2).toUpperCase() || 'AD'}</span>
      {picture && <img ref={imageRef} alt={`${user?.name || 'User'} profile`} className="absolute inset-0 size-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
    </span>
  )
}
