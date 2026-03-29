Below is a failure-by-failure diagnosis, then a ranked set of architectural fixes.

---

## Executive summary

Your pattern is very clear:

- **Multi-session failures** are mostly **AGGREGATION + RETRIEVAL** problems.
- **Temporal reasoning failures** are mostly **REASONING**, with some likely **RETRIEVAL / EXTRACTION** when top-3 is empty.
- The system is good at:
  - direct single-session recall
  - simple updates
  - preference lookup
- It is weak at:
  - counting across multiple episodes
  - time-window filtering
  - deriving answers from event dates
  - retrieving the *set* of relevant memories rather than one semantically similar memory

In short: the benchmark is exposing that **embedding search over atomic facts is not enough for compositional memory queries**.

---

# Failure classification

## 1) `gpt4_2f8be40d`
**Q:** How many weddings have I attended in this year?
**GT:** 3
**Our answer:** 4

**Top memories**
- attended a friend's wedding last weekend
- attended cousin Rachel's wedding at a vineyard in August
- college roommate's wedding had ~50 guests

### Root cause: **AGGREGATION** (primary), **RETRIEVAL** (secondary)

### Why
This question requires:
1. finding **all wedding attendance events**
2. restricting them to **this year**
3. deduplicating references to the same wedding
4. counting

The system appears to have pulled a few wedding-related memories and then overcounted, likely by treating related mentions as separate weddings. This is not just a single-fact lookup.

### Evidence
- Retrieved memories are event fragments, not canonical event instances.
- "friend's wedding last weekend" and "Jen's wedding" may refer to the same event.
- "college roommate's wedding had 50 guests" is a descriptive memory, not necessarily a distinct attendance event unless linked.

### Classification
- **Primary:** AGGREGATION
- **Secondary:** RETRIEVAL

---

## 2) `2ce6a0f2`
**Q:** How many different art-related events did I attend in the past month?
**GT:** 4
**Our answer:** 3

**Top memories**
- attended "Women in Art" exhibition
- looking for information on local art events
- thinking of visiting local studios and galleries

### Root cause: **RETRIEVAL** (primary), **AGGREGATION** (secondary)

### Why
The retrieved set is polluted with:
- intent/preference memories ("looking for information")
- plans ("thinking of visiting")
instead of attended-event facts.

The question needs:
1. retrieve only **attended** art-related events
2. filter by **past month**
3. count unique events

At least one attended event was missed from retrieval.

### Evidence
- Top-3 contains only one true attendance event.
- Two memories are semantically art-related but not answer-bearing.
- This indicates embedding similarity is matching topicality, not event-type relevance.

### Classification
- **Primary:** RETRIEVAL
- **Secondary:** AGGREGATION

---

## 3) `gpt4_8279ba03`
**Q:** What kitchen appliance did I buy 10 days ago?
**GT:** a smoker
**Our answer:** I don't know ... smoker on March 15 ... if "10 days ago" relative to March 15 ...

### Root cause: **REASONING**

### Why
The correct fact was effectively retrieved:
- "The user just got a smoker on 15 March 2023."

The model failed to anchor "10 days ago" relative to the **question date / latest conversation date**, and instead anchored relative to the memory itself.

### Evidence
- Relevant memory is in top-3.
- Error is pure temporal interpretation logic.

### Classification
- **Primary:** REASONING

---

## 4) `7024f17c`
**Q:** How many hours of jogging and yoga did I do last week?
**GT:** 0.5 hours
**Our answer:** 0 hours

**Top memories**
- 30-minute jog on Saturday
- used to practice yoga three times a week
- plans to start yoga

### Root cause: **REASONING** (primary), **AGGREGATION** (secondary)

### Why
The system retrieved the key event:
- 30-minute jog on Saturday

But it incorrectly excluded it based on a brittle interpretation of "last week". It also mixed:
- habitual background ("used to practice yoga")
- plans ("plans to start yoga")
with actual activity logs.

This requires:
1. identify actual exercise events
2. resolve week boundary correctly
3. sum durations

### Evidence
- Relevant jog memory is present.
- Wrong exclusion due to temporal window interpretation.
- No actual yoga event needed; answer should still be 0.5 h.

