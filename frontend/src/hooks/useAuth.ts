import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized'; email: string }
  | { status: 'authorized'; user: User; participantId: string; isAdmin: boolean }

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

  async function handleUser(user: User) {
    const email = user.email!

    const { data: allowed } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email)
      .single()

    if (!allowed) {
      setAuth({ status: 'unauthorized', email })
      return
    }

    let { data: participant } = await supabase
      .from('participants')
      .select('id, is_admin')
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      const { data: created } = await supabase
        .from('participants')
        .insert({
          user_id: user.id,
          name: user.user_metadata.full_name ?? email.split('@')[0],
          email,
        })
        .select('id, is_admin')
        .single()
      participant = created
    }

    setAuth({
      status: 'authorized',
      user,
      participantId: participant!.id,
      isAdmin: participant!.is_admin ?? false,
    })
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAuth({ status: 'unauthenticated' })
  }

  return { auth, signInWithGoogle, signOut }
}
