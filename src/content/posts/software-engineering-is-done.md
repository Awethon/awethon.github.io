---
title: "AI and Its Meat Proxies"
date: 2026-10-13T12:00:00+02:00
draft: false
tags: ["AI", "Claude Code", "Software Engineering"]
---
On November 24, 2025, Adam Wolff, who works on Claude Code at Anthropic, posted this:

![Adam Wolff on X, Nov 24, 2025: "I believe this new model in Claude Code is a glimpse of the future we're hurtling towards, maybe as soon as the first half of next year: software engineering is done. Soon, we won't bother to check generated code, for the same reasons we don't check compiler output."](/wolff-tweet-software-engineering-is-done.png)

The engineering community did not take it well. Software engineering is done? The same AI that hallucinates APIs, confidently deletes your tests to make them pass, and apologizes for a mistake and then makes another one right after?

Well, the first half of 2026 has come and gone. It's October now, and I'm writing this in between reviewing pull requests that were written and opened without any human involvement. I still check every one of them, so by the tweet's own standard, the prediction failed. And yet, if the people hating on that tweet last November could have seen my current workday, and how many autonomous AI agents we run for our internal needs, I'm not sure they'd have believed it.

So was he wrong? Well, he was wrong about the date, and right about almost everything else. That's not a comfortable conclusion for people like me, who've made software engineering a big part of their lives and their only source of income.

## The sticky label

When GitHub Copilot came out in 2021, it felt like magic for about a week. It could finish a line, then a whole function, and if you wrote a comment describing a method, there was a decent chance it would write that method correctly on the first try. Boilerplate stopped being something you typed. But it made plenty of mistakes, and it could only see the files you had open. It knew nothing about the rest of your project, let alone your logs or your tickets. So it got labeled as a dumb helper, like a junior who needs constant supervision. Anyone who said it would replace us got laughed at, and honestly, at the time, that was fair.

Then the limitations started disappearing, one by one. Context windows grew. Tools learned to look beyond a single file. By the time Claude Code arrived in early 2025, AI could explore a whole repository, find the relevant files on its own, and work on much harder problems without hand-holding. The consensus moved, but only a little: it's great at "do what I did there for X, but for Y," but ask it to design something on its own and it hallucinates, takes shortcuts, and has no taste.

That was also mostly fair. But notice what happened: the capabilities had changed completely, and the label had barely changed at all. "Dumb helper" became "slightly less dumb helper," and it has stayed there through every release since.

I think there are a few reasons for that, and none of them are about the models.

The first is anchoring. Most of us formed our opinion of AI coding in the Copilot era, and every new model gets judged against that first impression rather than against what it actually does today.

The second is confirmation bias. Once you believe AI is a helper that makes mistakes, every mistake confirms it and every success looks like luck. And if you look for mistakes, you will always find one. No codebase written by anyone has zero.

The third is moving goalposts. "It can't write code" became "it can't write good code," which became "it can't design systems," which became "it can't understand requirements." Ask a skeptic what AI would have to do to convince them it can be an autonomous engineer. Most people can't give a concrete answer, or the answer is something it can already do with the right tools. If no result could change your opinion, your opinion isn't coming from the results.

I'm not above this either. When a PR goes wrong, I blame the model. When it goes right, I praise my prompt and, most importantly, myself.

Some skepticism is worth taking seriously. Maybe transformers have a ceiling, and we'll hit it before AI can be trusted alone. Maybe we'll never trust code no human has read the way Wolff predicted we would, the way we trust a compiler. But nothing about the past year looks like a ceiling to me. And when people say AI can't do architecture or figure out what to build, I don't hear a limit. I hear the next goalpost.

## Where we are now

So what does a workday actually look like now?

A typical task starts with a ticket. Before writing a single line, the agent goes and gets what it needs: it reads the Jira ticket and the Slack thread where the problem was discussed, checks the logs, queries the database, and calls the endpoint to see what actually comes back. A year ago, gathering all of that was my job. I'd paste it into the prompt piece by piece and hope I didn't forget anything. Now it happens without anyone asking.

Then it works. The task gets split into smaller pieces, subagents pick them up, and a PR appears. It doesn't stop there either: it watches CI, waits for the merge, waits for the deployment, and tests the change on staging by itself. When it's done, the prompt field already suggests what to ask next, and more often than not, the suggestion is the right one.