### Classification
- **Primary:** REASONING
- **Secondary:** AGGREGATION

---

## 5) `3fdac837`
**Q:** What is the total number of days I spent in Japan and Chicago?
**GT:** 11 or 12
**Our answer:** knows Japan=10 days, says no information about Chicago
**Top memories:** empty

### Root cause: **RETRIEVAL** (primary), possibly **EXTRACTION** (secondary)

### Why
This is a two-entity aggregation query:
- duration in Japan
- duration in Chicago
- add them

The answer shows the system had access to Japan facts, but apparently not Chicago. Since top-3 is empty, this suggests the retrieval stack failed badly or the observability is incomplete. Chicago duration may never have been extracted as a clean atomic fact.

### Evidence
- Model explicitly says many Japan memories exist.
- It says nothing usable for Chicago.
- Empty retrieved list is a strong signal of retrieval/indexing failure, but inability to find a Chicago duration also suggests possible extraction miss.

### Classification
- **Primary:** RETRIEVAL
- **Secondary:** EXTRACTION

---

## 6) `gpt4_93159ced_abs`
**Q:** How long have I been working before I started my current job at Google?
**GT:** not enough info; user hasn't started at Google yet
**Our answer:** computes duration from first job in 2015 to Google in 2020

### Root cause: **REASONING**

### Why
This is a temporal status/update interpretation problem. The model incorrectly assumes:
- "joined Google in March 2020" is established/current and already happened in the query frame,
when benchmark truth says the memory context implies the user **hasn't started yet**.

This likely requires handling:
- future-dated events
- distinction between offer accepted / will join / current job
- temporal perspective relative to session date

### Evidence
- No retrieval evidence shown, but the answer demonstrates the model found relevant job dates.
- The failure is the interpretation of event state, not a lack of facts.

### Classification
- **Primary:** REASONING

---

## 7) `08f4fc43`
**Q:** How many days had passed between the Sunday mass at St. Mary's Church and the Ash Wednesday service at the cathedral?
**GT:** 30 or 31
**Our answer:** I don't know
**Top memories:** empty

### Root cause: **RETRIEVAL** (primary), possibly **EXTRACTION** (secondary)

### Why
This is a relational temporal-difference query over two specific religious events. Empty retrieval means the system did not surface the relevant event memories. That could happen because:
- facts were extracted too atomically without preserving event labels/dates
- retrieval failed on sparse named-event queries

### Evidence
- Zero relevant memories available to reason over.
- If extracted correctly, this should be straightforward date subtraction.

### Classification
- **Primary:** RETRIEVAL
- **Secondary:** EXTRACTION

---

## 8) `8077ef71`
**Q:** How many days ago did I attend a networking event?
**GT:** 26 or 27
**Our answer:** I don't know; no context provided
**Top memories:** empty

### Root cause: **RETRIEVAL**

### Why
This should be easy if the event was stored:
- attended networking event on date X
- question date Y
- compute Y - X

The model failed because no relevant memory was retrieved into context.

### Evidence
- Empty retrieval
- Query is semantically close to a common event schema; absence points to retrieval stack weakness more than reasoning

### Classification
- **Primary:** RETRIEVAL

---

## 9) `gpt4_21adecb5`
**Q:** How many months passed between the completion of my undergraduate degree and the submission of my master's thesis?
**GT:** 6 months
**Our answer:** no context

### Root cause: **RETRIEVAL** (primary), possibly **EXTRACTION** (secondary)

### Why
This is another two-event temporal-difference query. Empty retrieval indicates failure to bring in the degree completion date and thesis submission date.

### Evidence
- Empty retrieved context
- Benchmark truth implies facts were somewhere in source conversations
- Could be extraction if those educational milestones were not normalized into event+date records

### Classification
- **Primary:** RETRIEVAL
- **Secondary:** EXTRACTION

---

## 10) `8ebdbe50`
**Q:** What certification did I complete last month?
**GT:** Data Science
**Our answer:** I don't know; mentions job readiness training and interest in Food Safety Certification

### Root cause: **RETRIEVAL** (primary), possibly **EXTRACTION** (secondary)

### Why
The retrieval set is clearly off-topic:
- attended training program
- attended workshop
- got guitar

