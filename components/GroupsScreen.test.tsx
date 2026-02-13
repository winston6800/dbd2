import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupsScreen } from './GroupsScreen';
import { getDefaultUserState } from '../lib/storage';

const defaultState = getDefaultUserState();

describe('GroupsScreen', () => {
  it('renders create group button', () => {
    render(
      <GroupsScreen
        groups={{}}
        onGroupsChange={() => {}}
        following={{}}
        onFollowingChange={() => {}}
        currentUserName="You"
        currentUserState={defaultState}
      />
    );
    expect(screen.getByText('Create Group')).toBeDefined();
  });

  it('renders empty state when no groups', () => {
    render(
      <GroupsScreen
        groups={{}}
        onGroupsChange={() => {}}
        following={{}}
        onFollowingChange={() => {}}
        currentUserName="You"
        currentUserState={defaultState}
      />
    );
    expect(screen.getByText('No groups yet')).toBeDefined();
  });

  it('renders group when provided', () => {
    const groups = {
      g_1: {
        id: 'g_1',
        name: 'My Squad',
        members: [
          { id: 'm_1', name: 'Alice', userState: defaultState },
        ],
        createdAt: new Date().toISOString(),
      },
    };
    render(
      <GroupsScreen
        groups={groups}
        onGroupsChange={() => {}}
        following={{}}
        onFollowingChange={() => {}}
        currentUserName="You"
        currentUserState={defaultState}
      />
    );
    expect(screen.getByText('My Squad')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
  });
});
