import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/frontier.css';
import { NetCanvas, AgentLegend } from './components/Frontier/NetCanvas';
import { ConversationPanel } from './components/Frontier/ConversationPanel';
import { ancestorsOf, scoreNet } from './lib/net/frontier';
import { addMessage, collide, nodeById, setForks, startPlot, takeFork } from './lib/net/ops';
import { formatResult, runProbe } from './lib/net/probe';
import type { NetState } from './lib/net/types';
import { C, MONO_FONT, VOID_BACKGROUND } from './lib/net/tokens';

/**
 * Dev-only visual harness — `npm run dev`, then open /preview.html.
 *
 * Renders the real shell, canvas and conversation panel against a hand-written
 * net, so the UI can be looked at without a Supabase session, a subscription or
 * an Anthropic key. Never built or deployed: index.html is vite's only entry,
 * and .vercelignore excludes this too.
 */

function grow(state: NetState, parentId: string, title: string, agent: 'adversary' | 'historian' | 'artificer') {
  const withFork = setForks(state, parentId, [{ title, premise: `why ${title}`, agent }]);
  const fork = nodeById(withFork, parentId)!.forks.find(f => !f.taken)!;
  return takeFork(withFork, parentId, fork.id);
}

function demo(): NetState {
  let s = startPlot('offline inference', 'A way to run a model too large for the GPU it is sitting on.');
  const root = s.nodes[0].id;

  s = addMessage(s, root, 'user', 'A way to run a model too large for the GPU it is sitting on.');
  s = addMessage(
    s,
    root,
    'agent',
    'Three things are already solved and shipping: weight streaming from NVMe (DeepSpeed ZeRO-Infinity, 2021), 4-bit quantisation that fits a 70B into 40GB (GPTQ, AWQ), and offloaded KV cache. None of these is your idea.\n\nThe known-but-unsolved part is scheduling: once weights live off-device, the bottleneck stops being capacity and becomes the order you fetch layers in. Every published system uses a static prefetch depth, which collapses the moment batch composition varies.\n\nThe genuinely unexplored sliver is one sentence: a fetch schedule that adapts to the *content* of the batch rather than its shape.',
  );
  s = setForks(s, root, [
    { title: 'Is paging the bottleneck?', premise: 'Test whether PCIe bandwidth or scheduler stalls dominate.', agent: 'adversary' },
    { title: 'Who tried this in 2016', premise: 'Out-of-core GPU work predates LLMs by a decade.', agent: 'historian' },
  ]);

  s = grow(s, root, 'Is paging the bottleneck?', 'adversary');
  const paging = s.activeId!;
  s = addMessage(s, paging, 'user', 'Test whether PCIe bandwidth or scheduler stalls dominate.');
  s = addMessage(
    s,
    paging,
    'agent',
    'Your load-bearing assumption is that the transfer is the cost. On a Gen4 x16 link you have ~25GB/s, and a 70B model at 4-bit is ~35GB — so a naive full sweep is 1.4s per token, which is obviously fatal. That number is why everyone reaches for prefetch.\n\nBut it is the wrong number. Nobody sweeps the whole model per token; you sweep it per *layer*, and the layers are pipelined against compute. The real measurement is whether the GPU is ever idle waiting on a layer that a smarter order would have already had resident.\n\nCheapest test that settles it: run any existing offload stack under Nsight and read one number — SM occupancy during the transfer window. If occupancy is above 80% your idea has no headroom and the premise dies today.',
  );
  s = setForks(s, paging, [
    { title: 'Scheduler, not memory', premise: 'If occupancy is low, the ordering policy is the whole game.', agent: 'adversary' },
    { title: 'Smallest probe', premise: 'Instrument one layer and measure the stall directly.', agent: 'artificer' },
  ]);

  s = grow(s, root, 'Who tried this in 2016', 'historian');
  const hist = s.activeId!;
  s = addMessage(s, hist, 'user', 'Out-of-core GPU work predates LLMs by a decade.');
  s = addMessage(
    s,
    hist,
    'agent',
    'The direct ancestor is out-of-core GPU linear algebra: MAGMA and cuSOLVER did exactly this for dense factorisations on 6GB Keplers. They got the pipelining right and it is where the double-buffering pattern everyone still copies comes from.\n\nWhat killed the general form was that the access pattern had to be known statically. A Cholesky factorisation has a fixed dependency graph; you can compute the optimal fetch order offline. That assumption is exactly what does not hold for you.\n\nThe input that changed is not hardware — PCIe has barely doubled. It is that transformer layer access is *predictable from the input*, which is a property nobody in 2016 had a workload for.',
  );
  s = setForks(s, hist, [
    { title: 'Static schedules die where?', premise: 'Find the precise property that breaks offline planning.', agent: 'adversary' },
  ]);

  s = grow(s, paging, 'Scheduler, not memory', 'adversary');
  const sched = s.activeId!;
  s = addMessage(s, sched, 'user', 'If occupancy is low, the ordering policy is the whole game.');
  s = addMessage(s, sched, 'agent', 'Granting the premise: occupancy is low, so ordering is the game. The question becomes what signal you order on.');
  s = setForks(s, sched, [
    { title: 'Order on router logits', premise: 'In an MoE the router tells you which experts are next.', agent: 'artificer' },
    { title: 'Order on attention entropy', premise: 'Diffuse attention predicts wider layer reach.', agent: 'adversary' },
    { title: 'Steal from branch prediction', premise: 'CPUs solved speculative fetch under uncertainty in the 90s.', agent: 'historian' },
  ]);

  s = collide(s, sched, hist);
  const synth = s.activeId!;
  s = addMessage(s, synth, 'user', 'Collide these.');
  s = addMessage(
    s,
    synth,
    'agent',
    'The structural analogy is exact and it is not a metaphor. MAGMA precomputed a fetch order because the dependency graph was static. A branch predictor cannot precompute, so it keeps a *history table* and speculates, then pays a fixed misprediction penalty.\n\nYour workload is the second shape, not the first. Router logits at layer N are a prediction of the working set at layer N+1 with measurable accuracy — that is a branch predictor with a confidence score attached, which is strictly more information than a CPU has.\n\nWhat falls out that neither branch reached alone: the misprediction penalty here is not a pipeline flush, it is a synchronous fetch you would have paid anyway. Speculation is free at the bottom. That inverts the design — you should over-speculate aggressively, which no offload system does.',
  );
  s = setForks(s, synth, [
    { title: 'Over-speculate: how far?', premise: 'Find where redundant fetch starts costing real bandwidth.', agent: 'adversary' },
    { title: 'Build the history table', premise: 'A 200-line probe over one MoE layer settles the accuracy question.', agent: 'artificer' },
  ]);

  // A runnable Artificer node — this is what closes the loop: click Run, the
  // sandbox executes the block, and the result comes back as a probe message.
  s = grow(s, sched, 'Build the history table', 'artificer');
  const probe = s.activeId!;
  s = addMessage(s, probe, 'user', 'A 200-line probe over one MoE layer settles the accuracy question.');
  s = addMessage(
    s,
    probe,
    'agent',
    "Smallest thing that teaches you something: simulate a history table against a synthetic router trace and read the hit rate. If it clears 70% at depth 1, speculation is worth building; if it does not, the whole synthesis collapses and you have spent an afternoon, not a quarter.\n\n```js\nfunction xorshift(seed) {\n  let x = seed;\n  return () => {\n    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;\n    return ((x >>> 0) / 4294967296);\n  };\n}\n\nconst rand = xorshift(42);\nconst EXPERTS = 8;\nconst STEPS = 20000;\nconst history = new Map();\nlet hits = 0;\nlet prev = 0;\n\nfor (let i = 0; i < STEPS; i++) {\n  // Synthetic router: mostly sticky, occasionally jumps — stands in for the\n  // real logits until we have a checkpoint to trace.\n  const next = rand() < 0.72 ? prev : Math.floor(rand() * EXPERTS);\n  const predicted = history.get(prev);\n  if (predicted === next) hits++;\n  history.set(prev, next);\n  prev = next;\n}\n\nconst hitRate = hits / STEPS;\nconsole.log('depth-1 hit rate:', hitRate.toFixed(3));\nreturn hitRate;\n```\n\nThat number is the one the Adversary should be attacking next, not the premise.",
  );
  s = setForks(s, probe, [
    { title: 'Attack the measured rate', premise: 'Is 70% actually the bar, or did I just pick a number?', agent: 'adversary' },
  ]);

  return { ...s, activeId: probe };
}