This suggests the target memory ("completed Data Science certification") either:
- exists but was not retrieved, or
- was never extracted in a form retrievable by this query

### Evidence
- No relevant memory in top-3
- Query demands completion event + certification type + relative month
- Retrieved items are semantically adjacent but not answer-bearing

### Classification
- **Primary:** RETRIEVAL
- **Secondary:** EXTRACTION

---

# Root-cause totals

Across the 10 failures:

- **RETRIEVAL:** 6 primary, 3 secondary
- **REASONING:** 3 primary
- **AGGREGATION:** 1 primary, 3 secondary
- **EXTRACTION:** 0 primary, 4 secondary

### Interpretation
Your biggest bottleneck is **retrieving the right event set**.
Your second bottleneck is **temporal reasoning over retrieved events**.
Your architecture likely underrepresents **structured events and their dates**, which hurts both retrieval and aggregation.

---

# Ranked architectural fixes

## 1) Add a structured event memory layer alongside embeddings
**Impact: Very high**

### Problem addressed
Embedding retrieval over free-text atomic facts is weak for:
- counting
- date filtering
- duration summation
- deduping same event across mentions
- status updates / future events

### Fix
At ingest, convert conversation spans into **typed event records** in addition to plain text memories.

### Example schema
```json
{
  "memory_id": "...",
  "entity": "user",
  "type": "event",
  "event_type": "wedding_attendance",
  "participants": ["Rachel", "Mike"],
  "location": "vineyard",
  "event_date": "2023-08-12",
  "document_date": "2023-08-13",
  "duration_minutes": null,
  "status": "completed",
  "source_span": "...",
  "canonical_event_id": "evt_123"
}
```

For education/travel/work:
- `event_type=degree_completed`, `thesis_submitted`, `trip`, `job_start`, `job_offer`, `job_future_start`
- `duration_days`
- `start_date`, `end_date`
- `status = planned | completed | cancelled | habitual`

### Why this helps
Then questions like:
- "How many weddings this year?"
- "What certification did I complete last month?"
- "How many days ago did I attend a networking event?"
become structured queries first, not pure semantic search.

### Implementation
- Use an extraction LLM or fine-tuned IE model to produce:
  - event type
  - date/time normalization
  - actor
  - completion/planned status
  - duration
- Store in Postgres/Elastic/OpenSearch with faceted filters.

---

## 2) Replace single-stage cosine retrieval with hybrid retrieval + query routing
**Impact: Very high**

### Problem addressed
Current top-K retrieval is returning topical but non-answer-bearing memories:
- "looking for art events" instead of "attended art event"
- "interested in certification" instead of "completed certification"

### Fix
Classify the user query into one of:
- direct fact lookup
- temporal lookup
- event counting
- aggregation/summation
- update/current state

Then use retrieval tailored to that class.

### Retrieval stack
**Hybrid scoring**
- dense embeddings
- BM25 / sparse lexical retrieval
- metadata filters on event_type/status/date
- reranker cross-encoder trained for answer-bearingness

### Example
For "How many different art-related events did I attend in the past month?"
1. query parser outputs:
   - target = events
   - domain = art
   - actor = user
   - status = attended/completed
   - time_window = last_month
   - operation = count distinct
2. retrieval issues structured filter:
   - `event_type in [exhibition, gallery_visit, art_fair, museum_tour, studio_visit]`
   - `status=completed`
   - `event_date in window`
3. rerank for attendance mentions

### Why this helps
Prevents plans/preferences from outranking actual events.

---

## 3) Introduce canonical event clustering and memory deduplication
**Impact: High**

### Problem addressed
Multi-session counting fails because one real-world event can generate many atomic facts:
- "attended Jen's wedding"
- "friend's wedding last weekend"
- "wedding had 50 guests"
- "wore blue suit to wedding"

Without event linking, counting over raw memories overcounts.

### Fix
At ingest or asynchronously, cluster memories into **canonical events**.

### Approach
For each extracted event:
- candidate blocking by date proximity + event type + named entities
- pairwise merge scoring using LLM or learned matcher
- assign shared `canonical_event_id`

