export * from './error';

export type { RelationM2M } from '@/composables/use-relation-m2m';

export interface M2MValue {
	create?: Record<string, any>[];
	update?: Record<string, any>[];
	delete?: (string | number)[];
}

export interface DisplayItem {
	$index: number;
	$type: 'existing' | 'created' | 'updated' | 'deleted';
	$item: Record<string, any>;
	$edits: Record<string, any>;
	$loading?: boolean;
	$junctionId?: string | number;
}
