import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConversationPanel } from './ConversationPanel';
import { addMessage, startPlot } from '../../lib/net/ops';
import { nodeById } from '../../lib/net/ops';

/**
 * The run loop only matters if the button actually reaches the DOM and fires
 * with the right message id and code — the wiring silent-fails otherwise, since
 * a click handler that never attaches looks identical to one that does until
 * someone clicks it.
 */

function nodeWithRunnableReply() {
  let state = startPlot('probe test', 'A premise long enough to be real.');
  const id = state.nodes[0].id;
  state = addMessage(state, id, 'user', 'go');
  state = addMessage(
    state,
    id,
    'agent',
    'Measure it.\n\n```js\nconsole.log("hi");\nreturn 42;\n```\n\nThat settles it.',
  );
  return { state, node: nodeById(state, id)! };
}

const baseProps = {
  score: undefined,
  ancestors: [],
  busy: false,
  error: null,
  runningMessageId: null,
  onSend: () => {},
  onTakeFork: () => {},
  onToggleResolved: () => {},
  onStartCollide: () => {},
  onJump: () => {},
  onRunProbe: () => {},
};

describe('ConversationPanel — probes', () => {
  it('renders a Run button on a runnable code block in an agent reply', () => {
    const { node } = nodeWithRunnableReply();
    render(<ConversationPanel {...baseProps} node={node} />);

    expect(screen.getByText('▶ RUN')).toBeTruthy();
    expect(screen.getByText(/console\.log/)).toBeTruthy();
  });

  it('calls onRunProbe with the message id and the code, not the whole reply', () => {
    const { node } = nodeWithRunnableReply();
    const onRunProbe = vi.fn();
    render(<ConversationPanel {...baseProps} node={node} onRunProbe={onRunProbe} />);

    fireEvent.click(screen.getByText('▶ RUN'));

    const agentMessage = node.messages[1];
    expect(onRunProbe).toHaveBeenCalledWith(agentMessage.id, 'console.log("hi");\nreturn 42;');
  });

  it('disables only the running message\'s button, not every button on the node', () => {
    const { node } = nodeWithRunnableReply();
    render(<ConversationPanel {...baseProps} node={node} runningMessageId={node.messages[1].id} />);

    const button = screen.getByText('RUNNING…') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('does not offer a run button on a non-runnable block', () => {
    let state = startPlot('probe test', 'A premise long enough to be real.');
    const id = state.nodes[0].id;
    state = addMessage(state, id, 'agent', 'Here.\n\n```python\nprint(1)\n```');
    render(<ConversationPanel {...baseProps} node={nodeById(state, id)!} />);

    expect(screen.queryByText('▶ RUN')).toBeNull();
  });

  it('renders a probe message as executed output, distinct from prose', () => {
    let state = startPlot('probe test', 'A premise long enough to be real.');
    const id = state.nodes[0].id;
    state = addMessage(state, id, 'probe', 'PROBE RESULT (3ms)\n\nhi\n\nreturned: 42');

    render(<ConversationPanel {...baseProps} node={nodeById(state, id)!} />);

    expect(screen.getByText('▶ RAN')).toBeTruthy();
    expect(screen.getByText(/returned: 42/)).toBeTruthy();
  });

  it('never offers a run button on a user message', () => {
    let state = startPlot('probe test', 'A premise long enough to be real.');
    const id = state.nodes[0].id;
    state = addMessage(state, id, 'user', 'Here is code:\n\n```js\nreturn 1;\n```');
    render(<ConversationPanel {...baseProps} node={nodeById(state, id)!} />);

    // A user could paste something that looks runnable; only the agent's own
    // artifact is ever offered a run button.
    expect(screen.queryByText('▶ RUN')).toBeNull();
  });
});
