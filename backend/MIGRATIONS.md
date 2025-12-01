# Database Migrations Guide

This guide explains how to use Alembic migrations for the VC × Startup Matching Platform.

## 📋 Migration Status

### Current Migrations

1. **Initial Schema** (`a02621bffd9b`)
   - Creates all core tables: `profiles`, `likes`, `matches`, `messages`, `prompt_templates`, `startup_of_month`
   - Base schema for the platform

2. **Add Users Table** (`3aeff2fffeff`)
   - Adds `users` table for authentication
   - Includes OAuth provider IDs (Firebase, LinkedIn, Google)
   - Links users to profiles via foreign key

## 🚀 Usage

### Prerequisites

1. **Start Database:**
   ```bash
   # Using Docker Compose
   docker-compose up -d postgres
   
   # Or use your own PostgreSQL instance
   # Make sure DATABASE_URL in .env points to your database
   ```

2. **Check Current Migration:**
   ```bash
   cd backend
   alembic current
   ```

### Apply Migrations

**Apply all pending migrations:**
```bash
cd backend
alembic upgrade head
```

**Apply specific migration:**
```bash
alembic upgrade <revision_id>
# Example: alembic upgrade 3aeff2fffeff
```

**Rollback one migration:**
```bash
alembic downgrade -1
```

**Rollback to specific migration:**
```bash
alembic downgrade <revision_id>
# Example: alembic downgrade a02621bffd9b
```

### Create New Migrations

**Auto-generate migration (recommended):**
```bash
# Make sure database is running and models are imported
alembic revision --autogenerate -m "Description of changes"
```

**Create empty migration (manual):**
```bash
alembic revision -m "Description of changes"
# Then manually edit the generated file
```

### View Migration History

```bash
# Show all migrations
alembic history

# Show current migration
alembic current

# Show migration chain
alembic heads
```

## 📝 Migration Files

Migrations are stored in `backend/migrations/versions/`.

Each migration file contains:
- `upgrade()`: Applies the migration (creates tables, adds columns, etc.)
- `downgrade()`: Reverts the migration (drops tables, removes columns, etc.)

## ⚠️ Important Notes

1. **Always review auto-generated migrations** before applying them
2. **Test migrations on a development database first**
3. **Never edit existing migrations** that have been applied to production
4. **Create new migrations** for schema changes instead of editing old ones
5. **Backup your database** before running migrations in production

## 🔍 Troubleshooting

### Migration conflicts

If you have migration conflicts:
```bash
# Check current state
alembic current

# View migration history
alembic history

# Resolve conflicts by creating a merge migration
alembic merge -m "Merge migrations" <revision1> <revision2>
```

### Database connection errors

Make sure:
- Database is running
- `DATABASE_URL` in `.env` is correct
- Database credentials are valid

### Model import errors

If Alembic can't detect models:
- Check `migrations/env.py` - all models should be imported
- Ensure models are properly defined with `table=True`
- Verify `SQLModel.metadata` includes all models

## 📚 Migration Best Practices

1. **One logical change per migration** - Don't mix unrelated changes
2. **Use descriptive names** - Migration messages should clearly describe what changed
3. **Test downgrades** - Make sure `downgrade()` works correctly
4. **Handle data migrations separately** - Schema changes and data migrations should be separate
5. **Review SQL** - Check the generated SQL in complex migrations

## 🎯 Next Steps

After applying migrations:
1. Verify tables were created: `\dt` in PostgreSQL
2. Check indexes: `\di` in PostgreSQL
3. Test your application to ensure everything works
4. Update seed data if needed

---

**Last Updated:** 2025-01-24  
**Maintainer:** Development Team


