import { useStores } from '@directus/extensions-sdk';
import { Collection, Field, Relation } from '@directus/types';
import { computed, Ref } from 'vue';

export type RelationM2M = {
	relation: Relation;
	relatedCollection: Collection;
	relatedPrimaryKeyField: Field;
	junctionCollection: Collection;
	junctionPrimaryKeyField: Field;
	junctionField: Field;
	reverseJunctionField: Field;
	junction: Relation;
	sortField?: string;
	type: 'm2m';
};

/*
One1              Many|Many: junctionCollection         One2: relatedCollection
┌─────────┐       ┌─────────────────────────────┐       ┌─────────────────────┐
│id       ├───┐   │id: junctionPKField          │   ┌───┤id: relatedPKField   │
│many     │   └──►│one1_id: reverseJunctionField│   │   │                     │
└─────────┘       │one2_id: junctionField       │◄──┘   └─────────────────────┘
                  │sort: sortField              │
                  └─────────────────────────────┘
*/

export function useRelationM2M(collection: Ref<string>, field: Ref<string>) {
	const { useRelationsStore, useCollectionsStore, useFieldsStore } = useStores();
	const relationsStore = useRelationsStore();
	const collectionsStore = useCollectionsStore();
	const fieldsStore = useFieldsStore();

	const relationInfo = computed<RelationM2M | null>(() => {
		const relations = relationsStore.getRelationsForField(collection.value, field.value);

		if (relations.length === 0) return null;

		// Find the junction relation - this is the O2M relation from parent to junction table
		// It has related_collection pointing back to our collection, one_field matching our field,
		// and a junction_field defined
		const junction = relations.find(
			(relation: Relation) =>
				relation.related_collection === collection.value &&
				relation.meta?.one_field === field.value &&
				relation.meta?.junction_field
		);

		if (!junction) return null;

		// Find the related relation - this is the M2O from junction to the actual related collection
		// It's in the junction collection and has the field matching junction.meta.junction_field
		const relation = relations.find(
			(relation: Relation) =>
				relation.collection === junction.collection &&
				relation.field === junction.meta?.junction_field
		);

		if (!relation || !relation.related_collection) return null;

		const junctionCollection = collectionsStore.getCollection(junction.collection);
		const relatedCollection = collectionsStore.getCollection(relation.related_collection);

		if (!junctionCollection || !relatedCollection) return null;

		const junctionPrimaryKeyField = fieldsStore.getPrimaryKeyFieldForCollection(junction.collection);
		const relatedPrimaryKeyField = fieldsStore.getPrimaryKeyFieldForCollection(relation.related_collection);
		
		// junctionField is the field in junction table pointing to related collection
		const junctionField = fieldsStore.getField(junction.collection, junction.meta?.junction_field as string);
		// reverseJunctionField is the field in junction table pointing back to parent collection  
		const reverseJunctionField = fieldsStore.getField(junction.collection, relation.meta?.junction_field as string);

		if (!junctionPrimaryKeyField || !relatedPrimaryKeyField || !junctionField || !reverseJunctionField) {
			return null;
		}

		return {
			relation: relation,
			relatedCollection,
			relatedPrimaryKeyField,
			junctionCollection,
			junctionPrimaryKeyField,
			junctionField,
			reverseJunctionField,
			junction: junction,
			sortField: junction.meta?.sort_field ?? undefined,
			type: 'm2m',
		} as RelationM2M;
	});

	return { relationInfo };
}
