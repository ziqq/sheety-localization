import type { FormattersInitializer } from 'typesafe-i18n'
import type { Formatters, Locales } from './i18n-types'

export const initFormatters: FormattersInitializer<Locales, Formatters> = (locale: Locales) => {

	const formatters: Formatters = {
		project: (value: number) => value === 1 ? 'project' : 'projects',
		projects: (value: number) => value === 1 ? 'project' : 'projects'
	}

	return formatters
}
