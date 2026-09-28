# Validated Tang Nano boundary-repair optimization

This directory is an isolated preparation area. The original `master` branch and its C project are unchanged. The contribution target is **tscircuit/calculate-cell-boundaries**, not this repository.

## Completed evidence

- Tested upstream: `5714b3026ab1c1af143265e6f79d0bf428664271` (v0.0.24).
- [Successful native validation](https://github.com/dohyun1828/sum_test/actions/runs/36443966088).
- Original tests: **33 pass / 0 fail**. Patched tests: **45 pass / 0 fail**.
- Original and patched type checks, formatting checks, and library builds passed.
- Additional coverage: **all 4,096** wall masks on a 3x3 board using an independent union-find oracle, **512** seeded differential layouts, boundary/degenerate cases, and input immutability.
- Existing Tang Nano fixture: 14 input cells, 5,364 internal grid rectangles. Exact output equality on every benchmark run, including IDs and ordering.

| Scope | Original median | Patched median | Speed ratio |
| --- | ---: | ---: | ---: |
| Repair stage | 7,561.81 ms | 323.73 ms | 23.36x |
| Complete public API | 9,858.54 ms | 2,544.43 ms | 3.87x |

Same Node v22.23.2 process, Linux x64, AMD EPYC 7763, identical dependencies. One warm-up per variant and three alternating measurements. These are fixture-specific observations, not universal guarantees.

The run artifact **cell-boundaries-complete-validation**, ID **10978864675**, contains the canonical formatted `submission/solution.patch`, sources, exact runtime bundles, dependency lock, logs, raw timings, output JSON, and SHA-256 checksums. Artifact ZIP SHA-256: `66f3c083130d2c1b39244726d830c0c8da2fbd592e912feea75f9f2147f153be`. Canonical patch SHA-256: `d94173cf2fbf6e4fb5089283700787d4f94e8556c5c6543c9e392d686925e5c3`.

## Upstream delivery state

[Upstream issue #44](https://github.com/tscircuit/calculate-cell-boundaries/issues/44) was actually created with the measured result, review request, and sponsorship-eligibility question. No upstream PR, merge, approved payment, or received funds are claimed.

The current contributor program describes at least four contributions and Discord participation. This patch has **no pre-approved fixed bounty**. Maintainer acceptance, program eligibility, and payment onboarding must be verified separately; a GitHub account alone does not establish income.

## Codex handoff

Read #44 and current upstream contribution rules first. Check latest upstream code and open PRs for duplicates. Download the verified artifact or use the complete handoff ZIP supplied in ChatGPT. The source candidate and tests are also readable in this directory; the workflow reconstructs the frozen reference directly from the hash-checked upstream source.

Fork the actual target into `dohyun1828`, use a separate contribution branch, apply the **canonical artifact patch**, re-run native checks and the paired benchmark, and submit one focused PR. Only one production file and two tests belong in that PR. Keep this preparation repository, dependency setup files, benchmark artifacts, and unrelated changes out of it. Address actual review feedback without claiming approval or payment in advance. Do not split one fix into artificial contributions to satisfy program thresholds.

AI assistance was used; all linked CI checks were actually run. No account secrets are stored here.
