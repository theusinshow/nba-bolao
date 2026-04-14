import axios from 'axios'

export interface NewsProviderStatus {
  provider: 'espn-rss'
  configured: boolean
  available: boolean
  reason?: string
}

export interface AnalysisNewsItem {
  id: string
  title: string
  summary: string | null
  link: string
  published_at: string | null
  source: string
}

const ESPN_NBA_RSS_URL = 'https://www.espn.com/espn/rss/nba/news'

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeXml(match[1]) : null
}

function stripHtml(value: string | null): string | null {
  if (!value) return null
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null
}

function parseRssItems(xml: string): AnalysisNewsItem[] {
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? []

  return itemMatches
    .map((item, index) => {
      const title = extractTag(item, 'title')
      const link = extractTag(item, 'link')
      if (!title || !link) return null

      const description = stripHtml(extractTag(item, 'description'))
      const pubDate = extractTag(item, 'pubDate')
      const publishedAt = pubDate && !Number.isNaN(Date.parse(pubDate))
        ? new Date(pubDate).toISOString()
        : null

      return {
        id: link || `${title}-${index}`,
        title,
        summary: description,
        link,
        published_at: publishedAt,
        source: 'ESPN',
      }
    })
    .filter((item): item is AnalysisNewsItem => item != null)
}

export async function fetchNBANews(): Promise<{ status: NewsProviderStatus; news: AnalysisNewsItem[] }> {
  try {
    const response = await axios.get<string>(ESPN_NBA_RSS_URL, {
      responseType: 'text',
      timeout: 10000,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    })

    const news = parseRssItems(response.data).slice(0, 12)

    return {
      status: {
        provider: 'espn-rss',
        configured: true,
        available: news.length > 0,
        reason: news.length > 0 ? undefined : 'O feed da ESPN respondeu sem notícias utilizáveis.',
      },
      news,
    }
  } catch (error: unknown) {
    const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined
    const reason = statusCode
      ? `Feed de notícias indisponível no momento (HTTP ${statusCode}).`
      : 'Não foi possível carregar notícias da NBA agora.'

    return {
      status: {
        provider: 'espn-rss',
        configured: true,
        available: false,
        reason,
      },
      news: [],
    }
  }
}
