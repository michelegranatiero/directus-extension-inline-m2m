import { defineInterface, useStores } from '@directus/extensions-sdk';
import InterfaceInlineM2M from './inline-m2m-interface.vue';

export default defineInterface({
	id: 'inline-m2m',
	name: 'Inline M2M',
	description: 'Edit multiple related items inline in a many-to-many relationship with accordion-style forms.',
	icon: 'dynamic_form',
	component: InterfaceInlineM2M,
	localTypes: ['m2m'],
	group: 'relational',
	types: ['alias'],
	relational: true,
	options: ({ editing, relations }) => {
		// M2M uses relations.m2o which contains junction info
		const { collection: junctionCollection, related_collection: relatedCollection } = relations.m2o ?? {};

		return [
			{
				field: 'template',
				type: 'string',
				name: '$t:display_template',
				meta:
					editing === '+'
						? {
								width: 'full',
								interface: 'presentation-notice',
								options: {
									text: 'Save this field first to configure the display template.',
								},
							}
						: {
								width: 'full',
								interface: 'system-display-template',
								options: {
									collectionName: junctionCollection,
								},
								note: 'Template to display for each item header. Use {{field_name}} syntax.',
							},
			},
			{
				field: 'excludedFields',
				type: 'json',
				name: 'Hidden Fields',
				meta:
					editing === '+'
						? {
								width: 'full',
								interface: 'presentation-notice',
								options: {
									text: 'Save this field first to configure hidden fields.',
								},
							}
						: {
								width: 'full',
								interface: 'select-multiple-dropdown',
								options: {
									choices: (() => {
										if (!relatedCollection) return [];
										const { useFieldsStore } = useStores();
										const fieldsStore = useFieldsStore();
										const fields = fieldsStore.getFieldsForCollection(relatedCollection);
										return fields
											.filter((f: any) => !f.meta?.hidden)
											.map((f: any) => ({ text: f.name || f.field, value: f.field }));
									})(),
								},
								note: 'Select fields to HIDE from the inline form. Only visible fields are shown in this list.',
							},
			},
			{
				field: 'enableCreate',
				type: 'boolean',
				name: '$t:creating_items',
				schema: {
					default_value: true,
				},
				meta: {
					width: 'half',
					interface: 'boolean',
					options: {
						label: '$t:enable_create_button',
					},
				},
			},
			{
				field: 'enableSelect',
				type: 'boolean',
				name: '$t:selecting_items',
				schema: {
					default_value: true,
				},
				meta: {
					width: 'half',
					interface: 'boolean',
					options: {
						label: '$t:enable_select_button',
					},
				},
			},
			{
				field: 'allowDuplicates',
				type: 'boolean',
				name: '$t:allow_duplicates',
				schema: {
					default_value: false,
				},
				meta: {
					width: 'half',
					interface: 'boolean',
					options: {
						label: '$t:enabled',
					},
					note: 'Allow selecting the same related item multiple times.',
				},
			},
			{
				field: 'filter',
				type: 'json',
				name: '$t:filter',
				meta:
					editing === '+'
						? {
								width: 'full',
								interface: 'presentation-notice',
								options: {
									text: 'Save this field first to configure filters.',
								},
							}
						: {
								width: 'full',
								interface: 'system-filter',
								options: {
									collectionName: relatedCollection,
								},
								note: 'Filter for the "Add Existing" drawer to limit available items.',
							},
			},
		];
	},
	recommendedDisplays: ['related-values'],
});
