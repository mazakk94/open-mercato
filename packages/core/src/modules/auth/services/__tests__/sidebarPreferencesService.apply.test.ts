import { applySidebarPreference } from '@open-mercato/core/modules/auth/services/sidebarPreferencesService'

type TestGroup = {
  id: string
  name: string
  defaultName: string
  weight: number
  items: []
}

function group(id: string, weight: number): TestGroup {
  return {
    id,
    name: id,
    defaultName: id,
    weight,
    items: [],
  }
}

describe('applySidebarPreference layered ordering', () => {
  it('preserves the incoming role order when the user layer has no explicit order', () => {
    const roleOrderedGroups = [
      group('risk_management.nav.group', 8_000_000),
      group('customers.nav.group', 0),
      group('catalog.nav.group', 1_000_000),
    ]

    const applied = applySidebarPreference(roleOrderedGroups, {
      version: 2,
      groupOrder: [],
      groupLabels: {},
      itemLabels: {},
      hiddenItems: [],
      itemOrder: {},
    })

    expect(applied.map(({ id }) => id)).toEqual([
      'risk_management.nav.group',
      'customers.nav.group',
      'catalog.nav.group',
    ])
  })

  it('still lets an explicit user order override the incoming role order', () => {
    const roleOrderedGroups = [
      group('risk_management.nav.group', 8_000_000),
      group('customers.nav.group', 0),
      group('catalog.nav.group', 1_000_000),
    ]

    const applied = applySidebarPreference(roleOrderedGroups, {
      version: 2,
      groupOrder: ['catalog.nav.group', 'customers.nav.group'],
    })

    expect(applied.map(({ id }) => id)).toEqual([
      'catalog.nav.group',
      'customers.nav.group',
      'risk_management.nav.group',
    ])
  })
})
