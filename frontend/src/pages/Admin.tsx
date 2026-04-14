import { useEffect, useMemo, useState } from 'react'
import {
  Shield,
  Users,
  UserX,
  RefreshCw,
  DatabaseBackup,
  Activity,
  Search,
  Crown,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  Link2,
  Plus,
  Trash2,
  HeartPulse,
  Clock3,
  MessageSquareShare,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { adminGet, adminPost } from '../lib/adminApi'
import { useUIStore } from '../store/useUIStore'
import type { Participant } from '../types'
import { LoadingBasketball } from '../components/LoadingBasketball'

interface Props {
  participantId: string
}

interface HealthResponse {
  ok: boolean
  timestamp: string
}

interface DailyDigestResponse {
  ok: boolean
  message: string
  result: {
    outputDir: string
    targetDate: string
    whatsappText: string
    files: {
      whatsappTxt: string
      summaryMd: string
      payloadJson: string
    }
  }
}

interface BackupResponse {
  ok: boolean
  message: string
  result: {
    outputDir: string
    files: {
      seriesPicksCsv: string
      gamePicksCsv: string
      rankingCsv: string
      summaryMd: string
    }
  }
}

interface RemoveParticipantResponse {
  ok: boolean
  message: string
  result: {
    participant: {
      id: string
      name: string
      email: string
      user_id: string
    }
    deleted: {
      series_picks: number
      game_picks: number
      simulation_series_picks: number
      simulation_game_picks: number
      participants: number
      allowed_emails: number
    }
  }
}

interface AllowedEmailsResponse {
  ok: boolean
  emails: Array<{ email: string }>
}

interface OverviewResponse {
  ok: boolean
  timestamp: string
  overview: {
    stats: {
      participants: number
      admins: number
      allowed_emails: number
      series_picks: number
      game_picks: number
      simulation_series_picks: number
      simulation_game_picks: number
      series_total: number
      series_completed: number
      games_total: number
      games_played: number
      mode: string
    }
    inconsistencies: {
      duplicate_names: number
      duplicate_emails: number
      participants_without_access: number
      allowed_without_participant: number
      orphaned_series_picks: number
      orphaned_game_picks: number
    }
    details: {
      participants_without_access: Array<{ id: string; name: string; email: string }>
      allowed_without_participant: string[]
    }
  }
}

interface ToggleAdminResponse {
  ok: boolean
  participant: {
    id: string
    name: string
    email: string
    is_admin: boolean
  }
  message: string
}

interface ActivityItem {
  id: string
  label: string
  timestamp: string
  tone: 'info' | 'success' | 'danger'
}

const ACTIVITY_STORAGE_KEY = 'nba-bolao-admin-activity'

const card: React.CSSProperties = {
  background: 'var(--nba-surface)',
  border: '1px solid var(--nba-border)',
  borderRadius: 10,
  padding: '1rem',
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>{icon}</span>
      <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.08em', margin: 0 }}>
        {children}
      </h2>
    </div>
  )
}

