import { computed, Ref } from 'vue';
import { get } from 'lodash-es';
import type { DisplayItem } from './use-m2m-items';
import type { RelationM2M } from './use-relation-m2m';
import type { Filter } from '@directus/types';

export interface UseM2MFiltersOptions {
	relationInfo: Ref<RelationM2M | null>;
	allItems: Ref<DisplayItem[]>;
	allowDuplicates: Ref<boolean>;
	userFilter: Ref<Record<string, any> | null | undefined>;
}

export function useM2MFilters(options: UseM2MFiltersOptions) {
	const { relationInfo, allItems, allowDuplicates, userFilter } = options;

	// Filter for select drawer - combine user filter + exclude already selected items
	const selectFilter = computed<Filter | null>(() => {
		if (!relationInfo.value) return userFilter.value || null;

		const filters: any[] = [];

		// Add user-defined filter if exists
		if (userFilter.value) {
			filters.push(userFilter.value);
		}

		// Exclude already selected items (unless allowDuplicates is enabled)
		if (!allowDuplicates.value) {
			const existingIds = allItems.value
				.filter((item: DisplayItem) => item.$type !== 'deleted' && item.$type !== 'unlinked' && item.$item)
				.map((item: DisplayItem) => {
					const pk = get(item.$item, relationInfo.value!.relatedPrimaryKeyField.field);
					return pk;
				})
				.filter((id: any) => id !== undefined && id !== null);

			if (existingIds.length > 0) {
				filters.push({
					[relationInfo.value.relatedPrimaryKeyField.field]: {
						_nin: existingIds,
					},
				});
			}
		}

		if (filters.length === 0) return null;
		if (filters.length === 1) return filters[0];
		return { _and: filters };
	});

	return {
		selectFilter,
	};
}
