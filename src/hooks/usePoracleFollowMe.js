// @ts-check
import { useEffect, useRef, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { useMap } from 'react-leaflet'

import { useStorage } from '@store/useStorage'
import { SET_HUMAN } from '@services/queries/webhook'

/**
 * @typedef {{ enabled: boolean, minimumAccuracy: number, sendEvery: number } | null} PoracleFollowMeConfig
 */

/**
 * Hook to send location updates to Poracle when Follow Me is enabled
 * @param {PoracleFollowMeConfig} config - Config object with enabled, minimumAccuracy, sendEvery
 */
export function usePoracleFollowMe(config) {
  const hasPermission = config?.enabled
  const map = useMap()
  const poracleFollowMeEnabled = useStorage((s) => s.poracleFollowMe)
  const lastSentRef = useRef(0)
  const lastLocationRef = useRef(/** @type {[number, number] | null} */ (null))

  const [setLocation] = useMutation(SET_HUMAN)

  const sendLocation = useCallback(
    /** @param {[number, number]} location */
    (location) => {
      const now = Date.now()
      const [lat, lng] = location
      const lastLocation = lastLocationRef.current

      // Check if location has changed
      const hasChanged =
        !lastLocation || lastLocation[0] !== lat || lastLocation[1] !== lng

      // Check if enough time has passed since last send (sendEvery is in seconds)
      const throttleMs = (config?.sendEvery ?? 30) * 1000
      const canSend = now - lastSentRef.current >= throttleMs

      if (hasChanged && canSend) {
        lastSentRef.current = now
        lastLocationRef.current = location

        setLocation({
          variables: {
            category: 'setLocation',
            data: location,
            status: 'POST',
          },
        })
      }
    },
    [setLocation, config],
  )

  useEffect(() => {
    if (!hasPermission || !poracleFollowMeEnabled) {
      return
    }

    /** @param {import('leaflet').LocationEvent} e */
    const handleLocationFound = (e) => {
      const { accuracy, latlng } = e

      // Only send if accuracy is good enough
      const maxAccuracy = config?.minimumAccuracy ?? 100
      if (accuracy <= maxAccuracy) {
        sendLocation([latlng.lat, latlng.lng])
      }
    }

    map.on('locationfound', handleLocationFound)

    return () => {
      map.off('locationfound', handleLocationFound)
    }
  }, [map, hasPermission, poracleFollowMeEnabled, sendLocation, config])
}