const App = () => {
  // Local state so the harness can actually exercise the live loop: click Run,
  // the real Worker sandbox executes the block in this real browser tab, and
  // the result comes back as a message. This is the part most worth eyeballing
  // directly, since vitest's jsdom environment has no real Worker to run it in.
  const [state, setState] = useState(demo());
  const [runningId, setRunningId] = useState<string | null>(null);
  const active = nodeById(state, state.activeId)!;
  const scores = scoreNet(state.nodes);

  const onRunProbe = async (messageId: string, code: string) => {
    setRunningId(messageId);
    const result = await runProbe(code);
    setState(s => addMessage(s, s.activeId!, 'probe', formatResult(result)));
    setRunningId(null);
  };

  return (
  <div className="fr-shell" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', ...VOID_BACKGROUND, color: C.text }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
      <span style={{ fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.16em', color: C.meta }}>FRONTIER</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{state.plot!.name}</span>
      <span style={{ fontFamily: MONO_FONT, fontSize: 10, color: C.meta }}>{state.nodes.length} NODES · 4 HOT</span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
        <AgentLegend />
        <span style={{ color: C.meta, fontFamily: MONO_FONT, fontSize: 10 }}>SIGN OUT</span>
      </div>
    </div>

    <div className="fr-main" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px' }}>
      <div style={{ position: 'relative', minWidth: 0, minHeight: 0 }}>
        <NetCanvas nodes={state.nodes} activeId={state.activeId} onSelect={() => undefined} />
        <div style={{ position: 'absolute', left: 14, bottom: 14, maxWidth: 260 }}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.12em', color: C.meta, marginBottom: 6 }}>THE FRONTIER</div>
          {state.nodes
            .filter(n => scores[n.id].isFrontier)
            .sort((a, b) => scores[b.id].heat - scores[a.id].heat)
            .slice(0, 5)
            .map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 7px', color: C.muted, fontSize: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ['#f0779a', '#e0b44c', '#8fbf6a', '#4fa3a0', '#3f6f8f'][0], flex: 'none' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
              </div>
            ))}
        </div>
      </div>

      <div style={{ borderLeft: `1px solid ${C.border}`, background: C.surface, minWidth: 0, minHeight: 0 }}>
        <ConversationPanel
          node={active}
          score={scores[active.id]}
          ancestors={ancestorsOf(state.nodes, active.id)}
          busy={false}
          error={null}
          runningMessageId={runningId}
          onSend={() => undefined}
          onTakeFork={() => undefined}
          onToggleResolved={() => undefined}
          onStartCollide={() => undefined}
          onJump={() => undefined}
          onRunProbe={(id, code) => void onRunProbe(id, code)}
        />
      </div>
    </div>
  </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