Sessions no longer wait for each other either. Claude Code now creates a separate git worktree for each session, so several agents can work on the same repository at the same time, each on its own branch, without stepping on each other's changes.

What surprised me more than the speed was the quality. I write Scala with cats-effect and tagless final, a style that's easy to get subtly wrong. A year ago, Claude wrote Scala like a Java developer on their first day, and no amount of CLAUDE.md could fix it. Now it writes the way a senior engineer on my team would, with no special instructions. The only trick I still use is asking for "neat, tidy, and self-documented code." It makes the model choose better names instead of leaving comments, and keeps it from producing 3,000-line PRs that solve the problem with machinery nobody wants to maintain.

The way it handles bugs is something I don't think humans can match. It fetches and analyzes thousands of log lines, aggregates them if needed, and builds a theory of why the bug happens based on the code. If the theory can't be confirmed with tests, it calls the real API on staging, sets up the conditions for the bug, and reproduces it. Humans can do all of this too, just much slower: an investigation that would take an engineer three days takes AI under fifteen minutes. And an engineer can fail at every step along the way: miss the pattern in the logs, fail to come up with a theory, fail to build a reproduction. Now these investigations are fast and, in my experience, reliable.

It doesn't stop at our own code either. When engineers realized a bug was actually in an open-source library, most of us opened an issue and switched to another library. AI doesn't care whose code it's reading. It localizes the bug in the library and opens a PR there, all within the same fifteen minutes.

I'm speechless. Good thing this is a post and not a talk.

It still makes mistakes, but they've changed. Most of the issues I see now come from missing context: a convention that lives only in someone's head, a decision made in a meeting nobody wrote down. That's not a model failing to think. It's a model that wasn't told.

And all of this got better without getting more expensive. My subscription costs the same $200 a month it did a year ago, and I can't hit its weekly limit no matter how hard I try. The newest Opus matches Fable, the model I used to switch to when I needed a real leap in quality, at less than half the price per token.

So my job is now mostly this: AI investigates, writes, tests, and ships, and I read what it produced and decide whether it's right. That last part is where things are starting to break.

## The bottleneck

I've become the bottleneck.

Not in the sense that I feel useless, but in the sense that I'm too slow. Every PR still needs a human approval, and to approve it, I have to understand both the problem and the solution. That takes time, and in the time it takes me to understand one solution, AI could have produced three more.

I've adapted, of course. I don't start by reading a PR anymore. I ask AI to explain it to me first: what the problem was, what changed, and why. It helps me understand the diff much faster. Then I try to poke holes in it, again with AI's help. Will this work for this case? Do you find this readable? Do you like the naming? The last two questions are less about the code and more about me. If something confuses me, I want to know whether the code is actually unclear or whether it's just me. I don't want to block someone's merge over a problem that's actually mine.

And honestly, I trust it more than I used to. AI now tests its own changes and checks them against real data on staging before I ever see them. I don't feel the need to read its PRs more thoroughly than I would have read a colleague's before AI.

So by the tweet's standard, the trend points Wolff's way: I check generated code less carefully every month. But I haven't stopped, and the strange part is that reviewing getting easier hasn't made me feel any less overwhelmed. There's just so much more of it. Far more information flows through me than ever before: more PRs, more investigations, more decisions waiting for a "yes." We now have to work at the pace of AI while remaining human, and humans don't scale.

Look at what my review actually is now, though. Before I even open a PR, a Claude agent in our CI has already reviewed it and left its comments on GitHub. Then AI explains the change to me, answers my questions about edge cases, and tells me whether the naming makes sense. What I add is the approval itself, the moment a human says "yes" and takes responsibility for it. Which raises an uncomfortable question: what exactly is a human for in this loop?

## Meat proxies

My answer, for now: to fill the gaps.

We're in a transition period. On one side is the AI we started with, which couldn't be trusted and couldn't do much. On the other is AI that can be trusted with the whole job: it has the facts, does the research, and has every tool it needs. We're somewhere in between, and that space in between is where engineers currently live.

Some of the gaps are about trust. AI still makes mistakes, less often than before, but often enough that someone has to approve its work before it reaches production. That someone is me. And my approval isn't valuable because I'm smarter than the model. It's valuable because I'm accountable, and the model isn't.

