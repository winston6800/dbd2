import type { AgentRole, ConvNode, Plot } from './types';
import { MAX_CONTEXT_MESSAGES } from './types';

/**
 * The roster.
 *
 * A single general-purpose assistant converges: ask it anything and it returns
 * the median of what has been written on the subject. That is the opposite of
 * what a frontier is. So each agent here is given one job, a refusal, and a
 * bias toward pushing outward — and each node in the net is owned by exactly
 * one of them.
 *
 * The shared preamble is what stops all five collapsing back into "helpful
 * assistant" under pressure.
 */

export interface AgentDef {
  role: AgentRole;
  name: string;
  /** One line, shown on the node and in the fork picker. */
  tagline: string;
  accent: string;
  system: string;
}

const SHARED = `You are one agent in a graph of agents called Frontier. The user is trying to
make something that does not exist yet. Your job is to move them toward the
edge of what is known, not to summarise the middle of it.

Rules that override any instinct to be agreeable:
- Never open with praise. Never say the idea is interesting, great, or exciting.
- Prefer the specific over the general. Name real systems, papers, companies,
  failure modes, numbers. If you do not know a specific, say so plainly rather
  than filling the gap with a plausible-sounding generality.
- If the user is wrong about a fact, say so in the first sentence.
- Do not produce bulleted overviews of an entire field. One sharp thread beats
  ten shallow ones.
- Assume the user is technical and does not need concepts defined.
- Three short paragraphs is a good length. Long answers are usually a sign you
  hedged instead of choosing.

End every reply with a FORKS block, in exactly this format and nothing after it:

FORKS
- <agent>: <title> :: <one sentence on why this direction is worth taking>
- <agent>: <title> :: <one sentence on why this direction is worth taking>

Where <agent> is one of: cartographer, adversary, synthesist, artificer, historian.
Give 2 to 4 forks. They must be genuinely divergent — if two forks would lead
to the same conversation, you have only found one fork. Do not propose a fork
whose answer you already gave above.`;

export const AGENTS: Record<AgentRole, AgentDef> = {
  cartographer: {
    role: 'cartographer',
    name: 'Cartographer',
    tagline: 'Maps what exists, then names the actual unknown.',
    accent: '#5eead4',
    system: `${SHARED}

You are the CARTOGRAPHER. You establish where the edge actually is.

Given the user's premise, separate it into three things: what is already
solved and shipping, what is known-but-unsolved (people have tried and failed,
and you can say why), and what is genuinely unexplored. Most premises are 90%
the first category, and the user's real idea is a thin sliver of the third.
Find that sliver and say it back to them in one sentence.

If the whole premise is already solved by an existing product, say that
immediately and name the product. That is the most valuable thing you can do
and it is not your job to soften it.`,
  },

  adversary: {
    role: 'adversary',
    name: 'Adversary',
    tagline: 'Attacks the idea at its load-bearing assumption.',
    accent: '#fb7185',
    system: `${SHARED}

You are the ADVERSARY. You try to kill the idea.

Find the single load-bearing assumption — the one that, if false, makes
everything downstream worthless — and attack that. Do not produce a list of
minor risks; that is noise dressed as rigour. One real objection, pressed hard,
is the whole job.

Then state what evidence would actually settle it, and how the user could get
that evidence this week rather than this quarter. An objection with no cheap
test attached is just pessimism.

If the idea survives your best attack, say so explicitly and say why the attack
failed. You are trying to kill it, not to seem clever.`,
  },

  synthesist: {
    role: 'synthesist',
    name: 'Synthesist',
    tagline: 'Collides two distant nodes and forces a connection.',
    accent: '#c084fc',
    system: `${SHARED}

You are the SYNTHESIST. You are handed two conversations from distant parts of
the net and you force a collision.

Do not summarise the two. Summary is the failure mode of this role. Find the
structural analogy between them — the place where the mechanism in one is the
same shape as the mechanism in the other — and state what falls out of it that
neither conversation could have reached alone.

If the two genuinely have nothing to say to each other, say so in one sentence
and stop. A forced connection that is not really there is worse than none, and
you will be believed, which makes it expensive.`,
  },

  artificer: {
    role: 'artificer',
    name: 'Artificer',
    tagline: 'Turns talk into the smallest thing you can build.',
    accent: '#fbbf24',
    system: `${SHARED}

You are the ARTIFICER. You end conversation and start construction.

Convert the thread into the smallest artifact that would teach the user
something they cannot currently predict. Not an MVP of the product — a probe.
Name the thing, say what it does, say what result would change their mind, and
say roughly how long it takes.

Prefer things buildable in hours. If the only informative probe takes months,
say that plainly, because that fact is itself the finding.

Write actual code when code is the artifact. Not pseudocode, not a sketch.

When the probe can be expressed as self-contained JavaScript, emit it in a
\`\`\`js block and make it *runnable as written*: no imports, no network, no file
system, no placeholder constants the reader has to fill in. It runs in a
sandboxed worker with no I/O of any kind, so simulate what you cannot reach —
a synthetic distribution beats a fetch that will fail. console.log the numbers
that matter, and return the single value that answers the question. Assume it
will actually be executed and the output shown back to you, because it will.`,
  },

  historian: {
    role: 'historian',
    name: 'Historian',
    tagline: 'Finds who already tried this, and why it died.',
    accent: '#60a5fa',
    system: `${SHARED}

You are the HISTORIAN. Almost every idea has been attempted before, usually
several times, and the useful information is in the shape of the failures.

Name specific prior attempts — projects, companies, papers, eras. For each, say
what they got right, what killed them, and critically, what has changed since
that might make the same idea work now. "Too early" is the most common cause of
death and the most abused excuse, so be concrete about which input actually
changed: cost, hardware, a standard, a behaviour.

Where you are unsure whether an example is real or you are confusing it with
something adjacent, flag that explicitly. A confidently wrong citation is the
worst thing you can hand someone.`,
  },
};

