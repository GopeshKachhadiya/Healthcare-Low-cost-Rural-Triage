# Graph Report - patient-website  (2026-07-02)

## Corpus Check
- 14 files · ~1,398 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 61 nodes · 60 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_App.tsx|App.tsx]]
- [[_COMMUNITY_Home.tsx|Home.tsx]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_Navbar.tsx|Navbar.tsx]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `scripts` - 4 edges
3. `PulseDivider()` - 2 edges
4. `TierBadge()` - 2 edges
5. `Footer()` - 2 edges
6. `Layout()` - 2 edges
7. `ComingSoon()` - 2 edges
8. `private` - 1 edges
9. `dev` - 1 edges
10. `build` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 1 - "package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, preview, type, version

### Community 2 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, postcss, tailwindcss, @types/react, @types/react-dom, typescript, vite (+1 more)

### Community 3 - "App.tsx"
Cohesion: 0.31
Nodes (3): Footer(), Layout(), ComingSoon()

### Community 4 - "Home.tsx"
Cohesion: 0.28
Nodes (5): PulseDivider(), Tier, TIER_CONFIG, TierBadge(), QUICK_ACTIONS

### Community 5 - "dependencies"
Cohesion: 0.40
Nodes (5): dependencies, lucide-react, react, react-dom, react-router-dom

## Knowledge Gaps
- **35 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._