Other gaps are about reach. Not every system has an API, and not every tool has a connector. Some context lives in a meeting, in a client's head, or in legacy software nobody wants to modernize. Some actions need production credentials that nobody, reasonably, wants to hand to an agent yet. So I do those parts. I go to the meeting and bring back the notes. I click through the old interface. I run the command with my credentials after the AI tells me which command to run.

Described this way, my work starts to sound less like engineering and more like being a proxy. A meat proxy: a piece of biological intelligence with a better interface to the parts of the world AI can't reach yet. AI makes the decision, and I carry it to the place it can't get to on its own.

That's not as bleak as it sounds, at least not yet. Filling these gaps still takes judgment: knowing which meeting matters, which command is safe to run, which "yes" is risky. But the important word is "yet." Every one of these gaps is the kind that closes. Trust grows with every release that doesn't break production. Connectors get written. Context gets written down. Each new model and each new tool removes one more gap, and with it, one more reason for me to be in the loop.

Not everyone believes these gaps will close, of course. The most popular argument against it points at vibe coders.

## The case for humans, and why it's shrinking

The argument goes like this: if AI is so powerful, why haven't people with no engineering background used it to build startups that replace the existing businesses? Or, more modestly, why can't what they build match existing products, in features or in quality?

My answer, and I think the answer of anyone who has tried vibe coding, is that bad decisions stack, and they stack terribly. Here's an oversimplified model. Say AI on its own implements a feature that works in 90% of cases, and an experienced engineer working with AI makes the same feature work in 95% of cases. Now build a workflow out of four such features, where the workflow only succeeds if every step succeeds. The vibe-coded version works 65.61% of the time. The engineer's version works 81.45% of the time. A five-point difference per feature becomes a sixteen-point difference per workflow, and real systems have hundreds of thousands of lines of code and far more than four dependent parts.

Real systems aren't simple chains, of course. Good architecture isolates failures, retries what can be retried, and catches errors before they spread. But that only strengthens the point: knowing how to build that kind of system is exactly what the experienced engineer brings, and the vibe coder doesn't.

It's a good argument for humans. If you came here looking for hope, this is a good place to stop reading.

Because the gap is shrinking, and I don't see what stops it. What separates the engineer from the vibe coder is experience: knowing what works and what fails, which shortcuts come back to bite you, which designs survive contact with production. And experience is exactly what AI is accumulating faster than any of us. It learned from everything people wrote on the internet, and it keeps learning from every session we run with it: which PRs got merged and which got reverted, which builds failed, which changes caused bugs a week later. No engineer has seen that many trials and errors. Eventually, AI will know better than any of us what works and what doesn't, simply because it has watched us find out.

When AI alone reaches 95%, the gap between the vibe coder and the engineer disappears, at least as far as code is concerned. What's left is the part skeptics now point to: knowing what to build in the first place.

## What to build

Wolff's original tweet compared generated code to compiler output, and the analogy is better than it looks. We don't read compiler output because there's overwhelming evidence that it works: decades of testing, and in some cases, like the CompCert C compiler, a mathematical proof that the generated code does exactly what the source says. AI could, in principle, earn the same trust the same way, by writing code together with a machine-checked proof that it does what it's supposed to. But a proof needs a specification, a precise statement of what the code should do. And writing that is exactly what Wolff's second tweet calls the hard part: figuring out what to build.

![Adam Wolff on X, follow-up: "I love programming, and it's a little scary to think it might not be a big part of my job. But coding was always the easy part. The hard part is requirements, goals, feedback—figuring out what to build and whether it's working."](/wolff-tweet-coding-was-the-easy-part.png)

So is it really that hard? I think it helps to split it into two questions: what to build technically, and what to build for the people involved.

The technical part is, in my experience, no longer the problem. Once AI knows what we're building and for whom, it doesn't propose one solution, it proposes a dozen, and it asks the right questions to settle on one. When it fails, it's almost always because it didn't have the context. And I know how that sounds, since "it was missing context" can explain any failure. But I see the difference every day. When I start a task with nothing but my prompt, AI makes the mistakes you'd expect. When the task comes with logs, the Slack conversation, a proper description, and access to the database and to APIs, the result is perfect or close to it. The model was just as smart both times. The second time, it simply knew more.

And the information is getting easier to find. For years, a lot of it was lost: decisions made verbally, agreements nobody wrote down, knowledge living in one person's head. That's changing. Teams are building knowledge bases, AI fills tasks with context so it doesn't get lost, and every Zoom call now comes with a transcript and a summary. The context problem isn't solved, but it's shrinking every month.

