#!/bin/bash
set -e

echo "=== Enterprise HRMS Setup ==="

# Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Please update with your values."
fi

# Create virtualenv and install backend deps (local dev)
if [ ! -d "backend/venv" ]; then
  python3 -m venv backend/venv
  backend/venv/bin/pip install -r backend/requirements.txt
fi

# Run migrations
cd backend && ../venv/bin/python manage.py migrate && cd ..

# Create superuser
cd backend && ../venv/bin/python manage.py shell -c "
from apps.authentication.models import User
if not User.objects.filter(is_super_admin=True).exists():
    User.objects.create_superuser(email='admin@hrms.com', username='admin', password='admin123', is_super_admin=True)
    print('Super Admin created: admin@hrms.com / admin123')
else:
    print('Super Admin already exists.')
" && cd ..

echo "Setup complete!"
