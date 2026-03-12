import { describe, it, expect, beforeEach } from 'vitest';
import { usePresetStore } from '../model/store';
import { useMemberStore } from '@/entities/member';

function resetStore() {
  usePresetStore.setState({ presets: [] });
}

function resetMemberStore() {
  useMemberStore.setState({ members: [] });
}

describe('usePresetStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('addPreset', () => {
    it('creates a preset with unique ID, name, and memberNames', () => {
      const preset = usePresetStore.getState().addPreset('대학 동기', ['철수', '영희', '민수']);

      expect(preset.id).toBeDefined();
      expect(preset.id.length).toBe(12);
      expect(preset.name).toBe('대학 동기');
      expect(preset.memberNames).toEqual(['철수', '영희', '민수']);

      const { presets } = usePresetStore.getState();
      expect(presets).toHaveLength(1);
      expect(presets[0]).toEqual(preset);
    });

    it('creates presets with unique IDs', () => {
      const preset1 = usePresetStore.getState().addPreset('그룹 1', ['A', 'B']);
      const preset2 = usePresetStore.getState().addPreset('그룹 2', ['C', 'D']);

      expect(preset1.id).not.toBe(preset2.id);
    });
  });

  describe('removePreset', () => {
    it('removes a preset by ID', () => {
      const preset = usePresetStore.getState().addPreset('테스트', ['A', 'B']);
      expect(usePresetStore.getState().presets).toHaveLength(1);

      usePresetStore.getState().removePreset(preset.id);
      expect(usePresetStore.getState().presets).toHaveLength(0);
    });

    it('does not affect other presets when removing one', () => {
      const preset1 = usePresetStore.getState().addPreset('그룹 1', ['A']);
      const preset2 = usePresetStore.getState().addPreset('그룹 2', ['B']);

      usePresetStore.getState().removePreset(preset1.id);

      const { presets } = usePresetStore.getState();
      expect(presets).toHaveLength(1);
      expect(presets[0].id).toBe(preset2.id);
    });

    it('does nothing if ID does not exist', () => {
      usePresetStore.getState().addPreset('테스트', ['A']);
      usePresetStore.getState().removePreset('nonexistent-id');
      expect(usePresetStore.getState().presets).toHaveLength(1);
    });
  });

  describe('updatePreset', () => {
    it('updates the name of a preset', () => {
      const preset = usePresetStore.getState().addPreset('원래 이름', ['A', 'B']);
      usePresetStore.getState().updatePreset(preset.id, { name: '새 이름' });

      const updated = usePresetStore.getState().getPreset(preset.id);
      expect(updated?.name).toBe('새 이름');
      expect(updated?.memberNames).toEqual(['A', 'B']);
    });

    it('updates the memberNames of a preset', () => {
      const preset = usePresetStore.getState().addPreset('그룹', ['A', 'B']);
      usePresetStore.getState().updatePreset(preset.id, { memberNames: ['C', 'D', 'E'] });

      const updated = usePresetStore.getState().getPreset(preset.id);
      expect(updated?.name).toBe('그룹');
      expect(updated?.memberNames).toEqual(['C', 'D', 'E']);
    });

    it('updates both name and memberNames at once', () => {
      const preset = usePresetStore.getState().addPreset('원래', ['A']);
      usePresetStore.getState().updatePreset(preset.id, {
        name: '새 이름',
        memberNames: ['X', 'Y'],
      });

      const updated = usePresetStore.getState().getPreset(preset.id);
      expect(updated?.name).toBe('새 이름');
      expect(updated?.memberNames).toEqual(['X', 'Y']);
    });

    it('does not modify ID', () => {
      const preset = usePresetStore.getState().addPreset('테스트', ['A']);
      usePresetStore.getState().updatePreset(preset.id, { name: '업데이트' });

      const updated = usePresetStore.getState().getPreset(preset.id);
      expect(updated?.id).toBe(preset.id);
    });
  });

  describe('getPreset', () => {
    it('returns the correct preset by ID', () => {
      const preset1 = usePresetStore.getState().addPreset('그룹 1', ['A']);
      const preset2 = usePresetStore.getState().addPreset('그룹 2', ['B']);

      expect(usePresetStore.getState().getPreset(preset1.id)).toEqual(preset1);
      expect(usePresetStore.getState().getPreset(preset2.id)).toEqual(preset2);
    });

    it('returns undefined for nonexistent ID', () => {
      expect(usePresetStore.getState().getPreset('nonexistent')).toBeUndefined();
    });
  });

  describe('multiple presets', () => {
    it('can store and manage multiple presets', () => {
      usePresetStore.getState().addPreset('대학 동기', ['철수', '영희']);
      usePresetStore.getState().addPreset('회사 팀', ['민수', '지영', '현우']);
      usePresetStore.getState().addPreset('동네 친구', ['준호']);

      expect(usePresetStore.getState().presets).toHaveLength(3);
    });

    it('preserves order of insertion', () => {
      usePresetStore.getState().addPreset('첫번째', ['A']);
      usePresetStore.getState().addPreset('두번째', ['B']);
      usePresetStore.getState().addPreset('세번째', ['C']);

      const names = usePresetStore.getState().presets.map((p) => p.name);
      expect(names).toEqual(['첫번째', '두번째', '세번째']);
    });
  });

  describe('edge cases', () => {
    it('handles empty memberNames array', () => {
      const preset = usePresetStore.getState().addPreset('빈 그룹', []);
      expect(preset.memberNames).toEqual([]);
      expect(usePresetStore.getState().getPreset(preset.id)?.memberNames).toEqual([]);
    });

    it('handles preset with single member', () => {
      const preset = usePresetStore.getState().addPreset('혼자', ['나']);
      expect(preset.memberNames).toEqual(['나']);
    });

    it('handles preset with many members', () => {
      const names = Array.from({ length: 20 }, (_, i) => `멤버${i + 1}`);
      const preset = usePresetStore.getState().addPreset('대그룹', names);
      expect(preset.memberNames).toHaveLength(20);
    });
  });

  describe('preset loading flow (integration)', () => {
    beforeEach(() => {
      resetMemberStore();
    });

    it('loading a preset resets members and adds preset members', () => {
      // Set up initial members
      useMemberStore.getState().addMember('기존1');
      useMemberStore.getState().addMember('기존2');
      expect(useMemberStore.getState().members).toHaveLength(2);

      // Create a preset
      const preset = usePresetStore.getState().addPreset('새 그룹', ['철수', '영희', '민수']);

      // Simulate loading: reset members, then add from preset
      useMemberStore.getState().reset();
      expect(useMemberStore.getState().members).toHaveLength(0);

      for (const name of preset.memberNames) {
        useMemberStore.getState().addMember(name);
      }

      const { members } = useMemberStore.getState();
      expect(members).toHaveLength(3);
      expect(members.map((m) => m.name)).toEqual(['철수', '영희', '민수']);
    });

    it('loading a preset gives members new unique IDs', () => {
      const preset = usePresetStore.getState().addPreset('그룹', ['A', 'B']);

      useMemberStore.getState().reset();
      for (const name of preset.memberNames) {
        useMemberStore.getState().addMember(name);
      }

      const { members } = useMemberStore.getState();
      expect(members[0].id).not.toBe(members[1].id);
      expect(members[0].id.length).toBe(12);
    });

    it('loading an empty preset results in no members', () => {
      useMemberStore.getState().addMember('기존');
      const preset = usePresetStore.getState().addPreset('빈 그룹', []);

      useMemberStore.getState().reset();
      for (const name of preset.memberNames) {
        useMemberStore.getState().addMember(name);
      }

      expect(useMemberStore.getState().members).toHaveLength(0);
    });
  });
});
