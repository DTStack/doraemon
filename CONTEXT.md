# dt-doraemon / dt-skill

Developer toolbox (Doraemon) and its skills CLI (dt-skill): install, publish, and update agent skills against an internal registry.

## Language

### Scope (安装范围)

Where a skill is installed for a user: either the current project tree or the user’s machine-wide home tree.
_Avoid_: environment, workspace (ambiguous), “directory only” without project vs global

### Project scope

The install/update domain rooted at the current project’s agent skills area (project `.agents` tree).
_Avoid_: local (ambiguous with “local path skill”), cwd-only

### Global scope

The install/update domain rooted at the user’s home agent skills area (`~/.agents` tree).
_Avoid_: system-wide, user package (npm sense)

### Update scope

The domain(s) an **update** run applies to: project, global, or both. Only **update** uses “both”; install is single-scope.
_Avoid_: using “scope” alone when you mean only install placement

### Content fingerprint

The content identity of a skill’s text files used to decide whether installed content matches the registry’s current skill; the primary signal for “needs update”.
_Avoid_: version alone as the change signal, GitHub tree SHA as the product contract for dt-skill