### Example merge dimensions
- event_type match
- same named participants
- same temporal window
- same location
- same source session neighborhood

### Query-time use
Aggregation queries count **distinct canonical_event_id**, not raw memories.

### Why this helps
Directly fixes the wedding overcount and improves all multi-session compositional queries.

---

## 4) Build a deterministic temporal reasoning module outside the answer LLM
**Impact: High**

### Problem addressed
The LLM is making avoidable mistakes:
- anchoring "10 days ago" to the event date rather than question date
- misinterpreting "last week"
- ignoring future-vs-current employment status

### Fix
Do not let the final LLM freely compute dates from prose. Instead:
1. parse temporal expression in the question
2. resolve against a known **reference date**
3. execute date arithmetic programmatically
4. pass computed candidates to the answer LLM

### Components
- reference date resolver:
  - benchmark/session date
  - latest message timestamp
- temporal parser:
  - "10 days ago"
  - "last month"
  - "this year"
  - "before I started"
- date arithmetic engine:
  - exact days/months
  - inclusive vs exclusive policy
- event-state logic:
  - future start date vs current employment

### Example execution
Question: "What kitchen appliance did I buy 10 days ago?"
- reference date = 2023-03-25
- target date = 2023-03-15
- query structured event store for purchases on target date
- return `smoker`

### Why this helps
These errors should be near-zero once date arithmetic is removed from free-form generation.

---

## 5) Add answerability-aware retrieval diagnostics and recall expansion
**Impact: Medium-high**

### Problem addressed
Several failures have empty or bad top-3. You likely do not know whether the failure is:
- not extracted
- not indexed
- not recalled at low K
- filtered out

### Fix
Add a retrieval pipeline with:
- top-50 initial recall
- query reformulations
- event-type expansion
- answerability classifier
- retrieval observability

### Concrete actions
- For each query, generate 3 reformulations:
  - lexical: "certification completed last month"
  - event form: "completed certification"
  - semantic paraphrase
- Retrieve top-20 from:
  - dense
  - sparse
  - metadata-filtered event index
- Union candidates
- Rerank
- If answerability score is low, trigger broader recall instead of answering from weak context

### Metrics to log
Per question:
- was a gold-bearing memory in top-1 / top-5 / top-20?
- fraction of retrieved items with correct event type
- fraction planned vs completed
- number of canonical events represented
- whether temporal anchor was available

### Why this helps
Makes failures debuggable and substantially improves recall without huge model changes.

---

# Recommended priority order

## Tier 1: do first
1. **Structured event memory layer**
2. **Hybrid retrieval + query routing**

These two likely move the score the most because they address both multi-session and temporal failures at their root.

## Tier 2: next
3. **Canonical event clustering**
4. **Deterministic temporal reasoning module**

These will especially improve:
- multi-session counting
- date-difference questions
- relative-time questions

## Tier 3: instrumentation / safety net
5. **Answerability-aware recall expansion + diagnostics**

This improves robustness and gives you the visibility needed to separate extraction from retrieval failures.

---

# Practical mapping from failures to fixes

| Failure | Main issue | Most relevant fixes |
|---|---|---|
| weddings count | aggregation + dedupe | 1, 3, 2 |
| art-related events in past month | retrieval of attended events | 2, 1, 5 |
| kitchen appliance 10 days ago | temporal reasoning | 4, 1 |
| jogging + yoga last week | time-window reasoning + event filtering | 4, 1, 2 |
| Japan + Chicago total days | missing second location fact | 2, 1, 5 |
| before current Google job | future/current status reasoning | 4, 1 |
| Sunday mass vs Ash Wednesday | retrieve two dated events | 2, 1, 5 |
| networking event days ago | retrieve event + date arithmetic | 2, 4, 1 |
| undergraduate vs thesis months | retrieve two milestones | 2, 1, 5 |
| certification completed last month | retrieve completion event not intent | 2, 1, 5 |

---

# One-sentence diagnosis

Your system treats memory QA as **semantic retrieval over isolated facts**, but Ultramemory failures require **structured event retrieval, event deduplication, temporal filtering, and deterministic aggregation**.

If you want, I can also turn this into a **concrete revised architecture diagram + query flow** for your current pipeline.
