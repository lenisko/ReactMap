// @ts-check
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'

import { ThemeToggle } from '@components/inputs/ThemeToggle'
import { I } from '@components/I'

/**
 * @param {string} ua
 * @returns {string}
 */
function parseUserAgent(ua) {
  if (!ua) return 'Unknown'
  const browser =
    ua.match(
      /(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[/\s]([\d.]+)/,
    )?.[0] || ''
  const os =
    ua.match(/(Windows|Mac OS X|Linux|Android|iOS|iPhone)[\s/]?[\d._]*/)?.[0] ||
    ''
  return [browser, os].filter(Boolean).join(' — ') || ua.slice(0, 60)
}

/**
 * @param {number} ts
 * @returns {string}
 */
function timeAgo(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function SessionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sessions, setSessions] = React.useState([])
  const [maxSessions, setMaxSessions] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions/my')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
        setMaxSessions(data.maxSessions)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchSessions()
  }, [])

  const deleteSession = async (/** @type {string} */ sessionId) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchSessions()
      }
    } catch {
      // ignore
    }
  }

  const canContinue = sessions.length <= maxSessions

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100cqh"
      width="100%"
    >
      <Box position="absolute" top={10} right={10}>
        <ThemeToggle />
      </Box>
      <Card elevation={10} sx={{ maxWidth: 520, width: '100%', mx: 2 }}>
        <CardContent sx={{ px: 4, pt: 4 }}>
          <Typography variant="h5" align="center" gutterBottom>
            {t('too_many_sessions')}
          </Typography>
          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            pb={2}
          >
            {t('too_many_sessions_desc', {
              max: maxSessions,
              count: sessions.length,
            })}
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress />
            </Box>
          ) : (
            <List dense>
              {sessions.map((s) => (
                <ListItem
                  key={s.session_id}
                  secondaryAction={
                    !s.current && (
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => deleteSession(s.session_id)}
                        title={t('delete')}
                      >
                        <I className="fas fa-trash" size="small" />
                      </IconButton>
                    )
                  }
                  sx={{
                    bgcolor: s.current ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{parseUserAgent(s.userAgent)}</span>
                        {s.current && (
                          <Chip
                            label={t('current')}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      s.createdAt ? timeAgo(s.createdAt) : t('unknown')
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
        <CardActions sx={{ p: 4, pt: 0, justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            color="primary"
            disabled={!canContinue}
            onClick={() => navigate('/')}
          >
            {t('continue')}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {sessions.length} / {maxSessions}
          </Typography>
        </CardActions>
      </Card>
    </Box>
  )
}
