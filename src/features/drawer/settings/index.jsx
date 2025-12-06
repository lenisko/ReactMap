// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListSubheader from '@mui/material/ListSubheader'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TranslateIcon from '@mui/icons-material/Translate'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import InsightsIcon from '@mui/icons-material/Insights'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'
import LogoDevIcon from '@mui/icons-material/LogoDev'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'

import { useMemory } from '@store/useMemory'
import { toggleDialog } from '@store/useLayoutStore'
import {
  HAS_API,
  getPermission,
  requestPermission,
} from '@services/desktopNotification'
import { FAB_BUTTONS } from '@services/queries/config'
import { LocaleSelection } from '@components/inputs/LocaleSelection'
import { DividerWithMargin } from '@components/StyledDivider'
import { BoolToggle } from '@components/inputs/BoolToggle'
import { BasicListButton } from '@components/inputs/BasicListButton'

import { DrawerActions } from '../components/Actions'
import { GeneralSetting } from './General'
import { UAssetSetting } from './UAssets'
import { HolidaySetting } from './Holiday'

export function Settings() {
  const { t } = useTranslation()
  const { data } = useQuery(FAB_BUTTONS, { fetchPolicy: 'cache-first' })

  const separateDrawerActions = useMemory(
    (s) => s.config.general.separateDrawerActions,
  )
  const staticSettings = useMemory((s) => s.settings)

  const poracleFollowMeEnabled = data?.fabButtons?.poracleFollowMe?.enabled

  const [showFollowMeWarning, setShowFollowMeWarning] = React.useState(false)

  /** @type {import('@mui/material').SwitchProps['onChange']} */
  const handleFollowMeChange = React.useCallback((_, checked) => {
    if (checked) {
      setShowFollowMeWarning(true)
    }
  }, [])

  const closeFollowMeWarning = React.useCallback(() => {
    setShowFollowMeWarning(false)
  }, [])

  return (
    <>
      <ListSubheader>{t('general')}</ListSubheader>
      {Object.keys(staticSettings).map((setting) => (
        <GeneralSetting key={setting} setting={setting} />
      ))}
      <ListItem dense>
        <ListItemIcon>
          <TranslateIcon />
        </ListItemIcon>
        <LocaleSelection />
      </ListItem>
      <BoolToggle field="darkMode">
        <ListItemIcon>
          <Brightness7Icon />
        </ListItemIcon>
      </BoolToggle>
      {poracleFollowMeEnabled && (
        <BoolToggle field="poracleFollowMe" onChange={handleFollowMeChange}>
          <ListItemIcon>
            <MyLocationIcon />
          </ListItemIcon>
        </BoolToggle>
      )}
      <Dialog open={showFollowMeWarning} onClose={closeFollowMeWarning}>
        <DialogContent>
          <DialogContentText>
            {t('poracle_follow_me_warning')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFollowMeWarning} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
      {HAS_API && (
        <BasicListButton
          disabled={!HAS_API}
          onClick={async () => {
            await requestPermission()
            toggleDialog(true, 'notifications', 'options')()
          }}
          label="desktop_notifications"
        >
          {getPermission() === 'granted' ? (
            <NotificationsActiveIcon />
          ) : (
            <NotificationsOffIcon color="error" />
          )}
        </BasicListButton>
      )}
      <HolidaySetting />
      <DividerWithMargin />
      <UAssetSetting asset="icons" />
      <UAssetSetting asset="audio" />
      {process.env.NODE_ENV === 'development' && (
        <>
          <ListSubheader>{t('developer')}</ListSubheader>
          <BoolToggle field="profiling">
            <ListItemIcon>
              <InsightsIcon />
            </ListItemIcon>
          </BoolToggle>
          <BoolToggle field="stateTraceLog">
            <ListItemIcon>
              <LogoDevIcon />
            </ListItemIcon>
          </BoolToggle>
          <DividerWithMargin />
        </>
      )}
      {!separateDrawerActions && (
        <>
          <DividerWithMargin />
          <DrawerActions />
        </>
      )}
    </>
  )
}
