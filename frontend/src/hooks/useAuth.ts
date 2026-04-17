import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

const AUTH_BOOT_TIMEOUT_MS = 10000

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized'; email: string }
  | { status: 'authorized'; user: User; participantId: string; isAdmin: boolean }
  | { status: 'guest' }

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    const authBootTimeout = window.setTimeout(() => {
      if (!active) return
      setAuth((current) => {
        if (current.status !== 'loading') return current
        console.warn('[useAuth] auth bootstrap timed out; falling back to unauthenticated')
        return { status: 'unauthenticated' }
      })
    }, AUTH_BOOT_TIMEOUT_MS)

    async function resolveSession(session: { user: User } | null) {
      if (!active) return

      if (!session) {
        setAuth({ status: 'unauthenticated' })
        return
      }

      try {
        await handleUser(session.user, active)
      } catch (error) {
        console.error('[useAuth] unexpected auth bootstrap error:', error)
        if (active) setAuth({ status: 'unauthenticated' })
      }
    }

    void supabase.auth.getSession()
      .then(({ data }) => resolveSession(data.session ?? null))
      .catch((error) => {
        console.error('[useAuth] getSession failed:', error)
        if (active) setAuth({ status: 'unauthenticated' })
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      void resolveSession(session)
    })

    return () => {
      active = false
      window.clearTimeout(authBootTimeout)
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (auth.status !== 'authorized') return

    const email = auth.user.email ?? ''
    const participantId = auth.participantId

    const sub = supabase
      .channel(`participant-access-${participantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `id=eq.${participantId}` }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          setAuth({ status: 'unauthorized', email })
          return
        }

        const { data, error } = await supabase
          .from('participants')
          .select('id, is_admin')
          .eq('id', participantId)
          .maybeSingle()

        if (error || !data) {
          setAuth({ status: 'unauthorized', email })
          return
        }

        setAuth((current) =>
          current.status === 'authorized' && current.user.id === auth.user.id
            ? { ...current, isAdmin: data.is_admin ?? false }
            : current
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [auth])

  async function loadParticipant(userId: string) {
    return supabase
      .from('participants')
      .select('id, is_admin')
      .eq('user_id', userId)
      .maybeSingle()
  }

  async function handleUser(user: User, active = true) {
    const email = user.email!

    const { data: allowed, error: allowedError } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email)
      .single()

    // PGRST116 = no rows found (expected when user is not in allowed list)
    if (allowedError && allowedError.code !== 'PGRST116') {
      console.error('[useAuth] DB error checking allowed_emails:', allowedError.message)
      if (active) setAuth({ status: 'unauthenticated' })
      return
    }

    if (!allowed) {
      if (active) setAuth({ status: 'unauthorized', email })
      return
    }

    let { data: participant, error: fetchError } = await loadParticipant(user.id)

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[useAuth] DB error fetching participant:', fetchError.message)
      if (active) setAuth({ status: 'unauthenticated' })
      return
    }

    if (!participant) {
      const { data: created, error: createError } = await supabase
        .from('participants')
        .insert({
          user_id: user.id,
          name: user.user_metadata.full_name ?? email.split('@')[0],
          email,
        })
        .select('id, is_admin')
        .single()

      if (createError && createError.code === '23505') {
        const { data: existingAfterRace, error: raceFetchError } = await loadParticipant(user.id)
        if (raceFetchError || !existingAfterRace) {
          console.error('[useAuth] Erro ao recuperar participante após corrida:', raceFetchError?.message)
          if (active) setAuth({ status: 'unauthorized', email })
          return
        }
        participant = existingAfterRace
      } else if (createError || !created) {
        console.error('[useAuth] Erro ao criar participante:', createError?.message)
        if (active) setAuth({ status: 'unauthorized', email })
        return
      } else {
        participant = created
      }
    }

    if (!active) return

    setAuth({
      status: 'authorized',
      user,
      participantId: participant.id,
      isAdmin: participant.is_admin ?? false,
    })
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  function enterAsGuest() {
    setAuth({ status: 'guest' })
  }

  async function signOut() {
    if (auth.status === 'guest') {
      setAuth({ status: 'unauthenticated' })
      return
    }
    await supabase.auth.signOut()
    setAuth({ status: 'unauthenticated' })
  }

  return { auth, signInWithGoogle, signOut, enterAsGuest }
}
