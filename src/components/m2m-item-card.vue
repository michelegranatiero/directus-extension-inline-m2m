<template>
	<div
		class="item-card"
		:class="{
			'is-expanded': isExpanded,
			'is-deleted': item.$type === 'deleted',
			'is-unlinked': item.$type === 'unlinked'
		}"
	>
		<!-- Card Header -->
		<div class="card-header" @click="$emit('toggle-expand')">
			<div class="header-left">
				<v-icon
					v-if="dragAllowed && !disabled"
					name="drag_indicator"
					class="drag-handle"
					@click.stop
				/>
				<v-icon
					:name="isExpanded ? 'expand_less' : 'expand_more'"
					class="expand-icon"
				/>
				<span class="item-title">
					{{ title }}
				</span>
				<v-chip v-if="item.$type === 'created'" x-small class="status-chip created">
					{{ t('interfaces.inline-m2m.new') }}
				</v-chip>
				<v-chip v-else-if="item.$type === 'updated'" x-small class="status-chip updated">
					{{ t('interfaces.inline-m2m.modified') }}
				</v-chip>
				<v-chip v-else-if="item.$type === 'unlinked'" x-small class="status-chip unlinked">
					{{ t('interfaces.inline-m2m.unlinked') }}
				</v-chip>
				<v-chip v-else-if="item.$type === 'deleted'" x-small class="status-chip deleted">
					{{ t('interfaces.inline-m2m.deleted') }}
				</v-chip>
			</div>
			<div class="header-right">
				<!-- Unassign button for existing items -->
				<v-icon
					v-if="unlinkAllowed && item.$type !== 'deleted' && item.$type !== 'created' && item.$type !== 'unlinked'"
					name="link_off"
					class="unassign-icon"
					v-tooltip="t('interfaces.inline-m2m.unlink')"
					@click.stop="$emit('unlink')"
				/>

				<!-- Actions menu for existing items -->
				<v-menu
					v-if="deleteAllowed && item.$type !== 'deleted' && item.$type !== 'created' && item.$type !== 'unlinked'"
					v-model="menuActive"
					placement="bottom-end"
					show-arrow
				>
					<template #activator="{ toggle }">
						<v-button
							v-tooltip="t('interfaces.inline-m2m.more-options')"
							x-small
							icon
							secondary
							class="header-button"
							@click.stop="toggle"
						>
							<v-icon name="more_vert" />
						</v-button>
					</template>

					<v-list>
						<v-list-item
							clickable
							class="danger"
							@click.stop="handleDelete"
						>
							<v-list-item-icon>
								<v-icon name="delete" />
							</v-list-item-icon>
							<v-list-item-content>
								<div>{{ t('interfaces.inline-m2m.delete-everywhere') }}</div>
								<div class="action-description">{{ t('interfaces.inline-m2m.delete-description') }}</div>
							</v-list-item-content>
						</v-list-item>
					</v-list>
				</v-menu>

				<!-- Delete button for new items -->
				<v-icon
					v-if="!disabled && item.$type === 'created'"
					name="delete"
					class="delete-icon"
					v-tooltip="t('interfaces.inline-m2m.remove')"
					@click.stop="$emit('remove')"
				/>

				<!-- Undo for deleted/unlinked items -->
				<v-icon
					v-if="item.$type === 'deleted' || item.$type === 'unlinked'"
					name="undo"
					class="undo-icon"
					v-tooltip="item.$type === 'deleted' ? t('interfaces.inline-m2m.undo-delete') : t('interfaces.inline-m2m.undo-unlink')"
					@click.stop="$emit('undo')"
				/>
			</div>
		</div>

		<!-- Card Content (Expandable) -->
		<transition name="expand">
			<div
				v-if="isExpanded && item.$type !== 'deleted' && item.$type !== 'unlinked'"
				class="card-content"
			>
				<v-form
					v-model="item.$edits"
					:disabled="formDisabled"
					:loading="item.$loading"
					:show-no-visible-fields="false"
					:initial-values="item.$item || {}"
					:primary-key="primaryKey"
					:fields="fields"
					:validation-errors="[]"
					@update:model-value="$emit('edit')"
				/>
			</div>
		</transition>
	</div>
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { useI18n } from '@/composables/use-i18n';
import type { DisplayItem } from '@/composables/use-m2m-items';
import type { Field } from '@directus/types';

interface Props {
	item: DisplayItem;
	title: string;
	isExpanded: boolean;
	disabled?: boolean;
	formDisabled?: boolean;
	dragAllowed: boolean;
	unlinkAllowed: boolean;
	deleteAllowed: boolean;
	primaryKey: string | number;
	fields: Field[];
}

