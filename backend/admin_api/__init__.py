"""
Admin API — admin-only, platform-wide read endpoints.

Hosts the platform administration surface used by the frontend admin
experience:
  - Admin user list (search / role / active filters, paginated)
  - Platform audit log (the cross-cutting record of admin-visible actions)

Domain models (AuditLog) and serializers live here so the whole
administration slice has a single home. The `record_audit` helper is called
from other apps' views (verifications, campaigns) to build the trail.
"""