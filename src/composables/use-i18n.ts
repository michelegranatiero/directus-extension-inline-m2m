import en from '@/lang/en.yaml';
import { useI18n as origI18n, UseI18nOptions } from 'vue-i18n';

export function useI18n(options?: UseI18nOptions) {
	const i18n: any = origI18n({
		...options,
		messages: {
			en,
		},
		useScope: 'local',
	});
	
	// Return a simplified interface to avoid TypeScript deep instantiation issues
	return {
		t: (key: string, params?: any): string => {
			return i18n.t(key, params);
		},
	};
}
