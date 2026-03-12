import { nanoid } from 'nanoid';

/** 엔티티 ID 생성 (12자리) */
export const createId = (): string => nanoid(12);
