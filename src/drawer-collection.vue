<script setup lang="ts">
import { computed, ref, toRefs, unref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Filter } from '@directus/types';
import { mergeFilters } from '@directus/utils';
import { useCollection, useLayout } from '@directus/composables';
import SearchInput from './components/search-input.vue';
import PrivateViewHeaderBarActionButton from './components/private-view-header-bar-action-button.vue';

// Simple isEqual for arrays of primitives
function isEqual(arr1: any, arr2: any): boolean {
	if (arr1 === arr2) return true;
	if (!Array.isArray(arr1) || !Array.isArray(arr2)) return arr1 === arr2;
	if (arr1.length !== arr2.length) return false;
	const sorted1 = [...arr1].sort();
	const sorted2 = [...arr2].sort();
	return sorted1.every((val, index) => val === sorted2[index]);
}

const props = withDefaults(
	defineProps<{
		active?: boolean;
		selection?: (number | string)[];
		collection: string;
		multiple?: boolean;
		filter?: Filter | null;
	}>(),
	{
		selection: () => [],
	}
);

const emit = defineEmits<{
	(e: 'update:active', value: boolean): void;
	(e: 'input', value: (number | string)[] | null): void;
}>();

const { t } = useI18n();

const { save, cancel } = useActions();
const { internalActive } = useActiveState();
const { internalSelection, onSelect, hasSelectionChanged } = useSelection();

const { collection } = toRefs(props);

const { info: collectionInfo } = useCollection(collection);

// Preset values (simplified for extension - no auto-save)
const layout = ref('tabular');
const layoutOptions = ref({});
const layoutQuery = ref({});
const search = ref<string | null>(null);
const presetFilter = ref<Filter | null>(null);

// This is a local copy of the layout. This means that we can sync it the layout without
// having use-preset auto-save the values
const localLayout = ref(layout.value || 'tabular');
const localOptions = ref(layoutOptions.value);
const localQuery = ref(layoutQuery.value);

const layoutSelection = computed<any>({
	get() {
		return internalSelection.value;
	},
	set(newFilters) {
		onSelect(newFilters);
	},
});

const { layoutWrapper } = useLayout(layout);

function useActiveState() {
	const localActive = ref(false);

	const internalActive = computed({
		get() {
			return props.active === undefined ? localActive.value : props.active;
		},
		set(newActive: boolean) {
			localActive.value = newActive;
			emit('update:active', newActive);
		},
	});

	return { internalActive };
}

function useSelection() {
	const localSelection = ref<(string | number)[] | null>(null);
	const initialSelection = ref<(string | number)[] | null>(null);

	const internalSelection = computed({
		get() {
			if (localSelection.value === null) {
				return props.selection;
			}

			return localSelection.value;
		},
		set(newSelection: (string | number)[]) {
			localSelection.value = newSelection;
		},
	});

	const hasSelectionChanged = computed(() => {
		return !isEqual(internalSelection.value, initialSelection.value);
	});

	watch(
		() => props.active,
		(active) => {
			localSelection.value = null;

			if (active) {
				// Store a copy of the initial selection when the drawer opens
				initialSelection.value = Array.isArray(internalSelection.value)
					? [...internalSelection.value]
					: internalSelection.value;
			}
		}
	);

	return { internalSelection, onSelect, hasSelectionChanged };

	function onSelect(newSelection: (string | number)[]) {
		if (newSelection.length === 0) {
			localSelection.value = [];
			return;
		}

		if (props.multiple === true) {
			localSelection.value = newSelection;
		} else {
			localSelection.value = [newSelection[newSelection.length - 1] as string | number];
		}
	}
}

function useActions() {
	return { save, cancel };

	function save() {
		if (!hasSelectionChanged.value) return;
		emit('input', unref(internalSelection));
		internalActive.value = false;
	}

	function cancel() {
		internalActive.value = false;
	}
}
</script>

<template>
	<component
		:is="layoutWrapper"
		v-slot="{ layoutState }"
		v-model:selection="layoutSelection"
		v-model:layout-options="localOptions"
		v-model:layout-query="localQuery"
		:filter="mergeFilters(presetFilter, filter ?? null)"
		:filter-user="presetFilter"
		:filter-system="filter"
		:search="search"
		:collection="collection"
		select-mode
		:show-select="multiple ? 'multiple' : 'one'"
	>
		<v-drawer
			v-model="internalActive"
			:title="t('select_item')"
			:icon="collectionInfo!.icon"
			@cancel="cancel"
			@apply="save"
		>
			<template #subtitle>
				<v-breadcrumb :items="[{ name: collectionInfo!.name, disabled: true }]" />
			</template>

			<template #actions:prepend>
				<component :is="`layout-actions-${localLayout}`" v-bind="layoutState" />
			</template>

			<template #actions>
				<search-input v-model="search" v-model:filter="presetFilter" :collection="collection" />

				<private-view-header-bar-action-button
					v-tooltip.bottom="t('save')"
					:disabled="!hasSelectionChanged"
					icon="check"
					@click="save"
				/>
			</template>

			<div class="layout">
				<component :is="`layout-${localLayout}`" v-bind="layoutState">
					<template #no-results>
						<v-info :title="t('item_count', 0)" :icon="collectionInfo!.icon" center />
					</template>

					<template #no-items>
						<v-info :title="t('item_count', 0)" :icon="collectionInfo!.icon" center />
					</template>
				</component>
			</div>
		</v-drawer>
	</component>
</template>

<style lang="scss" scoped>
.layout {
	display: contents;

	--layout-offset-top: calc(var(--header-bar-height) - 1px);
}
</style>
