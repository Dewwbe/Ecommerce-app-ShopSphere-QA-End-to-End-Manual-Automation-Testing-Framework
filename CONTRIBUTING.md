# Contributing

## Branching (GitFlow)
- `main` – released, stable code
- `develop` – integration branch
- `feature/<jira-key>-<short-name>` – new work, branched from `develop` (e.g. `feature/SHOP-12-cart-tests`)
- `bugfix/<jira-key>-<short-name>` – defect fixes from `develop`
- `release/<version>` – release stabilisation, merged to `main` and `develop`

## Commit messages (Conventional Commits)
`<type>(<scope>): <summary>` with an optional Jira key, e.g. `test(cart): SHOP-12 add remove-item case`

Types: `feat`, `fix`, `test`, `docs`, `chore`, `build`, `ci`, `refactor`.

## Pull requests
1. Branch from `develop`.
2. Run the relevant tests locally (`npm test` in a service, or `mvn test -Dgroups=smoke`).
3. Open a PR into `develop` using the template, linking the Jira ticket.
4. Merge after CI passes and a review.

## Tests
- Every new test case gets a `TC-XXX-NNN` id, a row in `docs/test-cases.md` and a row in `docs/traceability-matrix.md`.
- UI locators use `data-testid`, and page interactions live in `selenium-tests/src/test/java/pages/`.