function formatTimestamp(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

function loadActivity(): ActivityItem[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ActivityItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistActivity(items: ActivityItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(items))
}

function modeLabel(mode: string) {
  const normalized = mode.trim().toLocaleLowerCase('pt-BR')
  if (normalized === 'real') return 'Modo real'
  if (normalized === 'ficticio' || normalized === 'fictício') return 'Modo fictício'
  return mode
}

export function Admin({ participantId }: Props) {
  const { addToast } = useUIStore()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])
  const [overview, setOverview] = useState<OverviewResponse['overview'] | null>(null)
  const [healthTimestamp, setHealthTimestamp] = useState<string | null>(null)
  const [participantsQuery, setParticipantsQuery] = useState('')
  const [allowedEmailInput, setAllowedEmailInput] = useState('')
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [loadingAllowedEmails, setLoadingAllowedEmails] = useState(true)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>(() => loadActivity())
  const [digestModalOpen, setDigestModalOpen] = useState(false)
  const [latestDigest, setLatestDigest] = useState<DailyDigestResponse['result'] | null>(null)
  const [backupModalOpen, setBackupModalOpen] = useState(false)
  const [latestBackup, setLatestBackup] = useState<BackupResponse['result'] | null>(null)

  function pushActivity(label: string, tone: ActivityItem['tone']) {
    const next = [
      {
        id: crypto.randomUUID(),
        label,
        tone,
        timestamp: new Date().toISOString(),
      },
      ...activity,
    ].slice(0, 12)

    setActivity(next)
    persistActivity(next)
  }

  async function loadParticipants() {
    setLoadingParticipants(true)
    const { data, error } = await supabase
      .from('participants')
      .select('id, user_id, name, email, is_admin')
      .order('name', { ascending: true })

    if (error) {
      addToast('Não foi possível carregar os participantes.', 'error')
      setLoadingParticipants(false)
      return
    }

    setParticipants((data ?? []) as Participant[])
    setLoadingParticipants(false)
  }

  async function loadAllowedEmails() {
    setLoadingAllowedEmails(true)
    try {
      const payload = await adminGet<AllowedEmailsResponse>('/admin/allowed-emails')
      setAllowedEmails(payload.emails.map((item) => item.email))
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setLoadingAllowedEmails(false)
    }
  }

  async function loadOverview() {
    setLoadingOverview(true)
    try {
      const payload = await adminGet<OverviewResponse>('/admin/overview')
      setOverview(payload.overview)
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setLoadingOverview(false)
    }
  }

  useEffect(() => {
    loadParticipants()
    loadAllowedEmails()
    loadOverview()

    const sub = supabase
      .channel('admin-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        loadParticipants()
        loadOverview()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allowed_emails' }, () => {
        loadAllowedEmails()
        loadOverview()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [])

  useEffect(() => {
    adminGet<HealthResponse>('/admin/health')
      .then((payload) => setHealthTimestamp(payload.timestamp))
      .catch(() => setHealthTimestamp(null))
  }, [overview])

  const duplicateNameSet = useMemo(() => {
    const counts = new Map<string, number>()

    for (const participant of participants) {
      const key = participant.name.trim().toLocaleLowerCase('pt-BR')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return new Set(
      Array.from(counts.entries())
        .filter(([, total]) => total > 1)
        .map(([name]) => name)
    )
  }, [participants])

  const filteredParticipants = useMemo(() => {
    const normalizedQuery = participantsQuery.trim().toLocaleLowerCase('pt-BR')
    if (!normalizedQuery) return participants

    return participants.filter((participant) =>
      participant.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
      participant.email.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
    )
  }, [participants, participantsQuery])

  async function runAdminAction<TResponse>(actionKey: string, action: () => Promise<TResponse>) {
    setBusyAction(actionKey)
    try {
      return await action()
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRescore() {
    try {
      await runAdminAction('rescore', () => adminPost('/admin/rescore'))
      addToast('Recalculo do ranking concluído.', 'success')
      pushActivity('Ranking recalculado manualmente', 'success')
      await loadOverview()
    } catch (error) {
      addToast((error as Error).message, 'error')
      pushActivity('Falha ao recalcular ranking', 'danger')
    }
  }

  async function handleBackup() {
    try {
      const payload = await runAdminAction('backup', () => adminPost<BackupResponse>('/admin/backup'))
      setLatestBackup(payload.result)
      setBackupModalOpen(true)
      addToast('Backup operacional gerado com sucesso.', 'success')
      pushActivity('Backup operacional gerado', 'success')
    } catch (error) {
      addToast((error as Error).message, 'error')
      pushActivity('Falha ao gerar backup operacional', 'danger')
    }
  }

  async function handleDailyDigest() {
    try {
      const payload = await runAdminAction('daily-digest', () =>
        adminPost<DailyDigestResponse>('/admin/daily-digest')
      )

      setLatestDigest(payload.result)
      setDigestModalOpen(true)
      addToast('Resumo do grupo gerado com sucesso.', 'success')
      pushActivity(`Resumo diário gerado para ${payload.result.targetDate}`, 'success')
    } catch (error) {
      addToast((error as Error).message, 'error')
      pushActivity('Falha ao gerar resumo diário do grupo', 'danger')
    }
  }

  async function handleCopyDigest() {
    if (!latestDigest?.whatsappText) return

    try {
      await navigator.clipboard.writeText(latestDigest.whatsappText)
      addToast('Mensagem copiada para a área de transferência.', 'success')
    } catch {
      addToast('Não foi possível copiar automaticamente a mensagem.', 'error')
    }
  }

  async function handleSync() {
    try {
      await runAdminAction('sync', () => adminPost('/admin/sync'))
      addToast('Sync manual disparado com sucesso.', 'success')
      pushActivity('Sync manual da NBA disparado', 'success')
    } catch (error) {
      addToast((error as Error).message, 'error')
      pushActivity('Falha ao disparar sync manual', 'danger')
    }
  }

  async function handleAddAllowedEmail() {
    const email = allowedEmailInput.trim().toLowerCase()
    if (!email) {
      addToast('Digite um email para liberar acesso.', 'info')
      return
    }

    try {
      await runAdminAction('add-allowed-email', () =>
        adminPost('/admin/allowed-emails/add', { email })
      )
      setAllowedEmailInput('')
      addToast('Email liberado com sucesso.', 'success')
      pushActivity(`Email liberado: ${email}`, 'success')
      await Promise.all([loadAllowedEmails(), loadOverview()])
    } catch (error) {
      addToast((error as Error).message, 'error')
      pushActivity(`Falha ao liberar email: ${email}`, 'danger')
    }
  }

  async function handleRemoveAllowedEmail(email: string) {
    const confirmed = window.confirm(`Remover ${email} da lista de acesso?`)
    if (!confirmed) return

    try {
      await runAdminAction(`remove-email:${email}`, () =>
        adminPost('/admin/allowed-emails/remove', { email })
      )
      addToast('Email removido da lista de acesso.', 'success')
      pushActivity(`Email removido da whitelist: ${email}`, 'info')
      await Promise.all([loadAllowedEmails(), loadOverview()])
    } catch (error) {
      addToast((error as Error).message, 'error')
      pushActivity(`Falha ao remover email: ${email}`, 'danger')
    }
  }

  async function handleToggleAdmin(participant: Participant) {
    const nextIsAdmin = !participant.is_admin
    const confirmed = window.confirm(
      nextIsAdmin
        ? `Promover ${participant.name} para admin?`
        : `Remover privilégio de admin de ${participant.name}?`
    )

    if (!confirmed) return

    try {
      const payload = await runAdminAction(
        `toggle-admin:${participant.id}`,
        () =>
          adminPost<ToggleAdminResponse>('/admin/participants/set-admin', {
            participantId: participant.id,
            isAdmin: nextIsAdmin,
          })
      )

      addToast(payload.message, 'success')
      pushActivity(payload.message, nextIsAdmin ? 'success' : 'info')
      await Promise.all([loadParticipants(), loadOverview()])
    } catch (error) {
      addToast((error as Error).message, 'error')
      pushActivity(`Falha ao alterar admin de ${participant.name}`, 'danger')
    }
  }

  async function handleRemoveParticipant(participant: Participant) {
    const confirmed = window.confirm(
      `Remover ${participant.name} do bolão por completo?\n\nIsso vai apagar palpites, vínculo em participants e acesso em allowed_emails.`
    )

    if (!confirmed) return

    try {
      const payload = await runAdminAction(
        `remove:${participant.id}`,
        () =>
          adminPost<RemoveParticipantResponse>('/admin/participants/remove', {
            participantId: participant.id,
          })
      )

      addToast(
        `${payload.result.participant.name} removido. ${payload.result.deleted.series_picks} séries e ${payload.result.deleted.game_picks} jogos apagados.`,
        'success'
      )
      pushActivity(`Participante removido: ${payload.result.participant.name}`, 'danger')
      await Promise.all([loadParticipants(), loadAllowedEmails(), loadOverview()])
    } catch (error) {
      addToast((error as Error).message, 'error')
      pushActivity(`Falha ao remover participante ${participant.name}`, 'danger')
    }
  }

  const stats = overview?.stats
  const inconsistencies = overview?.inconsistencies

  return (
    <>
      {backupModalOpen && latestBackup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 81,
          }}
          onClick={() => setBackupModalOpen(false)}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '88vh',
              overflow: 'hidden',
              borderRadius: 16,
              border: '1px solid rgba(200,150,60,0.22)',
              background: 'linear-gradient(180deg, rgba(18,23,34,0.98), rgba(10,13,20,0.98))',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(200,150,60,0.12)',
              }}
            >
              <div>
                <div
                  className="font-condensed"
                  style={{ color: 'var(--nba-gold)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  Backup operacional
                </div>
                <div style={{ color: 'var(--nba-text)', fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>
                  Arquivos gerados com sucesso
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 6 }}>
                  Pasta de saída: {latestBackup.outputDir}
                </div>
              </div>

              <button
                onClick={() => setBackupModalOpen(false)}
                style={{
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--nba-text)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ padding: 20, overflow: 'auto', maxHeight: 'calc(88vh - 92px)' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(200,150,60,0.08)',
                  border: '1px solid rgba(200,150,60,0.12)',
                  color: 'var(--nba-text)',
                  fontSize: '0.82rem',
                  marginBottom: 14,
                  lineHeight: 1.55,
                }}
              >
                O backup não baixa automaticamente no navegador. Esses arquivos foram salvos no disco do backend e você pode abrir a pasta acima para acessar os CSVs e o resumo em Markdown.
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { label: 'Palpites de séries (.csv)', value: latestBackup.files.seriesPicksCsv },
                  { label: 'Palpites jogo a jogo (.csv)', value: latestBackup.files.gamePicksCsv },
                  { label: 'Ranking congelado (.csv)', value: latestBackup.files.rankingCsv },
                  { label: 'Resumo da rodada (.md)', value: latestBackup.files.summaryMd },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(200,150,60,0.10)',
                    }}
                  >
                    <div style={{ color: 'var(--nba-gold)', fontSize: '0.75rem', fontWeight: 700, marginBottom: 6 }}>
                      {item.label}
                    </div>
                    <div
                      style={{
                        color: 'var(--nba-text)',
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {digestModalOpen && latestDigest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 80,
          }}
          onClick={() => setDigestModalOpen(false)}
        >
          <div
            style={{
              width: 'min(820px, 100%)',
              maxHeight: '88vh',
              overflow: 'hidden',
              borderRadius: 16,
              border: '1px solid rgba(200,150,60,0.22)',
              background: 'linear-gradient(180deg, rgba(18,23,34,0.98), rgba(10,13,20,0.98))',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(200,150,60,0.12)',
              }}
            >
              <div>
                <div
                  className="font-condensed"
                  style={{ color: 'var(--nba-gold)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  Resumo do grupo
                </div>
                <div style={{ color: 'var(--nba-text)', fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>
                  Mensagem pronta para WhatsApp
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 6 }}>
                  Data alvo: {latestDigest.targetDate}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 4 }}>
                  Pasta gerada: {latestDigest.outputDir}
                </div>
              </div>

              <button
                onClick={() => setDigestModalOpen(false)}
                style={{
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--nba-text)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ padding: 20, overflow: 'auto', maxHeight: 'calc(88vh - 92px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopyDigest}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(200,150,60,0.18)',
                    background: 'rgba(200,150,60,0.10)',
                    color: 'var(--nba-gold)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}
                >
                  <MessageSquareShare size={15} />
                  Copiar mensagem
                </button>

                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', alignSelf: 'center' }}>
                  Arquivo `.txt`: {latestDigest.files.whatsappTxt}
                </div>
              </div>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '0.84rem',
                  lineHeight: 1.55,
                  color: 'var(--nba-text)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(200,150,60,0.10)',
                  borderRadius: 12,
                  padding: '16px 16px 18px',
                }}
              >
                {latestDigest.whatsappText}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 1460 }}>
        <section
        style={{
          background: 'linear-gradient(135deg, rgba(74,144,217,0.14), rgba(200,150,60,0.12) 50%, rgba(19,19,26,1) 100%)',
          border: '1px solid rgba(200,150,60,0.2)',
          borderRadius: 12,
          padding: '1rem',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)', marginBottom: 10 }}>
          <Shield size={16} />
          <span className="font-condensed" style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Painel administrativo
          </span>
        </div>

        <div style={{ display: 'grid', gap: 14 }} className="md:grid-cols-[1.4fr_1fr]">
          <div>
            <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: '2.4rem', margin: 0, lineHeight: 0.95 }}>
              Admin do Bolão
            </h1>
            <p style={{ color: 'var(--nba-text)', fontSize: '0.92rem', margin: '10px 0 0' }}>
              Gestão de participantes, acesso, operações críticas, sync e saúde do sistema em um único lugar.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2">
            {[
              { label: 'Participantes', value: stats?.participants ?? participants.length, tone: 'var(--nba-text)' },
              { label: 'Admins', value: stats?.admins ?? participants.filter((item) => item.is_admin).length, tone: 'var(--nba-gold)' },
              { label: 'Modo atual', value: stats ? modeLabel(stats.mode) : '—', tone: 'var(--nba-east)' },
              { label: 'Health backend', value: healthTimestamp ? 'Online' : 'Sem resposta', tone: healthTimestamp ? 'var(--nba-success)' : 'var(--nba-danger)' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(12,12,18,0.34)',
                  border: '1px solid rgba(200,150,60,0.14)',
                }}
              >
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.25rem', lineHeight: 1.05 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 12 }}>
          Último health check: {formatTimestamp(healthTimestamp)}
        </div>
      </section>

      <div style={{ display: 'grid', gap: 16 }} className="xl:grid-cols-[1.3fr_0.9fr]">
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section style={card}>
            <SectionTitle icon={<HeartPulse size={14} />}>Saúde do Bolão</SectionTitle>

            <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Series picks', value: stats?.series_picks ?? '—', tone: 'var(--nba-text)' },
                { label: 'Game picks', value: stats?.game_picks ?? '—', tone: 'var(--nba-text)' },
                { label: 'Séries concluídas', value: stats ? `${stats.series_completed}/${stats.series_total}` : '—', tone: 'var(--nba-success)' },
                { label: 'Jogos jogados', value: stats ? `${stats.games_played}/${stats.games_total}` : '—', tone: 'var(--nba-east)' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.14)',
                  }}
                >
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                  <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.18rem', lineHeight: 1.05 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 12 }} className="grid-cols-2 md:grid-cols-3">
              {[
                { label: 'Nomes duplicados', value: inconsistencies?.duplicate_names ?? '—', tone: (inconsistencies?.duplicate_names ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
                { label: 'Emails duplicados', value: inconsistencies?.duplicate_emails ?? '—', tone: (inconsistencies?.duplicate_emails ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
                { label: 'Sem acesso liberado', value: inconsistencies?.participants_without_access ?? '—', tone: (inconsistencies?.participants_without_access ?? 0) > 0 ? 'var(--nba-gold)' : 'var(--nba-success)' },
                { label: 'Whitelist sem participante', value: inconsistencies?.allowed_without_participant ?? '—', tone: (inconsistencies?.allowed_without_participant ?? 0) > 0 ? 'var(--nba-gold)' : 'var(--nba-success)' },
                { label: 'Series picks órfãos', value: inconsistencies?.orphaned_series_picks ?? '—', tone: (inconsistencies?.orphaned_series_picks ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
                { label: 'Game picks órfãos', value: inconsistencies?.orphaned_game_picks ?? '—', tone: (inconsistencies?.orphaned_game_picks ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.14)',
                  }}
                >
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                  <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.18rem', lineHeight: 1.05 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {overview && (
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }} className="md:grid-cols-2">
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.14)',
                  }}
                >
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 8 }}>Participantes sem acesso</div>
                  {overview.details.participants_without_access.length === 0 ? (
                    <div style={{ color: 'var(--nba-success)', fontSize: '0.76rem' }}>Nenhum caso encontrado.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {overview.details.participants_without_access.slice(0, 4).map((participant) => (
                        <div key={participant.id} style={{ color: 'var(--nba-text)', fontSize: '0.76rem' }}>
                          {participant.name} <span style={{ color: 'var(--nba-text-muted)' }}>• {participant.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.14)',
                  }}
                >
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 8 }}>Emails liberados sem participante</div>
                  {overview.details.allowed_without_participant.length === 0 ? (
                    <div style={{ color: 'var(--nba-success)', fontSize: '0.76rem' }}>Nenhum caso encontrado.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {overview.details.allowed_without_participant.slice(0, 4).map((email) => (
                        <div key={email} style={{ color: 'var(--nba-text)', fontSize: '0.76rem' }}>
                          {email}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section style={card}>
            <SectionTitle icon={<Users size={14} />}>Participantes</SectionTitle>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid rgba(200,150,60,0.14)',
                borderRadius: 10,
                padding: '10px 12px',
                background: 'rgba(12,12,18,0.34)',
                marginBottom: 12,
              }}
            >
              <Search size={15} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
              <input
                value={participantsQuery}
                onChange={(event) => setParticipantsQuery(event.target.value)}
                placeholder="Buscar por nome ou email"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--nba-text)',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            {loadingParticipants ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <LoadingBasketball size={24} />
              </div>
            ) : filteredParticipants.length === 0 ? (
              <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem' }}>Nenhum participante encontrado para esse filtro.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredParticipants.map((participant) => {
                  const isCurrentUser = participant.id === participantId
                  const hasDuplicateName = duplicateNameSet.has(participant.name.trim().toLocaleLowerCase('pt-BR'))
                  const removing = busyAction === `remove:${participant.id}`
                  const togglingAdmin = busyAction === `toggle-admin:${participant.id}`

                  return (
                    <div
                      key={participant.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(12,12,18,0.34)',
                        border: `1px solid ${hasDuplicateName ? 'rgba(231,76,60,0.22)' : 'rgba(200,150,60,0.12)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1rem', lineHeight: 1 }}>
                              {participant.name}
                            </div>
                            {participant.is_admin && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--nba-gold)', fontSize: '0.68rem', fontWeight: 700 }}>
                                <Crown size={12} />
                                Admin
                              </span>
                            )}
                            {isCurrentUser && (
                              <span style={{ color: 'var(--nba-east)', fontSize: '0.68rem', fontWeight: 700 }}>
                                Você
                              </span>
                            )}
                            {hasDuplicateName && (
                              <span style={{ color: 'var(--nba-danger)', fontSize: '0.68rem', fontWeight: 700 }}>
                                Nome duplicado
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 6 }}>
                            {participant.email}
                          </div>
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 4 }}>
                            ID: {participant.id}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            disabled={isCurrentUser || togglingAdmin}
                            onClick={() => handleToggleAdmin(participant)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: '1px solid rgba(200,150,60,0.18)',
                              background: 'rgba(200,150,60,0.08)',
                              color: isCurrentUser ? 'var(--nba-text-muted)' : 'var(--nba-gold)',
                              cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                            }}
                            title={isCurrentUser ? 'Não é permitido remover o seu próprio acesso de admin por esta tela.' : 'Alterar privilégio de admin'}
                          >
                            <ShieldCheck size={14} />
                            {togglingAdmin ? 'Salvando...' : participant.is_admin ? 'Remover admin' : 'Tornar admin'}
                          </button>

                          <button
                            disabled={isCurrentUser || removing}
                            onClick={() => handleRemoveParticipant(participant)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: '1px solid rgba(231,76,60,0.2)',
                              background: 'rgba(231,76,60,0.08)',
                              color: isCurrentUser ? 'var(--nba-text-muted)' : 'var(--nba-danger)',
                              cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              opacity: removing ? 0.7 : 1,
                            }}
                            title={isCurrentUser ? 'Não é permitido remover o seu próprio acesso por esta tela.' : 'Remover participante completamente'}
                          >
                            <UserX size={14} />
                            {removing ? 'Removendo...' : 'Remover completo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <section style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div style={card}>
            <SectionTitle icon={<Activity size={14} />}>Operações</SectionTitle>

            <div style={{ display: 'grid', gap: 10 }}>
              <button
                onClick={handleSync}
                disabled={busyAction === 'sync'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.14)',
                  background: 'rgba(12,12,18,0.34)',
                  color: 'var(--nba-text)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link2 size={15} />
                  Sincronizar dados da API
                </span>
                <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                  {busyAction === 'sync' ? 'Sincronizando...' : 'Sync'}
                </span>
              </button>

              <button
                onClick={handleRescore}
                disabled={busyAction === 'rescore'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.14)',
                  background: 'rgba(12,12,18,0.34)',
                  color: 'var(--nba-text)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RefreshCw size={15} className={busyAction === 'rescore' ? 'animate-spin' : ''} />
                  Recalcular ranking
                </span>
                <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>Rescore</span>
              </button>

              <button
                onClick={handleDailyDigest}
                disabled={busyAction === 'daily-digest'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.14)',
                  background: 'rgba(12,12,18,0.34)',
                  color: 'var(--nba-text)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquareShare size={15} />
                  Gerar resumo do grupo
                </span>
                <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                  {busyAction === 'daily-digest' ? 'Gerando...' : 'WhatsApp'}
                </span>
              </button>

              <button
                onClick={handleBackup}
                disabled={busyAction === 'backup'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.14)',
                  background: 'rgba(12,12,18,0.34)',
                  color: 'var(--nba-text)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DatabaseBackup size={15} />
                  Gerar backup operacional
                </span>
                <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                  {busyAction === 'backup' ? 'Gerando...' : 'Backup'}
                </span>
              </button>
            </div>
          </div>

          <div style={card}>
            <SectionTitle icon={<KeyRound size={14} />}>Acesso</SectionTitle>

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                flexWrap: 'wrap',
              }}
            >
              <input
                value={allowedEmailInput}
                onChange={(event) => setAllowedEmailInput(event.target.value)}
                placeholder="novo@email.com"
                style={{
                  flex: 1,
                  minWidth: 220,
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.14)',
                  background: 'rgba(12,12,18,0.34)',
                  color: 'var(--nba-text)',
                  padding: '10px 12px',
                  fontSize: '0.84rem',
                }}
              />

              <button
                onClick={handleAddAllowedEmail}
                disabled={busyAction === 'add-allowed-email'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: 'rgba(200,150,60,0.08)',
                  color: 'var(--nba-gold)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                }}
              >
                <Plus size={14} />
                {busyAction === 'add-allowed-email' ? 'Salvando...' : 'Liberar email'}
              </button>
            </div>

            {loadingAllowedEmails ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <LoadingBasketball size={24} />
              </div>
            ) : allowedEmails.length === 0 ? (
              <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem' }}>Nenhum email liberado no momento.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {allowedEmails.map((email) => (
                  <div
                    key={email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(12,12,18,0.34)',
                      border: '1px solid rgba(200,150,60,0.12)',
                    }}
                  >
                    <span style={{ color: 'var(--nba-text)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email}
                    </span>
                    <button
                      onClick={() => handleRemoveAllowedEmail(email)}
                      disabled={busyAction === `remove-email:${email}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(231,76,60,0.18)',
                        background: 'rgba(231,76,60,0.08)',
                        color: 'var(--nba-danger)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={13} />
                      {busyAction === `remove-email:${email}` ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <SectionTitle icon={<Clock3 size={14} />}>Atividade Recente</SectionTitle>
            {activity.length === 0 ? (
              <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem' }}>As próximas ações administrativas feitas por você aparecem aqui.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {activity.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(12,12,18,0.34)',
                      border: '1px solid rgba(200,150,60,0.12)',
                    }}
                  >
                    <div style={{ color: item.tone === 'danger' ? 'var(--nba-danger)' : item.tone === 'success' ? 'var(--nba-success)' : 'var(--nba-gold)', fontSize: '0.78rem', fontWeight: 700 }}>
                      {item.label}
                    </div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', marginTop: 4 }}>
                      {formatTimestamp(item.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              ...card,
              background: 'linear-gradient(135deg, rgba(231,76,60,0.10), rgba(200,150,60,0.08) 65%, rgba(19,19,26,1) 100%)',
              border: '1px solid rgba(231,76,60,0.18)',
            }}
          >
            <SectionTitle icon={<AlertTriangle size={14} />}>Cuidados</SectionTitle>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
              A remoção completa apaga os palpites do participante no bolão inteiro e remove o email de `allowed_emails` quando existir.
              A conta do usuário no Supabase Auth continua existindo. O botão de sync deve ser usado com mais cuidado enquanto o produto
              seguir em modo fictício.
            </div>
          </div>
        </section>
        </div>
      </div>
    </>
  )
}
