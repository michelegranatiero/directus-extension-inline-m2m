<template>
	<v-notice v-if="!readAllowed && !isParentNew" type="warning">
		{{ t('interfaces.inline-m2m.no-read-permission') }}
	</v-notice>
	<v-notice v-else-if="!relationInfo" type="warning">
		{{ t('relationship_not_setup') }}
	</v-notice>
	<div v-else class="m2m-wrapper">
		<v-notice v-if="!createAllowed && !updateAllowed" type="warning">
			{{ t('interfaces.inline-m2m.no-update-permission') }}
		</v-notice>

		<!-- Items list -->
		<draggable
			v-if="visibleItems.length > 0"
			v-model="draggableItems"
			:disabled="disabled"
			:item-key="(item: DisplayItem) => getItemKey(item, item.$index)"
			handle=".drag-handle"
			:animation="150"
			direction="vertical"
			ghost-class="drag-ghost"
			chosen-class="drag-chosen"
			drag-class="drag-active"
			class="items-list"
			@end="handleDragEnd"
		>
			<template #item="{ element: item, index }">
				<m2m-item-card
					:key="getItemKey(item, index)"
					:item="item"
					:title="getItemTitle(item, index)"
					:is-expanded="expandedItems[getItemKey(item, index)] || false"
					:disabled="disabled || false"
					:delete-allowed="deleteAllowed"
					:primary-key="getRelatedPrimaryKey(item)"
					:fields="relatedFields"
					@toggle-expand="toggleExpand(getItemKey(item, index))"
					@unlink="handleUnlinkItem(index)"
					@delete="handleDeleteItem(index)"
					@remove="handleRemoveNewItem(index)"
					@undo="handleUndoDelete(index)"
					@edit="handleItemEdited(index)"
				/>
			</template>
		</draggable>

		<!-- Empty state -->
		<v-notice v-else-if="!loading" type="info" class="empty-notice">
			{{ t('interfaces.inline-m2m.no-items') }}
		</v-notice>

		<!-- Loading state -->
		<v-progress-linear v-if="loading" indeterminate />

		<!-- Show more button -->
		<v-button
			v-if="hasMoreItems"
			class="show-more-button"
			secondary
			small
			@click="showMore"
		>
			{{ t('interfaces.inline-m2m.show-more', { count: remainingCount }) }}
		</v-button>

		<!-- Action buttons -->
		<div class="action-buttons">
			<!-- Add new item button -->
			<v-button
				v-if="enableCreate && createAllowed && !disabled"
				class="add-button"
				@click="addNewItem"
			>
				<v-icon name="add" left />
				{{ t('interfaces.inline-m2m.create-new') }}
			</v-button>

			<!-- Add existing item button -->
			<v-button
				v-if="enableSelect && !disabled"
				class="add-existing-button"
				@click="selectModalActive = true"
			>
				<v-icon name="playlist_add" left />
				{{ t('interfaces.inline-m2m.add-existing') }}
			</v-button>
		</div>

		<!-- Select existing items drawer -->
		<drawer-collection
			v-if="enableSelect && !disabled && relationInfo"
			v-model:active="selectModalActive"
			:collection="relationInfo.relatedCollection.collection"
			:selection="[]"
			:filter="selectFilter"
			multiple
			@input="selectExistingItems"
		/>
	</div>
</template>

<script lang="ts" setup>
import { useStores } from '@directus/extensions-sdk';
import { computed, ref, toRefs, watch } from 'vue';
import { useI18n } from '@/composables/use-i18n';
import { isNil } from 'lodash-es';
import { useRelationM2M } from '@/composables/use-relation-m2m';
import { usePermissions } from '@/composables/use-permissions';
import { useM2MItems, type DisplayItem } from '@/composables/use-m2m-items';
import { useM2MEmit } from '@/composables/use-m2m-emit';
import { useM2MDisplay } from '@/composables/use-m2m-display';
import { useM2MFilters } from '@/composables/use-m2m-filters';
import type { Field } from '@directus/types';
import DrawerCollection from './drawer-collection.vue';
import M2mItemCard from './components/m2m-item-card.vue';
import draggable from 'vuedraggable';

interface Props {
	value?: Record<string, any>[] | null;
	primaryKey: string | number;
	collection: string;
	field: string;
	disabled?: boolean;
	template?: string | null;
	enableCreate?: boolean;
	enableSelect?: boolean;
	limit?: number;
	allowDuplicates?: boolean;
	filter?: Record<string, any> | null;
}

const props = withDefaults(defineProps<Props>(), {
	value: null,
	primaryKey: '+',
	disabled: false,
	template: null,
	enableCreate: true,
	enableSelect: true,
	limit: 10,
	allowDuplicates: false,
	filter: null,
});

const emit = defineEmits<{
	(e: 'input', value: any): void;
}>();

const { collection, field } = toRefs(props);
const { t } = useI18n();

const { relationInfo } = useRelationM2M(collection, field);

const { usePermissionsStore, useNotificationsStore } = useStores();
const { hasPermission } = usePermissionsStore();
const notificationsStore = useNotificationsStore();

// State
const selectModalActive = ref(false);

// Permissions for related collection
const dummyItem = ref({});
const isNewDummy = ref(true);

const {
	fields: fieldsWithPermissions,
	createAllowed,
	updateAllowed,
	deleteAllowed,
} = usePermissions(
	computed(() => relationInfo.value?.relatedCollection.collection ?? ''),
	dummyItem,
	isNewDummy,
);

