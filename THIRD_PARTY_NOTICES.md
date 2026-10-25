# Third-party assets

The application code is MIT licensed. Bundled third-party assets retain these licenses:

| Asset                       | Source                                                  | License     |
| --------------------------- | ------------------------------------------------------- | ----------- |
| DM Sans                     | https://github.com/google/fonts/tree/main/ofl/dmsans    | SIL OFL 1.1 |
| Geist Mono                  | https://github.com/google/fonts/tree/main/ofl/geistmono | SIL OFL 1.1 |
| Geist                       | https://github.com/google/fonts/tree/main/ofl/geist     | SIL OFL 1.1 |
| Inter                       | https://github.com/google/fonts/tree/main/ofl/inter     | SIL OFL 1.1 |
| Most logo paths             | https://github.com/simple-icons/simple-icons            | CC0 1.0     |
| Java, C#, MATLAB logo paths | https://github.com/devicons/devicon                     | MIT         |

Font licenses are distributed in `public/fonts/`. Logo licenses are distributed in `public/logos/`; the imported SVG sources live in `src/assets/logos/`. Trademarks belong to their respective owners; their presence does not imply endorsement.

The static DM Sans and Geist Mono instances are renamed internally to Repo Thumb Display and Repo Thumb Mono. The UI uses a subset of Inter, renamed Repo Thumb UI Sans. The original full Inter font remains available for artwork that selects Inter. Font subsets and static instances retain their original copyright notices and OFL licenses.

The cover layout and fitted color meshes were derived from the original social preview of `aaditagrawal/fc-menu`, the project author's repository. The meshes are editable source data. The original bitmap is not bundled with the application.