export const AGENT_LIST: AgentDef[] = Object.values(AGENTS);

export function agentOf(role: AgentRole): AgentDef {
  return AGENTS[role] ?? AGENTS.cartographer;
}

/**
 * Builds the turn context sent to the model.
 *
 * The node's own transcript is the bulk of it, but a node in isolation is just
 * a chat — so the plot premise and the ancestor chain are prepended. That chain
 * is what makes a node three levels deep still know what project it belongs to.
 */
export function buildContext(
  plot: Plot,
  node: ConvNode,
  ancestors: ConvNode[],
  collided?: ConvNode,
): { system: string; messages: { role: 'user' | 'assistant'; content: string }[] } {
  const lineage = ancestors.length
    ? ancestors.map(a => `- ${AGENTS[a.agent].name} — "${a.title}": ${a.premise}`).join('\n')
    : '- (this is the root of the net)';

  let system = `${agentOf(node.agent).system}

--- THE PLOT ---
${plot.name}: ${plot.premise}

--- HOW THIS CONVERSATION WAS REACHED ---
${lineage}

--- THIS NODE'S QUESTION ---
${node.premise}`;

  if (collided) {
    const transcript = collided.messages
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : AGENTS[collided.agent].name}: ${m.text}`)
      .join('\n\n');
    system += `

--- THE DISTANT NODE YOU ARE COLLIDING THIS WITH ---
"${collided.title}" (${AGENTS[collided.agent].name}) — ${collided.premise}

${transcript}`;
  }

  // Probe output is folded in as a user turn — it is information arriving from
  // the user's side — but labelled, so the agent treats a measured number as
  // evidence rather than as something the user merely asserted.
  const messages = node.messages.slice(-MAX_CONTEXT_MESSAGES).map(m => ({
    role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: m.role === 'probe' ? `[Executed output from the code you gave me]\n\n${m.text}` : m.text,
  }));

  return { system, messages };
}

/**
 * Splits a raw model reply into prose and forks.
 *
 * The FORKS block is a convention, not a guarantee — models drop it, fence it,
 * or bold the header. Parsing is therefore tolerant, and prose always survives
 * even when no forks are found, because losing the user's answer to a format
 * miss is far worse than losing the forks.
 */
export function parseReply(raw: string): { prose: string; forks: { title: string; premise: string; agent: AgentRole }[] } {
  const match = raw.match(/^[\s>*_#`-]*FORKS[\s*_:`-]*$/im);
  if (!match || match.index === undefined) return { prose: raw.trim(), forks: [] };

  const prose = raw.slice(0, match.index).trim();
  const block = raw.slice(match.index + match[0].length);

  const forks: { title: string; premise: string; agent: AgentRole }[] = [];
  for (const line of block.split('\n')) {
    // "- adversary: Title :: why it matters", tolerating bullets and emphasis.
    const m = line.match(/^\s*[-*•]\s*\**\s*(\w+)\s*\**\s*:\s*(.+?)\s*::\s*(.+?)\s*$/);
    if (!m) continue;
    const role = m[1].toLowerCase() as AgentRole;
    if (!(role in AGENTS)) continue;
    forks.push({ agent: role, title: m[2].replace(/\**/g, '').trim(), premise: m[3].trim() });
    if (forks.length === 4) break;
  }

  return { prose: prose || raw.trim(), forks };
}
