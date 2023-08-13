export interface Device {
  id: string
  instance_name: string
  updated: number
  lat: number
  lon: number
  type: string
  isMad: boolean
  route: any // JSON
  radius: number
}

export interface Gym {
  id: string
  lat: number
  lon: number
  name: string
  url: string
  last_modified_timestamp: number
  raid_end_timestamp: number
  raid_spawn_timestamp: number
  raid_battle_timestamp: number
  raid_pokemon_id: number
  updated: number
  guarding_pokemon_id: number
  available_slots: number
  team_id: number
  raid_level: number
  ex_raid_eligible: boolean
  in_battle: boolean
  raid_pokemon_move_1: number
  raid_pokemon_move_2: number
  raid_pokemon_form: number
  raid_pokemon_cp: number
  raid_pokemon_alignment: number
  raid_is_exclusive: boolean
  total_cp: number
  first_seen_timestamp: number
  sponsor_id: number
  raid_pokemon_costume: number
  raid_pokemon_gender: number
  raid_pokemon_evolution: number
  ar_scan_eligible: boolean
  badge: number
  power_up_level: number
  power_up_points: number
  power_up_end_timestamp: number
}

export interface Nest {
  id: string
  lat: number
  lon: number
  pokemon_id: number
  updated: number
  type: number
  name: string
  pokemon_count: number
  pokemon_avg: number
  pokemon_form: number
  polygon_type: number
  polygon_path: string
  submitted_by: string
}

export interface Quest {
  quest_type: number
  quest_timestamp: number
  quest_target: number
  quest_conditions: string
  quest_rewards: string
  quest_template: string
  quest_reward_type: number
  quest_task: string
  quest_item_id: number
  quest_title: string
  item_amount: number
  stardust_amount: number
  quest_pokemon_id: number
  quest_form_id: number
  quest_gender_id: number
  quest_costume_id: number
  quest_shiny: number
  mega_pokemon_id: number
  mega_amount: number
  candy_pokemon_id: number
  candy_amount: number
  xl_candy_pokemon_id: number
  xl_candy_amount: number
  xp_amount: number
  with_ar: boolean
  key: string
}

export interface Invasion {
  grunt_type: number
  incident_expire_timestamp: number
  confirmed: boolean
  slot_1_pokemon_id: number
  slot_1_form: number
  slot_2_pokemon_id: number
  slot_2_form: number
  slot_3_pokemon_id: number
  slot_3_form: number
}

export interface ShowcaseEntry {
  rank: number
  pokemon_id: number
  form: number
  costume: number
  gender: number
  score: number
}

export interface ShowcaseDetails {
  total_entries: number
  last_update: number
  contest_entries: ShowcaseEntry[]
}

export interface Event {
  display_type: number
  event_expire_timestamp: number
  showcase_pokemon_id: number
  showcase_rankings: ShowcaseDetails
  showcase_ranking_standard: number
}

export interface Pokestop {
  id: string
  lat: number
  lon: number
  url: string
  name: string
  lure_id: number
  lure_expire_timestamp: number
  updated: number
  last_modified_timestamp: number
  pokestop_display: number
  first_seen_timestamp: number
  sponsor_id: number
  ar_scan_eligible: boolean
  quests: Quest[]
  invasions: Invasion[]
  events: Event[]
  power_up_level: number
  power_up_points: number
  power_up_end_timestamp: number
}

export interface Pokemon {
  id: string
  encounter_id: number
  spawnpoint_id: string
  lat: number
  lon: number
  pokemon_id: number
  form: number
  costume: number
  gender: number
  display_pokemon_id: number
  ditto_form: number
  weight: number
  height: number
  size: number
  move_1: number
  move_2: number
  cp: number
  level: number
  iv: number
  atk_iv: number
  def_iv: number
  sta_iv: number
  weather: number
  capture_1: number
  capture_2: number
  capture_3: number
  cleanPvp: any // JSON
  bestPvp: number
  seen_type: string
  changed: boolean
  expire_timestamp: number
  first_seen_timestamp: number
  expire_timestamp_verified: boolean
  updated: number
}

export interface Portal {
  id: string
  external_id: string
  lat: number
  lon: number
  name: string
  url: string
  imported: number
  updated: number
}

export interface ScanCell {
  id: string
  level: number
  center_lat: number
  center_lon: number
  updated: number
  polygon: number[][]
}

export interface Spawnpoint {
  id: string
  lat: number
  lon: number
  updated: number
  despawn_sec: number
}

export interface Weather {
  id: string
  level: number
  latitude: number
  longitude: number
  gameplay_condition: number
  wind_direction: number
  cloud_level: number
  rain_level: number
  wind_level: number
  snow_level: number
  fog_level: number
  special_effect_level: number
  severity: boolean
  warn_weather: boolean
  updated: number
  polygon: number[][]
}

export interface ScannerApi {
  status: string
  message: string
}

export interface Waypoint {
  lat_degrees: number
  lng_degrees: number
  elevation_in_meters: number
}

export interface Route {
  id: string
  name: string
  description: string
  distance_meters: number
  duration_seconds: number
  start_fort_id: string
  start_lat: number
  start_lon: number
  start_image: string
  end_fort_id: string
  end_lat: number
  end_lon: number
  end_image: string
  image: string
  image_border_color: string
  reversible: boolean
  tags: string[]
  type: number
  updated: number
  version: number
  waypoints: Waypoint[]
}