const readAllowed = computed(() => {
	if (!relationInfo.value) return false;
	
	const junctionReadAllowed = hasPermission(relationInfo.value.junctionCollection.collection, 'read');
	const relatedReadAllowed = hasPermission(relationInfo.value.relatedCollection.collection, 'read');
	
	return junctionReadAllowed && relatedReadAllowed;
});

// Use M2M Items composable
const {
	loading,
	allItems,
	visibleCount,
	isFetching,
	isDirty,
	isParentNew,
	sortField,
	visibleItems,
	hasMoreItems,
	remainingCount,
	getItemKey,
	fetchItems,
	addNewItem: addNewItemInternal,
	removeNewItem,
	unlinkItem,
	deleteItem,
	undoDelete,
	onItemEdited,
	selectExistingItems: selectExistingItemsInternal,
	onDragEnd,
	showMore,
	getRelatedPrimaryKey,
} = useM2MItems({
	relationInfo,
	primaryKey: toRefs(props).primaryKey,
	limit: toRefs(props).limit,
	notificationsStore,
	t,
});

// Use M2M Display composable
const {
	expandedItems,
	toggleExpand,
	autoExpandItem,
	getItemTitle,
} = useM2MDisplay({
	relationInfo,
	template: toRefs(props).template,
	t,
});

// Use M2M Emit composable
const { emitValue: emitValueInternal } = useM2MEmit({
	relationInfo,
	allItems,
	isDirty,
	sortField,
});

// Use M2M Filters composable
const { selectFilter } = useM2MFilters({
	relationInfo,
	allItems,
	allowDuplicates: toRefs(props).allowDuplicates,
	userFilter: toRefs(props).filter,
});

// Filter out circular fields
const relatedFields = computed(() => {
	if (!relationInfo.value) return [];

	let fields = fieldsWithPermissions.value;

	if (!isNil(relationInfo.value.relation.meta?.one_field)) {
		fields = fields.filter(
			(f: Field) => f.field !== relationInfo.value?.relation.meta?.one_field
		);
	}

	return fields;
});

// Draggable model - uses get/set to handle drag and drop properly
const draggableItems = computed({
	get: () => visibleItems.value,
	set: (newOrder: DisplayItem[]) => {
		// Get items that are not visible (beyond pagination)
		const hiddenItems = allItems.value.slice(visibleCount.value);
		// Combine the new order with hidden items
		allItems.value = [...newOrder, ...hiddenItems];
	}
});

// Watch for relation info and primary key changes, then fetch items
watch(
	[relationInfo, () => props.primaryKey],
	() => {
		if (relationInfo.value) {
			fetchItems();
		}
	},
	{ immediate: true }
);

// Watch for external value reset (after save or discard)
watch(
	() => props.value,
	(newValue: any, oldValue: any) => {
		if (isFetching.value) return;
		
		const wasChanges = oldValue && typeof oldValue === 'object' && 
			('create' in oldValue || 'update' in oldValue || 'delete' in oldValue);
		const isReset = newValue === null || newValue === undefined || Array.isArray(newValue);
		
		if (wasChanges && isReset && !isParentNew.value) {
			fetchItems();
		}
	}
);

// Wrapper functions that call composable methods and emit changes
function addNewItem() {
	const result = addNewItemInternal();
	if (result) {
		autoExpandItem(result.item, result.index);
		emitValue();
	}
}

async function selectExistingItems(selectedIds: (string | number)[] | null) {
	if (!selectedIds) return;
	const addedItems = await selectExistingItemsInternal(selectedIds);
	if (addedItems && addedItems.length > 0) {
		addedItems.forEach(({ item, index }) => {
			autoExpandItem(item, index);
		});
		emitValue();
	}
}

function handleRemoveNewItem(index: number) {
	removeNewItem(index);
	emitValue();
}

function handleUnlinkItem(index: number) {
	unlinkItem(index);
	emitValue();
}

async function handleDeleteItem(index: number) {
	await deleteItem(index);
	emitValue();
}

function handleUndoDelete(index: number) {
	undoDelete(index);
	emitValue();
}

function handleItemEdited(index: number) {
	onItemEdited(index);
	emitValue();
}

function handleDragEnd() {
	onDragEnd();
	emitValue();
}

function emitValue() {
	const value = emitValueInternal();
	emit('input', value);
}
</script>

<style lang="scss" scoped>
.m2m-wrapper {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 12px;
	border: var(--theme--border-width, 2px) solid var(--theme--form--field--input--border-color, var(--border-normal));
	border-radius: var(--theme--border-radius, 6px);
	background-color: var(--theme--form--field--input--background, var(--background-page));
}

.items-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

/* Dragging styles */
.item-card {
	transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.drag-ghost {
	opacity: 0.4;
}

.m2m-wrapper :deep(.drag-ghost) {
	/* Override global drag-ghost rotation from other extensions */
	transform: none !important;
}

.drag-chosen {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	z-index: 10;
}

.drag-active {
	opacity: 1 !important;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
	z-index: 100;
}

.empty-notice {
	margin-bottom: 8px;
}

.action-buttons {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	padding-top: 4px;
}

.add-button,
.add-existing-button {
	flex-shrink: 0;
}

.show-more-button {
	align-self: center;
}
</style>