The second question is harder, and it's not about information at all. Requirements come from people, and people have interests. Sales, security, product, and the client all want different things, and not because anyone is being irrational. Each of them wants what benefits their side most, and ignoring any of them hurts someone. Wolff's tweet names one more hard part: figuring out whether it's working. That depends on who you ask, too. Some features are built to make the company more popular, some to make it more profitable, some because a competitor has them. You can't settle that by picking a metric either: once a metric becomes the goal, it stops measuring what you cared about. AI knows this problem well. It's the same instinct that once made it delete tests to make them pass.

Given enough context about each side, I think AI can find good compromises, probably better than most of us. But finding the compromise isn't the hard part. Getting everyone to accept it is. That takes conversations, persuasion, and finding the right words for each person, and people want to have those conversations with people. Customers do too: most would rather give feedback to a human than to a bot. And AI still can't read a room. I can't picture AI in voice mode calming down a tense meeting anytime soon.

So Wolff is right that this part is hard, and right that it will stay human for a while. But look at what it is: negotiation, persuasion, politics. It's real work, and it matters. It just isn't software engineering. And even here, we end up as meat proxies again: AI finds the compromise, and a human carries it into the room.

## What's left for humans

So what's left for humans? I can think of three answers, and I'm not equally convinced by all of them.

The first is responsibility. AI will never be perfect, and when something critical happens, when customers lose money, it would be strange for a company's leadership to blame the model, or Anthropic. Somebody has to pull the trigger and own the outcome. This isn't a new idea, either. Part of the reason consulting firms exist is that a decision backed by outside analysis is easier to defend than one made alone.

But I'm not convinced responsibility is enough to keep engineers around. Software engineers are expensive, and being accountable for AI's output doesn't obviously justify an engineer's salary. Why couldn't any manager run the prompts and sign off just as well? And it's not clear the sign-off itself will survive. If autonomous AI becomes the industry norm, accepting its decisions without a human in between may become as ordinary as trusting the compiler.

The second answer is judgment: deciding what to do, not just doing it. Here it helps to look at how AI as a product has evolved. First, it was text in, text out. Then it learned to act on the world outside the chat: calling tools, running scripts. That made it a worker, something that gathers context in order to change things. Now it orchestrates multiple workers to manage its own context window. The next step seems obvious: orchestrating thinkers, agents that gather context not to act on it, but to analyze it and draw conclusions. Thinkers decide what should be done and in what order, and workers do it.

Picture someone opening a session and writing: "I want to build a better Salesforce. These are my values and what I care about. Analyze the market and build it." The orchestrator asks a few clarifying questions, spawns thinkers to research the market and the competition, assembles a specification, and hands it to workers. Oversimplified, sure. But which step is impossible?

The fully automated company sounds bizarre, but maybe only because our experience with AI so far has taught us not to leave it alone, and maybe a little because it hurts our ego. What would actually stop it? Output quality, for now. And something subtler: AI has no sense of time. It doesn't feel a project growing. Left alone, it could keep adding features until the product spreads like a tumor and its customers no longer understand it. But I suspect even that is mostly a matter of the prompt, of someone telling it what not to build.

Notice who is still in that picture, though: the person writing the first prompt. The one who brings the values, decides what matters, and says what not to build. That's the owner, not the engineer.

The third answer is the one I'm most sure of, and it's the physical world. Back in the 1980s, AI researchers noticed something strange, now known as Moravec's paradox: what's hard for humans, like math, logic, and chess, turned out to be easy for computers, while what's effortless for us, like seeing, moving, and handling objects, turned out to be extremely hard. It still holds. An agent browsing a website by moving a cursor is far slower than a person. An average gamer will beat AI at a random game it was never trained on. I have a hard time imagining a fully autonomous plumber, or surgeon.

But that doesn't mean humans stay in charge there. AI can't hold the wrench, but it can diagnose the leak and tell the plumber exactly what to do. Even when a robot plumber becomes possible, a human with an AI in their ear may stay cheaper for a long time. And this isn't science fiction: warehouse workers already follow instructions from software that tells them which shelf to go to, and delivery drivers follow routes an app decided for them. The decisions are made elsewhere, and the human is the hands and eyes.

That's the meat proxy again, only this time not for engineers, but for people in general. AI decides, and humans go where it can't reach, or where sending a robot isn't worth the money.

