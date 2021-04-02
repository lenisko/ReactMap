import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import stopMarker from './stopMarker'
import questMarker from './questMarker'
import PopupContent from './Popup'

export default function Pokestop({
  bounds, globalFilters, settings, availableForms,
}) {
  const trimmedFilters = {
    pokestops: {},
  }
  if (globalFilters.pokestops.enabled) {
    Object.entries(globalFilters.pokestops.filter).forEach(filter => {
      const [id, specifics] = filter
      if (specifics.enabled) {
        trimmedFilters.pokestops[id] = specifics
      }
    })
  }
  const { data, previousData } = useQuery(Query.getAllPokestops(), {
    variables: { ...bounds, filters: trimmedFilters },
  })
  const ts = (new Date()).getTime() / 1000

  const renderedData = data || previousData
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {renderedData && renderedData.pokestops.map(pokestop => (
        <Marker
          key={pokestop.id}
          position={[pokestop.lat, pokestop.lon]}
          icon={stopMarker(pokestop, ts, globalFilters.pokestops)}
        >
          <Marker
            key={pokestop.id}
            position={[pokestop.lat, pokestop.lon]}
            icon={questMarker(pokestop, settings, availableForms)}
          >
            <Popup position={[pokestop.lat, pokestop.lon]}>
              <PopupContent pokestop={pokestop} />
            </Popup>
          </Marker>
          <Popup position={[pokestop.lat, pokestop.lon]}>
            <PopupContent pokestop={pokestop} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}