defineProps<Props>();

const emit = defineEmits<{
	(e: 'toggle-expand'): void;
	(e: 'unlink'): void;
	(e: 'delete'): void;
	(e: 'remove'): void;
	(e: 'undo'): void;
	(e: 'edit'): void;
}>();

const { t } = useI18n();

const menuActive = ref(false);

async function handleDelete() {
	menuActive.value = false;
	await nextTick();
	emit('delete');
}
</script>

<style lang="scss" scoped>
.item-card {
	border: var(--theme--border-width, 2px) solid var(--theme--form--field--input--border-color, var(--border-normal));
	border-radius: var(--theme--border-radius, 6px);
	background-color: var(--theme--background, var(--background-page));
	overflow: hidden;
	transition: border-color 0.2s ease, box-shadow 0.2s ease;

	&:hover:not(.is-expanded):not(.is-deleted) {
		border-color: var(--theme--form--field--input--border-color-hover, var(--border-normal-alt));
	}

	&.is-expanded {
		border-color: var(--theme--primary, var(--primary));
		box-shadow: 0 2px 8px rgba(var(--primary-rgb, 0, 0, 0), 0.1);
		
		.card-header {
			border-bottom-color: var(--theme--form--field--input--border-color, var(--border-normal));
		}
	}

	&.is-deleted,
	&.is-unlinked {
		opacity: 0.6;
		border-color: var(--theme--danger, var(--danger));
		
		.card-header {
			background-color: var(--theme--danger-background, var(--danger-10));
		}
	}
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 12px;
	cursor: pointer;
	user-select: none;
	background-color: var(--theme--background-accent, var(--background-normal));
	border-bottom: var(--theme--border-width, 2px) solid transparent;
	transition: background-color 0.2s ease;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
}

.header-right {
	display: flex;
	align-items: center;
	gap: 4px;
}

.header-button {
	--v-button-background-color: var(--theme--background-subdued, var(--background-subdued));
	--v-button-background-color-hover: var(--theme--background-normal, var(--background-normal-alt));
}

.drag-handle {
	cursor: move;
	color: var(--theme--foreground-subdued, var(--foreground-subdued));
	touch-action: none;
}

.expand-icon {
	color: var(--theme--foreground-subdued, var(--foreground-subdued));
	transition: transform 0.2s ease;
}

.item-title {
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--theme--foreground, var(--foreground-normal));
}

.status-chip {
	flex-shrink: 0;

	&.created {
		--v-chip-color: var(--theme--primary, var(--primary));
		--v-chip-background-color: var(--theme--primary-background, var(--primary-10));
	}

	&.updated {
		--v-chip-color: var(--theme--warning, var(--warning));
		--v-chip-background-color: var(--theme--warning-background, var(--warning-10));
	}

	&.unlinked,
	&.deleted {
		--v-chip-color: var(--theme--danger, var(--danger));
		--v-chip-background-color: var(--theme--danger-background, var(--danger-10));
	}

	&.existing {
		--v-chip-color: var(--theme--foreground-subdued, var(--foreground-subdued));
		--v-chip-background-color: var(--theme--background-normal, var(--background-normal));
	}
}

.delete-icon {
	color: var(--theme--foreground-subdued, var(--foreground-subdued));
	opacity: 0.7;
	transition: opacity 0.2s ease, color 0.2s ease;
	cursor: pointer;

	&:hover {
		opacity: 1;
		color: var(--theme--danger, var(--danger));
	}
}

.unassign-icon {
	color: var(--theme--danger, var(--danger));
	opacity: 0.7;
	transition: opacity 0.2s ease, color 0.2s ease;
	cursor: pointer;
	margin-inline-end: 4px;

	&:hover {
		opacity: 1;
	}
}

.undo-icon {
	color: var(--theme--primary, var(--primary));
	opacity: 0.7;
	transition: opacity 0.2s ease;
	cursor: pointer;

	&:hover {
		opacity: 1;
	}
}

.action-description {
	font-size: 12px;
	color: var(--theme--foreground-subdued, var(--foreground-subdued));
	margin-top: 2px;
}

.danger {
	color: var(--theme--danger, var(--danger));
	
	.action-description {
		color: var(--theme--danger, var(--danger));
		opacity: 0.75;
	}
}

.card-content {
	padding: 16px;
	background-color: var(--theme--background, var(--background-page));
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
	transition: all 0.3s ease;
	overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
	opacity: 0;
	max-height: 0;
	padding-top: 0;
	padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
	opacity: 1;
	max-height: 2000px;
}
</style>
