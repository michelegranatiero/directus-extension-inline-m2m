import { Ref, reactive } from 'vue';
import { get } from 'lodash-es';
import { render } from 'micromustache';
import type { DisplayItem } from './use-m2m-items';
import type { RelationM2M } from './use-relation-m2m';

export interface UseM2MDisplayOptions {
	relationInfo: Ref<RelationM2M | null>;
	template: Ref<string | null | undefined>;
	t: (key: string, params?: any) => string;
}

export function useM2MDisplay(options: UseM2MDisplayOptions) {
	const { relationInfo, template, t } = options;

	const expandedItems = reactive<Record<string, boolean>>({});

	function getItemKey(item: DisplayItem, index: number): string {
		return item.$junctionId ? String(item.$junctionId) : `new-${index}`;
	}

	function toggleExpand(key: string) {
		expandedItems[key] = !expandedItems[key];
	}

	function autoExpandItem(item: DisplayItem, index: number) {
		const key = getItemKey(item, index);
		expandedItems[key] = true;
	}

	function getItemTitle(item: DisplayItem, index: number): string {
		if (!relationInfo.value) return `Item ${index + 1}`;

		const relatedData = { ...item.$item, ...item.$edits };

		const junctionFieldName = relationInfo.value.junctionField.field;
		const junctionData = {
			[junctionFieldName]: relatedData,
			...relatedData,
		};

		// Try template first if configured
		if (template.value) {
			try {
				const rendered = render(template.value, junctionData);
				if (rendered && rendered.trim()) return rendered;
			} catch {
				// Template failed, fall back to defaults
			}
		}

		const relatedPKField = relationInfo.value.relatedPrimaryKeyField.field;
		const pkValue = get(relatedData, relatedPKField);

		// Try common display fields
		const displayFields = ['name', 'title', 'label', 'display_name'];
		for (const fieldName of displayFields) {
			const value = get(relatedData, fieldName);
			if (value) return String(value);
		}

		if (pkValue && item.$type !== 'created') {
			return `#${pkValue}`;
		}

		return t('interfaces.inline-m2m.new-item', { index: index + 1 });
	}

	return {
		expandedItems,
		getItemKey,
		toggleExpand,
		autoExpandItem,
		getItemTitle,
	};
}
