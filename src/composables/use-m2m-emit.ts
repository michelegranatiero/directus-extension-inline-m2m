import { Ref } from 'vue';
import { get } from 'lodash-es';
import type { DisplayItem } from './use-m2m-items';
import type { RelationM2M } from './use-relation-m2m';

export interface UseM2MEmitOptions {
	relationInfo: Ref<RelationM2M | null>;
	allItems: Ref<DisplayItem[]>;
	isDirty: Ref<boolean>;
	sortField: Ref<string | undefined>;
}

export function useM2MEmit(options: UseM2MEmitOptions) {
	const { relationInfo, allItems, isDirty, sortField } = options;

	function emitValue() {
		if (!relationInfo.value) return null;

		const junctionFieldName = relationInfo.value.junctionField.field;
		const junctionPKField = relationInfo.value.junctionPrimaryKeyField.field;
		const relatedPKField = relationInfo.value.relatedPrimaryKeyField.field;

		const emitArray: any[] = [];
		let hasChanges = false;

		allItems.value.forEach((item: DisplayItem, index: number) => {
			// Skip deleted/unlinked items
			if (item.$type === 'deleted' || item.$type === 'unlinked') {
				if (item.$junctionId) {
					hasChanges = true;
				}
				return;
			}

			if (item.$type === 'created') {
				// New item - check if linking to existing or creating new
				if (item.$isExistingLink) {
					// Link to existing related item
					const existingPK = get(item.$item, relatedPKField);
					if (existingPK !== undefined && existingPK !== null) {
						const junctionItem: Record<string, any> = {
							[junctionFieldName]: existingPK,
							// Include junction edits (like 'language' field)
							...item.$junctionEdits,
						};

						if (sortField.value) {
							junctionItem[sortField.value] = index;
						}

						emitArray.push(junctionItem);
						hasChanges = true;
					}
				} else {
					// Create new related item - always emit if item was created
					// Even if no edits, the related item will be created with its default values
					const junctionItem: Record<string, any> = {
						[junctionFieldName]: item.$edits,
						// Include junction edits (like 'language' field)
						...item.$junctionEdits,
					};

					if (sortField.value) {
						junctionItem[sortField.value] = index;
					}

					emitArray.push(junctionItem);
					hasChanges = true;
				}
			} else if (item.$type === 'updated') {
				// Modified existing item
				if (item.$junctionId) {
					const relatedPK = get(item.$item, relatedPKField);
					const hasRelatedEdits = Object.keys(item.$edits).length > 0;
					const hasJunctionEdits = Object.keys(item.$junctionEdits || {}).length > 0;
					
					// Only emit if there are actual edits
					if (!hasRelatedEdits && !hasJunctionEdits) {
						// No changes, just reference the existing junction ID
						emitArray.push(item.$junctionId);
						return;
					}
					
					const junctionItem: Record<string, any> = {
						[junctionPKField]: item.$junctionId,
						// Include junction edits at root level
						...item.$junctionEdits,
					};
					
					// Only include related item updates if there are edits
					if (hasRelatedEdits) {
						junctionItem[junctionFieldName] = {
							[relatedPKField]: relatedPK,
							...item.$edits,
						};
					}

					if (sortField.value) {
						junctionItem[sortField.value] = index;
					}

					emitArray.push(junctionItem);
					hasChanges = true;
				}
			} else if (item.$type === 'existing') {
				// Existing unchanged item
				if (item.$junctionId) {
					const sortChanged = sortField.value && item.$originalSort !== index;
					if (sortChanged) {
						emitArray.push({
							[junctionPKField]: item.$junctionId,
							[sortField.value!]: index,
						});
						hasChanges = true;
					} else {
						emitArray.push(item.$junctionId);
					}
				}
			}
		});

		if (hasChanges || isDirty.value) {
			return emitArray;
		}

		return null;
	}

	return {
		emitValue,
	};
}
