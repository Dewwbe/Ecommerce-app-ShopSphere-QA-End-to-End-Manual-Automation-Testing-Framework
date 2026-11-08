# Defect Log and Bug Report Template

Log real findings here and mirror each one as a Jira ticket in project `SHOP`.
Add screenshots under `docs/screenshots/` and link them. Failed Selenium runs save screenshots to
`selenium-tests/target/screenshots/`.

## Template (copy for each defect)

```
### SHOP-<n>: <short, specific summary>

| Field | Value |
|---|---|
| Reporter | |
| Date found | YYYY-MM-DD |
| Status | Open / In Progress / Ready for QA / Retest / Closed / Reopened |
| Severity | Critical / High / Medium / Low |
| Priority | P1 / P2 / P3 |
| Component | auth / product / cart / order / payment / gateway / frontend |
| Environment | OS, browser + version, build/commit, Docker or local |
| Related test case | e.g. TC-CART-003 or MAN-001 |

**Preconditions**

**Steps to reproduce**
1.
2.
3.

**Expected result**

**Actual result**

**Evidence**  screenshot, HAR, console or service log excerpt

**Notes / suspected cause**

**Retest**  date, build, result
```

## Defect index

| ID | Summary | Severity | Priority | Status | Found in | Test case |
|---|---|---|---|---|---|---|
| | | | | | | |

## Writing good bug reports
- One defect per report, with a summary that says what is wrong and where.
- Reproducible steps that someone else can follow without asking you questions.
- Expected versus actual result, stated separately.
- Attach evidence (screenshot, network response, logs).
- After the fix ships, re-run the same test case, record the result under **Retest**, and close or reopen.
