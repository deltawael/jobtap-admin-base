# Removable Unimplemented Features

## Confirmed Removable Now

### Login extension modules

The following login flows are exposed in the frontend template but do not have real product behavior and can be removed safely from the current productized baseline:

- `code-login`
- `register`
- `reset-pwd`
- `bind-wechat`

Current evidence:

- the deleted frontend modules only performed form validation, showed a success message, or rendered an empty component
- password login is the only login flow wired to the real auth store login action

Impact area:

- login page composition
- password login page navigation buttons
- login-related locale copy and i18n typings

Compatibility rule:

- legacy `/login/:module(...)` paths remain accepted by routing
- unsupported module values now fall back to the password login experience instead of loading separate feature modules

## Candidate For Phase 2

### Homepage demo dashboard modules

These modules appear to be template or demonstration content rather than confirmed product requirements:

- homepage warning banner
- static news feed
- statistics cards
- chart blocks
- creativity banner

Reason they are not removed in the current pass:

- they are demo-oriented, but not the same as a broken or empty feature
- removing them changes the default product landing page and should be handled as a separate product decision

## Not Included In This Cleanup

The following modules are intentionally retained for now:

- `access-key`
- login log
- operation log
- user management
- role management
- menu management

Reason:

- current evidence shows these pages are wired to API entry points or real management flows
- they may still be template-derived, but they are not confirmed empty shells

## Compatibility Artifacts Intentionally Retained

Some old login module strings still exist for route compatibility and should not be treated as active product features:

- login route typing for `/login/:module(...)`
- `UnionKey.LoginModule` legacy values
- backend seeded login route path pattern

If the project later decides to fully drop backward compatibility for old login URLs, these compatibility artifacts can be removed in a separate cleanup pass.