Responsibility, judgment, the physical world: none of them needs many software engineers.

## When code is cheap

"Why buy their solution if we can just build it with AI?" is a question I hear more and more in engineering teams, at different companies. And often, they're not wrong. Today's AI is autonomous enough, and its output good enough, that building in-house is a realistic option for things we used to pay for. Open source is benefiting too. For years, its biggest problem was that very smart people did it for free while still having to earn a living, and many contributors eventually left. Now the same output takes a fraction of the time, so contributing is far more sustainable. It's not all good news for maintainers, who are also flooded with AI-generated bug reports and pull requests of questionable quality, but the overall direction is clear: alternatives to paid software are getting easier to build, by companies and by communities.

The result is that the whole classic IT industry is moving toward lower prices. A company with fewer employees and fewer third-party subscriptions can undercut its competitors, and with open source alternatives getting stronger, cutting costs this way is a good decision anyway.

So if any company can rebuild your software, what protects you? I think value is moving from code to everything that can't be generated.

Think back to the person asking AI to build a better Salesforce. Even if it works, Salesforce doesn't die overnight. Its customers' data lives there. Thousands of integrations depend on it. Switching is expensive and risky. The software was never its only advantage.

Data matters most. It's food for AI, and a company with data nobody else has, whether about its customers, its domain, or its operations, owns something AI can't produce on its own.

Infrastructure matters too. AI is a layer on top of existing physical and computational infrastructure, and it amplifies whatever is underneath. Chip makers, data center owners, and energy providers win no matter which AI product succeeds, the same way people selling shovels got rich in a gold rush regardless of who found gold. A company running its own data centers can outcompete one that rents them, no matter how good the other's software is.

Then there's secrecy. Topaz, the company behind the popular image and video upscalers, moved some of its models to the cloud. Whatever their actual reasons, it's a smart move now: there's nothing to copy if the model never leaves their servers. I expect this to become a trend: less transparency, more things hidden behind an API.

And finally, reputation. It's no longer cool to be the disruptive startup. When anyone can launch a product in a weekend, thousands of products will disappear just as fast, and having been around for twenty years becomes a selling point again. Classic enterprise companies will learn to move faster, maybe not as fast as AI startups, but people will choose them anyway, because they've earned their reputation over years and they aren't going anywhere.

Companies have options. Software engineers don't. There's no clever trick we can use to reduce our competition with AI.

So how many engineers will a company keep? I don't think there's a fixed answer anymore. There's a minimum, set by need: enough people to verify that generated code makes sense, and to pull the plug if AI starts doing irreversible damage. Above that, it's just a budget decision. A company keeps as many engineers as it can afford without hurting itself financially, and every competitor that keeps fewer is a reason to reconsider.

The usual counterargument is Jevons paradox: when using a resource becomes cheaper, we end up using more of it, not less. When steam engines became more efficient, coal consumption went up. When programming became easier, through compilers, high-level languages, and the cloud, the number of programmers grew. And I think the paradox will hold again. Software will become far more accessible, often even free, and we'll use much more of it than today. But the resource that's becoming cheaper isn't the engineer anymore. It's compute. Demand for software will grow, and demand for tokens with it, but I'm not sure demand for the people who write software will. If Jevons paradox applies to anyone this time, it's to the data centers, not to us.

## Where that leaves us

So where does that leave us, in October 2026?

Somewhere in the middle. AI already does most of the engineering: it investigates, writes, tests, and ships. But it still needs us for the rest. We approve every change it makes, we go to the meetings it can't attend, and we carry its decisions to the places it can't reach. For now, we're its meat proxies.

That's not a bad role, and it's not a useless one. Proxies are only needed where the gaps are, and right now there are plenty of gaps. The most useful thing an engineer can do today is help close them: write things down, connect the tools, put the context where AI can find it. As far as I can tell, AI's output is almost always good when it has the right context and a clear idea of what's expected. The prompt is the easy part. The context is the work.

The transition period won't last forever. The gaps are closing with every model and every new connector, and one day "software engineering is done" won't be a controversial phrase anymore. Wolff was wrong about the date. I'm not going to guess a new one.

But some gaps will stay open much longer than others: the negotiation room, the owner's values, the physical world. Wherever AI makes the decisions and can't carry them out, there will still be a human to do it. That's where most of us will end up. Not as engineers, maybe, but still very much needed.
