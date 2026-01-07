<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
	icon: string;
	disabled?: boolean;
	loading?: boolean;
	secondary?: boolean;
	outlined?: boolean;
	to?: RouteLocationRaw;
	href?: string;
	download?: string;
	active?: boolean;
}>();

defineEmits<{
	click: [];
}>();
</script>

<template>
	<v-button
		:disabled
		:active
		:loading
		:secondary
		:outlined
		:to
		:href
		:download
		icon
		rounded
		small
		@click="$emit('click')"
	>
		<v-icon :name="icon" small />
		<template #append-outer><slot name="append-outer" /></template>
	</v-button>
</template>
