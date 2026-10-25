# Security

The editor runs in the browser and requests public metadata from `api.github.com`. It does not request GitHub access tokens, read private repositories, or change repository settings. Saved designs remain in browser storage unless the user exports a recipe or shares a design link.

Report security problems privately through the repository maintainer's security advisory channel. Avoid posting credentials or private design links in public issues.

Recipe imports are size-limited and validated. User-provided names render as text or canvas glyphs. Deployment hosts should apply the headers in `public/_headers`; hosts that do not support that format need equivalent configuration.
