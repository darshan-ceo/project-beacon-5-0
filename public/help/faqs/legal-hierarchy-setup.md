# Legal Hierarchy Setup Guide

## Understanding the Legal Hierarchy

The legal hierarchy in Project Beacon defines the appellate structure for litigation cases. Proper configuration ensures:
- Correct case routing to appropriate authorities
- Accurate deadline calculations based on authority type
- Proper appeal path tracking through case lifecycle

---

## The Standard GST Litigation Hierarchy

```
Supreme Court of India
    ↑ (Appeal)
High Court (State-wise)
    ↑ (Appeal)
GST Appellate Tribunal (GSTAT)
    ↑ (Appeal)
Appellate Authority (Commissioner Appeals)
    ↑ (Appeal/Review)
Adjudicating Authority (Proper Officer)
```

---

## Frequently Asked Questions

### How do I configure authority levels?

1. Go to **System Settings → Legal Hierarchy**
2. Click on **Authority Levels** tab
3. Click **Add Level** to create a new tier
4. Define: Name, Code, Sort Order, Parent Level
5. Save and verify in the hierarchy visualization

### What's the difference between Authority Level and Authority?

- **Authority Level**: The tier in hierarchy (e.g., "High Court")
- **Authority**: Specific court/tribunal (e.g., "Gujarat High Court")

Authority Levels are generic classifications; Authorities are specific entities.

### How do I handle multiple benches for the same tribunal?

Create separate Authority entries:
```
- CESTAT Mumbai Bench
- CESTAT Ahmedabad Bench
- CESTAT Delhi Bench
```

Each links to the same "Tribunal" Authority Level but different locations.

### Do I need to configure all courts/tribunals upfront?

No. Configure authorities you actively appear before. Add others as needed. You can always expand the hierarchy later.

### How does the hierarchy affect case progression?

When recording stage transitions:
1. System validates the move is valid (you can't skip levels)
2. Deadlines are calculated based on target authority's rules
3. Case lifecycle shows progression through the hierarchy

### What are Matter Types and why do they matter?

Matter Types categorize the subject matter (GST, Customs, Income Tax). Each authority may handle specific matter types:
- GST Tribunal handles only GST matters
- High Court handles GST + other matters

Linking matter types to authorities filters case creation options.

### Can I create a custom hierarchy for non-tax matters?

Yes! The hierarchy is fully configurable. For example, for civil litigation:
```
Supreme Court
├── High Court
│   ├── District Court
│   │   ├── Civil Court
│   │   └── Family Court
```

Create authority levels and authorities matching your practice area.

### How do I handle writ petitions directly to High Court?

Some cases bypass lower authorities. Project Beacon supports this:
1. When creating a case, select the starting authority directly
2. The system doesn't force starting from the bottom
3. Lifecycle tracking begins from wherever you start

---

**Related Articles:**
- [Authority Level Configuration](/help/articles/authority-levels-guide)
- [Jurisdiction Mapping](/help/articles/jurisdiction-mapping)
- [GST Litigation Process](/help/case-studies/gst-litigation-flow)
