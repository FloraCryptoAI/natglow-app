// Shared profile cache — persists across remounts AND page refreshes (via localStorage)
// Used by HairFeed, HairSettings, and any other page that needs user profile data
const LS_KEY = 'natglow_user_profile'

function fromLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? {} }
  catch { return {} }
}

function toLS(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

export const profileCache = {
  uid:         null,
  displayName: null,
  avatarUrl:   null,
  prefs:       null,
  ...fromLS(),
}

export function updateProfileCache(patch) {
  Object.assign(profileCache, patch)
  toLS({
    uid:         profileCache.uid,
    displayName: profileCache.displayName,
    avatarUrl:   profileCache.avatarUrl,
    prefs:       profileCache.prefs,
  })
}
