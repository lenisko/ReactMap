import React, { useEffect, useRef } from 'react'
import { Grid, Fab } from '@material-ui/core'
import {
  Menu, LocationOn, ZoomIn, ZoomOut, Search, NotificationsActive, Save,
} from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import Leaflet from 'leaflet'
import { useMap } from 'react-leaflet'

import useStyles from '@hooks/useStyles'
import useLocation from '@hooks/useLocation'

export default function FloatingButtons({
  toggleDrawer, toggleDialog, safeSearch, isMobile, perms, webhookMode, setWebhookMode, scanAreasOn,
}) {
  const { t } = useTranslation()
  const map = useMap()
  const classes = useStyles()
  const { lc, color } = useLocation(map)
  const fabSize = isMobile ? 'small' : 'large'
  const iconSize = isMobile ? 'small' : 'medium'
  const ref = useRef(null)
  useEffect(() => Leaflet.DomEvent.disableClickPropagation(ref.current))

  console.log(webhookMode)
  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="flex-start"
      className={classes.floatingBtn}
      ref={ref}
      style={{ width: isMobile ? 50 : 65 }}
    >
      <Grid item>
        <Fab color="primary" size={fabSize} onClick={toggleDrawer(true)} title={t('openMenu')} disabled={Boolean(webhookMode)}>
          <Menu fontSize={iconSize} />
        </Fab>
      </Grid>
      {safeSearch.length > 0 && (
        <Grid item>
          <Fab color="primary" size={fabSize} onClick={toggleDialog(true, '', 'search')} title={t('openMenu')} disabled={Boolean(webhookMode)}>
            <Search fontSize={iconSize} />
          </Fab>
        </Grid>
      )}
      {perms.webhooks && (
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={toggleDialog(true, scanAreasOn, 'webhook')} title={t('webhook')} disabled={Boolean(webhookMode)}>
          <NotificationsActive fontSize={iconSize} />
        </Fab>
      </Grid>
      )}
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => lc._onClick()} title={t('useMyLocation')} disabled={Boolean(webhookMode)}>
          <LocationOn color={color} fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => map.zoomIn()} title={t('zoomIn')} disabled={Boolean(webhookMode)}>
          <ZoomIn fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="secondary" size={fabSize} onClick={() => map.zoomOut()} title={t('zoomOut')} disabled={Boolean(webhookMode)}>
          <ZoomOut fontSize={iconSize} />
        </Fab>
      </Grid>
      <Grid item>
        <Fab color="primary" size={fabSize} onClick={() => setWebhookMode(false)} title={t('save')} disabled={Boolean(!webhookMode === 'areas')}>
          <Save fontSize={iconSize} />
        </Fab>
      </Grid>
    </Grid>
  )
}
