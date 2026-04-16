import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized'; email: string }
  | { status: 'authorized'; user: User; participantId: string; isAdmin: boolean }
  | { status: 'guest' }

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) handleUser(data.session.user)
      else setAuth({ status: 'unauthenticated' })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) handleUser(session.user)
      else setAuth({ status: 'unauthenticated' })
    })

    return () => listener.subscription.unsubscribe()
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

  async function handleUser(user: User) {
    const email = user.email!

    const { data: allowed, error: allowedError } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email)
      .single()

    // PGRST116 = no rows found (expected when user is not in allowed list)
    if (allowedError && allowedError.code !== 'PGRST116') {
      console.error('[useAuth] DB error checking allowed_emails:', allowedError.message)
      setAuth({ status: 'unauthenticated' })
      return
    }

    if (!allowed) {
      setAuth({ status: 'unauthorized', email })
      return
    }

    let { data: participant, error: fetchError } = await supabase
      .from('participants')
      .select('id, is_admin')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[useAuth] DB error fetching participant:', fetchError.message)
      setAuth({ status: 'unauthenticated' })
      return
    }

    if (!participant) {
      setAuth({ status: 'unauthorized', email })
      return
    }

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
