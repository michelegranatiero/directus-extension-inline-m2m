import { Ref, reactive } from 'vue';
import { get } from 'lodash-es';
import type { DisplayItem } from './use-m2m-items';
import type { RelationM2M } from './use-relation-m2m';

// Render a Directus display template ({{ field }} or {{ field.nested }}) against a data object
function renderTemplate(template: string, data: Record<string, any>): string {
	return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
		const value = get(data, path);
		return value !== undefined && value !== null ? String(value) : '';
	});
}

export interface UseM2MDisplayOptions {
	relationInfo: Ref<RelationM2M | null>;
	template: Ref<string | null | undefined>;
	t: (key: string, params?: any) => string;
}

export function useM2MDisplay(options: UseM2MDisplayOptions) {
	const { relationInfo, template, t } = options;

	// Track expanded items - items are collapsed by default
	const expandedItems = reactive<Record<string, boolean>>({});

	function getItemKey(item: DisplayItem, index: number): string {
		return item.$junctionId ? String(item.$junctionId) : `new-${index}`;
	}

	function isExpanded(key: string): boolean {
		// Default is collapsed (false), only true if explicitly expanded
		return expandedItems[key] === true;
	}

	function toggleExpand(key: string) {
		expandedItems[key] = !expandedItems[key];
	}

	function expandItem(key: string) {
		expandedItems[key] = true;
	}

	function getItemTitle(item: DisplayItem, index: number): string {
		if (!relationInfo.value) return `Item ${index + 1}`;

		const relatedData = { ...item.$item, ...item.$edits };
		const junctionData = { ...item.$junctionItem, ...item.$junctionEdits };

		const junctionFieldName = relationInfo.value.junctionField.field;
		// Build lookup object: junction fields + related item nested + related item spread
		const templateData = {
			...junctionData,
			[junctionFieldName]: relatedData,
			...relatedData,
		};

		// Try template first if configured
		if (template.value) {
			try {
				const rendered = renderTemplate(template.value, templateData);
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
			const value = get(templateData, fieldName);
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
		isExpanded,
		toggleExpand,
		expandItem,
		getItemTitle,
	};
}
