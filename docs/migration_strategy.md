# Migration Strategy

1. Generate migrations with `alembic revision --autogenerate -m "message"`.
2. Review generated SQL before merging.
3. Run migrations automatically on container startup for simple deployments.
4. For regulated production environments, run `alembic upgrade head` as a separate release step before shifting traffic.
5. Never edit an applied migration; create a new migration instead.

Rollback:

```bash
alembic downgrade -1
```

