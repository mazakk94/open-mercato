import { applyPageOverridesToManifests } from '@open-mercato/shared/modules/overrides'
import type { BackendRouteManifestEntry } from '@open-mercato/shared/modules/registry'
import type { PageRouteOverridesMap } from '@open-mercato/shared/modules/overrides'
import { enabledModules } from '../modules'

// Core ships the inbox auth-only, so without this override every authenticated user —
// the board role included — gets a Messages entry in the sidebar. `buildAdminNav` and the
// backend catch-all both read `requireFeatures` off the manifest entry, so the override
// silently stops working if its key drifts from the generated route pattern.

const messagesEntry = enabledModules.find((entry) => entry.id === 'messages')

function manifestEntry(pattern: string): BackendRouteManifestEntry {
  return { pattern, moduleId: 'messages', load: async () => (() => null) }
}

describe('messages inbox nav gate', () => {
  it('gates the inbox pages on messages.view', () => {
    const pages = messagesEntry?.overrides?.routes?.pages as PageRouteOverridesMap | undefined
    expect(pages).toBeDefined()

    const routes = applyPageOverridesToManifests(
      [manifestEntry('/backend/messages'), manifestEntry('/backend/messages/[id]')],
      pages!,
      'backend',
    )

    expect(routes.map((route) => route.requireFeatures)).toEqual([
      ['messages.view'],
      ['messages.view'],
    ])
  })
})
