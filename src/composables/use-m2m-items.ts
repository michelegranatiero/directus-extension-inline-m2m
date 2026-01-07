import { ref, Ref, computed } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { getEndpoint } from '@directus/utils';
import { get } from 'lodash-es';
import type { RelationM2M } from './use-relation-m2m';

export interface DisplayItem {
	$index: number;
	$type: 'existing' | 'created' | 'updated' | 'deleted' | 'unlinked';
	$item: Record<string, any>;
	$edits: Record<string, any>;
	$loading?: boolean;
	$junctionId?: string | number;
	$isExistingLink?: boolean;
	$originalSort?: number;
}

export interface UseM2MItemsOptions {
	relationInfo: Ref<RelationM2M | null>;
	primaryKey: Ref<string | number>;
	limit: Ref<number>;
	notificationsStore: any;
	t: (key: string, params?: any) => string;
}

export function useM2MItems(options: UseM2MItemsOptions) {
	const { relationInfo, primaryKey, limit, notificationsStore, t } = options;
	const api = useApi();

	// State
	const loading = ref(false);
	const allItems = ref<DisplayItem[]>([]);
	const visibleCount = ref(limit.value);
	const isFetching = ref(false);
	const isDirty = ref(false);

	// Check if parent item is new
	const isParentNew = computed(() => {
		return primaryKey.value === '+' || primaryKey.value === null || primaryKey.value === undefined;
	});

	// Sort field
	const sortField = computed(() => relationInfo.value?.sortField);

	// Visible items (paginated)
	const visibleItems = computed(() => allItems.value.slice(0, visibleCount.value));

	// Pagination
	const totalItemCount = computed(() => allItems.value.length);
	const hasMoreItems = computed(() => totalItemCount.value > visibleCount.value);
	const remainingCount = computed(() => totalItemCount.value - visibleCount.value);

	// Get unique key for item
	function getItemKey(item: DisplayItem, index: number): string {
		return item.$junctionId ? String(item.$junctionId) : `new-${index}`;
	}

	// Fetch items from API
	async function fetchItems() {
		if (!relationInfo.value) return;

		isFetching.value = true;

		if (isParentNew.value) {
			allItems.value = [];
			loading.value = false;
			isFetching.value = false;
			return;
		}

		loading.value = true;

		try {
			const junctionCollection = relationInfo.value.junctionCollection.collection;
			const junctionFieldName = relationInfo.value.junctionField.field;
			const junctionPKField = relationInfo.value.junctionPrimaryKeyField.field;
			const reverseJunctionFieldName = relationInfo.value.reverseJunctionField.field;

			const fieldsParam = `*,${junctionFieldName}.*`;
			const sortParam = sortField.value || junctionPKField;

			const endpoint = getEndpoint(junctionCollection);

			const response = await api.get(endpoint, {
				params: {
					fields: fieldsParam,
					sort: sortParam,
					limit: -1,
					filter: {
						[reverseJunctionFieldName]: {
							_eq: primaryKey.value,
						},
					},
				},
			});

			const items: DisplayItem[] = (response.data.data || []).map(
				(junctionItem: Record<string, any>, idx: number) => {
					const relatedItem = junctionItem[junctionFieldName] || {};
					const originalSort = sortField.value ? junctionItem[sortField.value] : idx;
					return {
						$index: idx,
						$type: 'existing' as const,
						$item: relatedItem,
						$edits: {},
						$loading: false,
						$junctionId: junctionItem[junctionPKField],
						$originalSort: originalSort,
					};
				}
			);

			allItems.value = items;
			isDirty.value = false;
		} catch (err: any) {
			const errorMessage = err?.response?.data?.errors?.[0]?.message || err?.message || t('unexpected_error');
			notificationsStore.add({
				title: t('unexpected_error'),
				text: errorMessage,
				type: 'error',
			});
		} finally {
			loading.value = false;
			setTimeout(() => {
				isFetching.value = false;
			}, 0);
		}
	}

	// Add new item
	function addNewItem() {
		const newIndex = allItems.value.length;

		const newItem: DisplayItem = {
			$index: newIndex,
			$type: 'created',
			$item: {},
			$edits: {},
			$loading: false,
		};

		allItems.value.push(newItem);

		if (newIndex >= visibleCount.value) {
			visibleCount.value = newIndex + 1;
		}

		isDirty.value = true;
		return { item: newItem, index: newIndex };
	}

	// Remove new item (not yet saved)
	function removeNewItem(index: number) {
		const item = allItems.value[index];

		if (!item) return;

		if (item.$type !== 'created') {
			console.warn('removeNewItem called on non-created item');
			return;
		}

		allItems.value.splice(index, 1);
		reindex();
		isDirty.value = true;
	}

	// Unlink item (remove junction, keep related item)
	function unlinkItem(index: number) {
		const item = allItems.value[index];

		if (!item) return;

		if (item.$type === 'created') {
			removeNewItem(index);
			return;
		}

		item.$type = 'unlinked';
		isDirty.value = true;
	}

	// Delete item (remove junction AND related item)
	async function deleteItem(index: number) {
		const item = allItems.value[index];

		if (!item || !relationInfo.value) return;

		item.$type = 'deleted';

		const relatedPKField = relationInfo.value.relatedPrimaryKeyField.field;
		const relatedPK = get(item.$item, relatedPKField);

		if (relatedPK !== undefined && relatedPK !== null && relatedPK !== '+') {
			try {
				const endpoint = getEndpoint(relationInfo.value.relatedCollection.collection);
				await api.delete(`${endpoint}/${relatedPK}`);
			} catch (err: any) {
				const errorMessage = err?.response?.data?.errors?.[0]?.message || err?.message || '';
				const isForeignKeyError =
					errorMessage.includes('foreign key constraint') ||
					errorMessage.includes('violates foreign key') ||
					errorMessage.includes('FOREIGN KEY');

				if (isForeignKeyError) {
					notificationsStore.add({
						title: t('interfaces.inline-m2m.delete-blocked'),
						text: t('interfaces.inline-m2m.delete-blocked-description'),
						type: 'warning',
						dialog: true,
						persist: true,
					});
				} else {
					const errorMsg = err?.response?.data?.errors?.[0]?.message || err?.message || t('unexpected_error');
					notificationsStore.add({
						title: t('unexpected_error'),
						text: errorMsg,
						type: 'error',
					});
				}

				item.$type = Object.keys(item.$edits).length > 0 ? 'updated' : 'existing';
				return;
			}
		}

		isDirty.value = true;
	}

	// Undo delete/unlink
	function undoDelete(index: number) {
		const item = allItems.value[index];
		if (!item) return;
		item.$type = Object.keys(item.$edits).length > 0 ? 'updated' : 'existing';
		isDirty.value = true;
	}

	// Handle item edit
	function onItemEdited(index: number) {
		const item = allItems.value[index];

		if (!item) return;

		if (item.$type === 'existing' && Object.keys(item.$edits).length > 0) {
			item.$type = 'updated';
		} else if (item.$type === 'updated' && Object.keys(item.$edits).length === 0) {
			item.$type = 'existing';
		}

		isDirty.value = true;
	}

	// Select existing items
	async function selectExistingItems(selectedIds: (string | number)[]) {
		if (!relationInfo.value || !selectedIds.length) return;

		const relatedPKField = relationInfo.value.relatedPrimaryKeyField.field;
		const endpoint = getEndpoint(relationInfo.value.relatedCollection.collection);

		try {
			const response = await api.get(endpoint, {
				params: {
					fields: '*',
					filter: {
						[relatedPKField]: {
							_in: selectedIds,
						},
					},
				},
			});

			const fetchedItems = response.data.data || [];
			const addedItems: Array<{ item: DisplayItem; index: number }> = [];

			fetchedItems.forEach((relatedItem: Record<string, any>) => {
				const newIndex = allItems.value.length;

				const newItem: DisplayItem = {
					$index: newIndex,
					$type: 'created',
					$item: relatedItem,
					$edits: {},
					$loading: false,
					$isExistingLink: true,
				};

				allItems.value.push(newItem);
				addedItems.push({ item: newItem, index: newIndex });

				if (newIndex >= visibleCount.value) {
					visibleCount.value = newIndex + 1;
				}
			});

			isDirty.value = true;
			return addedItems;
		} catch (err: any) {
			const errorMessage = err?.response?.data?.errors?.[0]?.message || err?.message || t('unexpected_error');
			notificationsStore.add({
				title: t('unexpected_error'),
				text: errorMessage,
				type: 'error',
			});
			return [];
		}
	}

	// Reindex items after changes
	function reindex() {
		allItems.value.forEach((item: DisplayItem, idx: number) => {
			item.$index = idx;
		});
	}

	// Handle drag end
	function onDragEnd() {
		reindex();
		isDirty.value = true;
	}

	// Show more items
	function showMore() {
		visibleCount.value = Math.min(visibleCount.value + limit.value, totalItemCount.value);
	}

	// Get related primary key
	function getRelatedPrimaryKey(item: DisplayItem): string | number {
		if (!relationInfo.value) return '+';
		const relatedPKField = relationInfo.value.relatedPrimaryKeyField.field;
		return get(item.$item, relatedPKField) ?? '+';
	}

	return {
		// State
		loading,
		allItems,
		visibleCount,
		isFetching,
		isDirty,
		isParentNew,
		sortField,
		visibleItems,
		totalItemCount,
		hasMoreItems,
		remainingCount,

		// Methods
		getItemKey,
		fetchItems,
		addNewItem,
		removeNewItem,
		unlinkItem,
		deleteItem,
		undoDelete,
		onItemEdited,
		selectExistingItems,
		reindex,
		onDragEnd,
		showMore,
		getRelatedPrimaryKey,
	};
}
